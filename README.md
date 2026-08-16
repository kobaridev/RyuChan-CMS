# RyuChan-CMS

RyuChan 博客的**可选**可视化内容管理后台。独立运行于 Vite 应用，通过 GitHub App OAuth 登录，直接读写 **RyuChan-Content** 内容仓，无需接触前端代码即可完成所有内容的在线编辑。

> **⚠️ 当前状态**：GitHub OAuth 登录功能尚未配置完成，暂时不可用。如需使用，请参考下方「环境变量」章节自行部署 OAuth 代理并配置凭据。不依赖 OAuth 的部分（如直接访问静态资源等）仍可正常使用。

## 系统组成

RyuChan 由三个仓库构成，各司其职：

| 仓库 | 职责 | 地址 |
|------|------|------|
| **RyuChan**（前端仓） | Astro 静态博客展示 | [kobaridev/RyuChan](https://github.com/kobaridev/RyuChan) |
| **RyuChan-Content**（内容仓） | 文章、配置、图片等内容存储 | [kobaridev/RyuChan-Content](https://github.com/kobaridev/RyuChan-Content) |
| **RyuChan-CMS**（管理端·可选） | 本文档所在仓库，可视化内容管理（可选） | 当前仓库 |

```
┌───────────────────────┐         ┌───────────────────────────┐
│   RyuChan-CMS         │  GitHub API 读写    │  RyuChan-Content   │
│  (React/Vite 管理端)  │◄─────────────────►│  (内容仓)            │
│  /blog / /config 等   │                   │  文章/配置/图片/友链  │
└───────────────────────┘                   └─────────┬───────────┘
                                                       │ trigger-deploy
                                                       ▼
                                              ┌──────────────────┐
                                              │  Cloudflare Pages│
                                              │   (RyuChan 部署)  │
                                              └──────────────────┘
```

## 技术栈

- **框架**: React 19 + Vite 8
- **样式**: Tailwind CSS 3 + daisyUI 4
- **编辑器**: CodeMirror 6（Markdown 支持）
- **路由**: React Router DOM v7
- **状态**: zustand
- **认证**: GitHub App OAuth
- **Lint**: oxlint
- **动画**: Motion

## 功能模块

| 路由 | 功能 |
|------|------|
| `/dashboard` | 管理面板概览 |
| `/blog` | 文章列表 |
| `/blog/new` | 新建文章 |
| `/blog/:slug/edit` | 编辑已有文章 |
| `/config/site` | 站点全局配置（标题/主题/favicon/banner 等） |
| `/config/module-titles` | 各模块标题设置 |
| `/config/:module` | 模块级配置（comments、anime、music 等） |
| `/navigation` | 网站导航管理 |
| `/album` | 相册管理 |
| `/friends` | 友链管理 |
| `/projects` | 项目管理 |
| `/music` | 音乐歌单管理 |
| `/about` | 关于页可视化编辑 |

## 快速开始

```sh
# 安装依赖
pnpm i

# 启动开发服务器
pnpm dev

# 构建
pnpm build

# 类型检查
pnpm run typecheck
```

## 环境变量

复制 `.env.example` 为 `.env` 并填入实际值：

```bash
# GitHub OAuth App（必须）
VITE_GITHUB_CLIENT_ID=your_github_oauth_client_id

# OAuth 代理地址
# 本地开发：http://localhost:8787
# 生产环境：https://auth.131714.xyz（或其他自定义域名）
VITE_OAUTH_PROXY_URL=https://auth.131714.xyz
```

### OAuth 代理配置

CMS 通过 Cloudflare Worker 作为 OAuth 代理完成 GitHub 认证流程。部署 Worker 时需配置以下 Secrets：

| Secret | 说明 |
|--------|------|
| `GITHUB_CLIENT_ID` | 与 `VITE_GITHUB_CLIENT_ID` 相同（GitHub OAuth App Client ID） |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App 的 Client Secret（私密，不可泄露） |
| `REDIRECT_URI` | OAuth 回调地址，必须与 GitHub OAuth App 设置的回调地址完全一致，如 `https://auth.131714.xyz/callback` |
| `CMS_ORIGIN` | CMS 前端部署地址，如 `https://cms-xxx.vercel.app` |

设置方式：`npx wrangler secret put <NAME>`

### GitHub OAuth App 设置

在 [GitHub Developer Settings](https://github.com/settings/developers) 创建 OAuth App：

- **Application name**: 任意名称（如 `RyuChan-CMS`）
- **Homepage URL**: CMS 前端部署地址
- **Authorization callback URL**: 与 Worker `REDIRECT_URI` 一致，如 `https://auth.131714.xyz/callback`

## 与内容仓的关系

RyuChan-CMS 的所有编辑操作直接作用于 RyuChan-Content 仓库。使用时需要配置上述环境变量。

内容仓的结构定义在 `ryucms.schema.json` 中（位于内容仓根目录），CMS 根据此 schema 动态渲染编辑表单。

## 部署

CMS 是纯静态前端应用，可部署到任意静态托管平台：

### Vercel

```sh
vercel deploy --prod
```

在 Vercel 项目设置中配置环境变量 `VITE_GITHUB_CLIENT_ID` 和 `VITE_OAUTH_PROXY_URL`。

### Cloudflare Pages

```sh
npx wrangler pages deploy dist --project-name=ryuchan-cms
```

在 Cloudflare Dashboard 的项目设置中添加环境变量。

---

## 贡献

欢迎提交 Issue 和 Pull Request！
