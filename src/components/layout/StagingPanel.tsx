import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStagingStore } from '@/stores/staging-store'
import { useAuthStore } from '@/stores/auth-store'
import { useCacheStore } from '@/stores/cache-store'
import { batchPushChanges } from '@/lib/content-service'
import { toast } from 'sonner'
import {
  X, Trash2, Archive, FileText, FolderGit2, Link, Compass,
  Images, Music, User, Settings, Bookmark, Send, ChevronDown, CheckSquare, Square
} from 'lucide-react'
import type { StagedChange, ModuleType } from '@/types'

const MODULE_ICONS: Record<ModuleType, React.FC<{ className?: string }>> = {
  blog: FileText,
  project: FolderGit2,
  friend: Link,
  navigation: Compass,
  album: Images,
  music: Music,
  about: User,
  siteConfig: Settings,
  moduleConfig: Settings,
  moduleTitles: Bookmark,
}

const MODULE_LABELS: Record<ModuleType, string> = {
  blog: '博客',
  project: '项目',
  friend: '友链',
  navigation: '导航',
  album: '相册',
  music: '音乐',
  about: '关于',
  siteConfig: '站点配置',
  moduleConfig: '模块配置',
  moduleTitles: '模块标题',
}

const ACTION_BADGE: Record<string, string> = {
  create: 'badge-success',
  update: 'badge-info',
  delete: 'badge-error',
}

