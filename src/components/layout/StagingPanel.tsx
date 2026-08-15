import { useState } from 'react'
import { useStagingStore } from '@/stores/staging-store'
import { useAuthStore } from '@/stores/auth-store'
import * as cs from '@/lib/content-service'
import { toast } from 'sonner'
import {
  X, Trash2, Archive, FileText, FolderGit2, Link, Compass,
  Images, Music, User, Settings, Bookmark, Send, AlertTriangle
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

function groupByModule(changes: StagedChange[]) {
  const map = new Map<ModuleType, StagedChange[]>()
  for (const c of changes) {
    const list = map.get(c.module) || []
    list.push(c)
    map.set(c.module, list)
  }
  return map
}

async function executePush(
  token: string,
  change: StagedChange
): Promise<void> {
  const { serviceFunc, args } = change
  // 动态调用 content-service 中的对应函数
  const fn = (cs as Record<string, unknown>)[serviceFunc]
  if (typeof fn !== 'function') {
    throw new Error(`未知操作: ${serviceFunc}`)
  }
  await fn(token, ...args)
}

export function StagingPanel({ onClose }: { onClose: () => void }) {
  const { changes, removeChange, clearAll } = useStagingStore()
  const token = useAuthStore((s) => s.token)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const grouped = groupByModule(changes)

  const handlePushAll = async () => {
    if (!token || changes.length === 0) return
    setPushing(true)
    setProgress({ current: 0, total: changes.length })

    const remaining = [...changes]
    const errors: string[] = []

    for (let i = 0; i < changes.length; i++) {
      setProgress({ current: i + 1, total: changes.length })
      try {
        await executePush(token, changes[i])
        remaining.shift()
      } catch (e: any) {
        errors.push(`${changes[i].title}: ${e.message}`)
        break // 出错后停止继续推送
      }
    }

    setPushing(false)

    if (errors.length > 0) {
      toast.error(`推送失败: ${errors.join('; ')}`)
    } else {
      toast.success(`已推送 ${changes.length} 项更改`)
      clearAll()
    }
    setShowConfirm(false)
    onClose()
  }

  if (showConfirm) {
    return (
      <div className="modal modal-open">
        <div className="modal-box max-w-lg">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            确认推送
          </h3>
          <p className="text-sm text-base-content/60 mt-1">
            将推送以下 {changes.length} 项更改到内容仓库：
          </p>
          <div className="mt-3 space-y-1.5 max-h-64 overflow-y-auto">
            {changes.map((c) => {
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
              <progress className="progress progress-primary w-full" value={progress.current} max={progress.total} />
              <p className="text-xs text-center text-base-content/60">
                正在推送 ({progress.current}/{progress.total})...
              </p>
            </div>
          ) : (
            <div className="modal-action mt-4">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowConfirm(false)} disabled={pushing}>
                取消
              </button>
              <button className="btn btn-primary btn-sm gap-1" onClick={handlePushAll} disabled={pushing}>
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
          <div className="mt-4 space-y-3 max-h-[50vh] overflow-y-auto">
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
                      <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-base-200/60 hover:bg-base-200 transition-colors group">
                        <span className={`badge badge-xs ${ACTION_BADGE[c.action]} shrink-0`}>{ACTION_LABEL[c.action]}</span>
                        <span className="text-sm truncate flex-1">{c.title}</span>
                        <span className="text-[10px] text-base-content/30 shrink-0 hidden sm:inline">{relativeTime(c.timestamp)}</span>
                        <button
                          className="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => removeChange(c.id)}
                          title="丢弃"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        {changes.length > 0 && (
          <div className="modal-action mt-4">
            <button
              className="btn btn-ghost btn-sm gap-1 text-error"
              onClick={() => {
                clearAll()
                toast.success('已清空暂存区')
              }}
            >
              <Trash2 className="w-3.5 h-3.5" /> 全部丢弃
            </button>
            <button
              className="btn btn-primary btn-sm gap-1"
              onClick={() => setShowConfirm(true)}
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