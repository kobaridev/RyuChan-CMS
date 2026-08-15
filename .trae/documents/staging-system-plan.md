# 暂存系统实现计划

## 背景

当前 CMS 点击"保存"后直接推送到 GitHub 内容仓库，用户希望：
1. 各页面保存时先"暂存"到本地，不立即推送
2. 修改多个项目后，通过全局按钮一次性推送所有暂存
3. 支持撤回（丢弃）暂存的更改

## 简化方案

**不重构 content-service**，保持现有 save 函数不变。页面的 `handleSave` 改为调用 `stagingStore.addChange()` 存储数据，推送时按顺序逐个调用原有 save 函数（每个变更独立 commit）。

## 新增文件

### 1. `src/stores/staging-store.ts`

Zustand store + localStorage 持久化：

```typescript
interface StagedChange {
  id: string
  module: ModuleType
  title: string            // 如 "更新文章「xxx」"
  action: 'create' | 'update' | 'delete'
  serviceFunc: string      // 如 'saveBlogPost', 'createProject'
  args: unknown[]          // 传给 serviceFunc 的参数（不含 token）
  commitMessage: string
  timestamp: number
}

interface StagingStore {
  changes: StagedChange[]
  addChange: (c: Omit<StagedChange, 'id' | 'timestamp'>) => void
  removeChange: (id: string) => void
  clearAll: () => void
}
```

### 2. `src/components/layout/StagingPanel.tsx`

Modal 弹窗，展示暂存列表：
- 按模块分组显示（图标 + 模块名 + 变更数）
- 每条显示：操作类型徽章（create/update/delete）、标题、时间
- 每条可单独丢弃
- 底部：全部丢弃 / 全部推送
- 推送时显示进度 "正在推送 (3/5)..."，逐个调用对应 save 函数
- 推送确认对话框（列出所有变更及 commit message）

### 3. `src/types/index.ts` 补充

添加 `ModuleType` 和 `StagedChange` 类型。

## 修改文件

### 4. `src/components/layout/Header.tsx`

在用户头像和退出按钮之间添加暂存按钮（Archive 图标），有暂存时显示红色数字徽章，点击打开 StagingPanel。

### 5. 各页面 handleSave / handleDelete

将 `await saveXxx(token, ...)` 改为 `stagingStore.addChange(...)`，toast 提示 "已暂存"。

**按页面分：**

| 页面 | 操作 | serviceFunc | args |
|---|---|---|---|
| BlogEditorPage | 保存 | `saveBlogPost` | `[post, mode, originalFilePath]` |
| BlogListPage | 删除 | `deleteBlogPost` | `[filePath, title]` |
| ProjectsPage | 新增 | `createProject` | `[project]` |
| ProjectsPage | 更新 | `saveYamlFile` | `[filePath, data, msg]` |
| ProjectsPage | 删除 | `deleteProject` | `[filePath, name]` |
| FriendsPage | 新增 | `createFriend` | `[friend]` |
| FriendsPage | 更新 | `saveFriends` | `[friendsArray]` |
| FriendsPage | 删除 | `deleteFriend` | `[filePath, name]` |
| NavigationPage | 新增/更新分类 | `createNavigationCategory` / `saveNavigationCategory` | `[category]` |
| NavigationPage | 删除分类 | `deleteNavigationCategory` | `[filePath, name]` |
| NavigationPage | 保存/删除子项 | `saveNavigationCategory` | `[category]` |
| AlbumPage | CRUD | `createAlbum` / `saveAlbum` / `deleteAlbum` | 对应参数 |
| MusicPage | CRUD | `createMusicPlaylist` / `saveYamlFile` / `deleteMusicPlaylist` 等 | 对应参数 |
| AboutPage | 保存 | `saveAboutConfig` + `saveAboutContent`（两个变更） | 对应参数 |
| SiteConfigPage | 保存 | `saveSiteConfig` | `[config]` |
| ModuleConfigPage | 保存 | `saveYamlFile` / `saveTextFile` | 对应参数 |
| ModuleTitlesPage | 保存全部 | 6 个 `saveModuleTitle` | 每个模块单独暂存 |

### 6. `src/components/layout/AppLayout.tsx`

添加 `beforeunload` 监听：有暂存未推送时提示用户。

## 推送流程

1. 用户点击 StagingPanel 中的"全部推送"
2. 弹出确认对话框，列出所有变更及 commit message
3. 确认后，逐个调用对应 save 函数（每个独立 commit）
4. 显示进度 "正在推送 (3/5)..."
5. 全部成功 → toast 提示 + 清空暂存
6. 任一失败 → toast 提示错误 + 保留剩余暂存

## 验证

1. `pnpm build` 无报错
2. 在任意页面修改后点击保存 → 暂存区计数 +1，toast "已暂存"
3. 打开暂存面板 → 看到所有暂存变更
4. 点击全部推送 → 确认对话框 → 逐个推送 → 成功
5. 丢弃单个暂存 → 从列表移除
6. 刷新页面 → 暂存数据仍保留（localStorage）
7. 关闭标签页 → 浏览器提示未保存变更