const ACTION_LABEL: Record<string, string> = {
  create: '新增',
  update: '更新',
  delete: '删除',
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

/** 提取暂存项的预览内容 */
function getChangePreview(change: StagedChange): string {
  const { module, action, args } = change

  if (action === 'delete') {
    return `删除: ${args[1] || args[0]}`
  }

  if (module === 'blog') {
    const post = args[0] as Record<string, unknown>
    if (!post) return '(无内容)'
    const parts: string[] = []
    if (post.title) parts.push(`标题: ${post.title}`)
    if (post.description) parts.push(`描述: ${post.description}`)
    if (post.pubDate) parts.push(`日期: ${post.pubDate}`)
    if (post.draft) parts.push('状态: 草稿')
    if (post.categories) parts.push(`分类: ${(post.categories as string[]).join(', ')}`)
    if (post.tags) parts.push(`标签: ${(post.tags as string[]).join(', ')}`)
    if (post.content) {
      const preview = (post.content as string).substring(0, 200)
      parts.push(`\n---\n${preview}${(post.content as string).length > 200 ? '...' : ''}`)
    }
    return parts.join('\n')
  }

  if (module === 'project' || module === 'friend') {
    const item = args[0] as Record<string, unknown>
    if (!item) return '(无内容)'
    const parts: string[] = []
    if (item.name) parts.push(`名称: ${item.name}`)
    if (item.url) parts.push(`链接: ${item.url}`)
    if (item.description) parts.push(`描述: ${item.description}`)
    if (item.badge) parts.push(`标签: ${item.badge}`)
    return parts.join('\n')
  }

  if (module === 'navigation') {
    const cat = args[0] as Record<string, unknown>
    if (!cat) return '(无内容)'
    const parts: string[] = []
    if (cat.category) parts.push(`分类: ${cat.category}`)
    if (cat.navigations) parts.push(`导航项数: ${(cat.navigations as unknown[]).length}`)
    return parts.join('\n')
  }

  if (module === 'album') {
    const album = args[0] as Record<string, unknown>
    if (!album) return '(无内容)'
    const parts: string[] = []
    if (album.title) parts.push(`标题: ${album.title}`)
    if (album.date) parts.push(`日期: ${album.date}`)
    if (album.event) parts.push(`事件: ${album.event}`)
    if (album.photos) parts.push(`照片数: ${(album.photos as unknown[]).length}`)
    return parts.join('\n')
  }

  if (module === 'music') {
    const playlist = args[0] as Record<string, unknown>
    if (!playlist) return '(无内容)'
    const parts: string[] = []
    if (playlist.name) parts.push(`歌单: ${playlist.name}`)
    if (playlist.songs) parts.push(`歌曲数: ${(playlist.songs as unknown[]).length}`)
    return parts.join('\n')
  }

  if (module === 'siteConfig' || module === 'moduleConfig' || module === 'moduleTitles' || module === 'about') {
    return '(配置变更)'
  }

  return '(无预览)'
}

function groupByModule(changes: StagedChange[]) {
  const map = new Map<ModuleType, StagedChange[]>()
  for (const c of changes) {
    const list = map.get(c.module) || []
    list.push(c)
    map.set(c.module, list)
  }
  return map
}

export function StagingPanel({ onClose }: { onClose: () => void }) {
  const { changes, removeChange, clearAll } = useStagingStore()
  const token = useAuthStore((s) => s.token)
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const [pushMode, setPushMode] = useState<'all' | 'selected'>('all')
  const [pushing, setPushing] = useState(false)

  const grouped = groupByModule(changes)

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelected(prev => {
      if (prev.size === changes.length) return new Set()
      return new Set(changes.map(c => c.id))
    })
  }, [changes])

  const selectedCount = selected.size

  /** 执行批量推送（合并为一个 commit） */
  const handlePush = async (targetChanges: StagedChange[]) => {
    if (!token || targetChanges.length === 0) return
    setPushing(true)
    try {
      await batchPushChanges(token, targetChanges.map(c => ({
        serviceFunc: c.serviceFunc,
        args: c.args,
      })))

      // 按模块清除推送过的缓存
      const pushedModules = new Set(targetChanges.map(c => c.module))
      const cacheStore = useCacheStore.getState()
      for (const mod of pushedModules) {
        cacheStore.invalidate(mod)
      }

      toast.success(`已推送 ${targetChanges.length} 项更改（合并为一个 commit）`)
      for (const c of targetChanges) removeChange(c.id)
      setSelected(new Set())
    } catch (e: any) {
      toast.error(`推送失败: ${e.message}`)
    } finally {
      setPushing(false)
      setShowConfirm(false)
    }
  }

  const handlePushAll = () => {
    setPushMode('all')
    setShowConfirm(true)
  }

  const handlePushSelected = () => {
    if (selectedCount === 0) {
      toast.error('请先选择要推送的项')
      return
    }
    setPushMode('selected')
    setShowConfirm(true)
  }

  const confirmPush = () => {
    const targets = pushMode === 'all'
      ? changes
      : changes.filter(c => selected.has(c.id))
    handlePush(targets)
  }

  /** 点击暂存项标题 → 跳转到对应编辑页 */
  const handleNavigate = (change: StagedChange) => {
    if (change.sourceRoute) {
      navigate(change.sourceRoute)
      onClose()
    }
  }

  if (showConfirm) {
    const targets = pushMode === 'all' ? changes : changes.filter(c => selected.has(c.id))
    return (
      <div className="modal modal-open">
        <div className="modal-box max-w-lg">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            确认推送
          </h3>
          <p className="text-sm text-base-content/60 mt-1">
            将推送以下 {targets.length} 项更改，合并为一个 commit：
          </p>
          <div className="mt-3 space-y-1.5 max-h-64 overflow-y-auto">
            {targets.map((c) => {
              const IconC = MODULE_ICONS[c.module]
              return (
                <div key={c.id} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-base-200">
                  <IconC className="w-3.5 h-3.5 text-base-content/40 shrink-0" />
                  <span className={`badge badge-xs ${ACTION_BADGE[c.action]}`}>{ACTION_LABEL[c.action]}</span>
                  <span className="truncate flex-1">{c.title}</span>
                </div>
              )
            })}
          </div>

          {pushing ? (
            <div className="mt-4 space-y-2">
              <progress className="progress progress-primary w-full" />
              <p className="text-xs text-center text-base-content/60">正在推送...</p>
            </div>
          ) : (
            <div className="modal-action mt-4">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowConfirm(false)} disabled={pushing}>
                取消
              </button>
              <button className="btn btn-primary btn-sm gap-1" onClick={confirmPush} disabled={pushing}>
                <Send className="w-3.5 h-3.5" /> 确认推送
              </button>
            </div>
          )}
        </div>
        <div className="modal-backdrop" onClick={() => !pushing && setShowConfirm(false)} />
      </div>
    )
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Archive className="w-5 h-5 text-primary" />
            暂存区
            {changes.length > 0 && (
              <span className="badge badge-primary badge-sm">{changes.length}</span>
            )}
          </h3>
          <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Changes List */}
        {changes.length === 0 ? (
          <div className="py-12 text-center">
            <Archive className="w-12 h-12 text-base-content/15 mx-auto" />
            <p className="text-base-content/40 mt-3 text-sm">暂无暂存的更改</p>
            <p className="text-base-content/25 text-xs mt-1">修改内容后点击保存即可暂存</p>
          </div>
        ) : (
          <>
            {/* 全选/取消全选 */}
            <div className="mt-3 flex items-center justify-between">
              <button
                className="flex items-center gap-1.5 text-xs text-base-content/50 hover:text-base-content transition-colors"
                onClick={toggleSelectAll}
              >
                {selectedCount === changes.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-primary" />
                ) : selectedCount > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-primary/50" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                {selectedCount === changes.length ? '取消全选' : `全选 (${selectedCount}/${changes.length})`}
              </button>
            </div>

            <div className="mt-1.5 space-y-3 max-h-[45vh] overflow-y-auto">
              {Array.from(grouped.entries()).map(([module, items]) => {
                const IconC = MODULE_ICONS[module]
                return (
                  <div key={module}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <IconC className="w-3.5 h-3.5 text-base-content/50" />
                      <span className="text-xs font-semibold text-base-content/50">{MODULE_LABELS[module]}</span>
                      <span className="text-[10px] text-base-content/30">({items.length})</span>
                    </div>
                    <div className="space-y-1">
                      {items.map((c) => (
                        <details key={c.id} className="group/details">
                          <summary className="flex items-center gap-2 p-2 rounded-lg bg-base-200/60 hover:bg-base-200 transition-colors cursor-pointer list-none [&::after]:hidden">
                            {/* 复选框 */}
                            <button
                              className="shrink-0"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                toggleSelect(c.id)
                              }}
                            >
                              {selected.has(c.id) ? (
                                <CheckSquare className="w-3.5 h-3.5 text-primary" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-base-content/30" />
                              )}
                            </button>
                            <ChevronDown className="w-3 h-3 text-base-content/30 shrink-0 transition-transform group-open/details:rotate-90" />
                            <span className={`badge badge-xs ${ACTION_BADGE[c.action]} shrink-0`}>{ACTION_LABEL[c.action]}</span>
                            {/* 点击标题跳转到对应编辑页 */}
                            {c.sourceRoute ? (
                              <button
                                className="text-sm truncate flex-1 text-left hover:text-primary hover:underline transition-colors"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleNavigate(c)
                                }}
                                title="点击跳转到编辑页"
                              >
                                {c.title}
                              </button>
                            ) : (
                              <span className="text-sm truncate flex-1">{c.title}</span>
                            )}
                            <span className="text-[10px] text-base-content/30 shrink-0 hidden sm:inline">{relativeTime(c.timestamp)}</span>
                            {/* 丢弃按钮 */}
                            <button
                              className="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeChange(c.id); setSelected(prev => { const next = new Set(prev); next.delete(c.id); return next }) }}
                              title="丢弃"
                            >
                              <X className="w-3 h-3 text-error" />
                            </button>
                          </summary>
                          <div className="mx-2 mt-0.5 mb-1 p-2 rounded bg-base-200/40 text-xs text-base-content/60 font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                            {getChangePreview(c)}
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Footer */}
        {changes.length > 0 && (
          <div className="modal-action mt-4">
            <button
              className="btn btn-ghost btn-sm gap-1 text-error"
              onClick={() => {
                clearAll()
                setSelected(new Set())
                toast.success('已清空暂存区')
              }}
            >
              <Trash2 className="w-3.5 h-3.5" /> 全部丢弃
            </button>
            <div className="flex-1" />
            {selectedCount > 0 && (
              <button
                className="btn btn-outline btn-sm gap-1"
                onClick={handlePushSelected}
                disabled={pushing}
              >
                <Send className="w-3.5 h-3.5" /> 推送选中 ({selectedCount})
              </button>
            )}
            <button
              className="btn btn-primary btn-sm gap-1"
              onClick={handlePushAll}
              disabled={pushing}
            >
              <Send className="w-3.5 h-3.5" /> 全部推送 ({changes.length})
            </button>
          </div>
        )}
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  )
}