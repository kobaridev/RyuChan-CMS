import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useStagingStore } from '@/stores/staging-store'
import { getModuleConfig, saveModuleConfig, readYamlFile, saveYamlFile, readTextFile, saveTextFile, listProviderFiles, createProviderConfig, deleteProviderConfig } from '@/lib/content-service'
import { CONTENT_PATHS } from '@/config'
import { COMMENT_PROVIDERS, SOCIAL_PRESETS } from '@/constants'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Save, ArrowLeft, Plus, Trash2, ExternalLink, X } from 'lucide-react'
import { Icon } from '@iconify/react'
import type { ModuleConfig } from '@/types'
import { toast } from 'sonner'

const MODULE_CONFIGS: Record<string, { label: string; path: string; type: 'yaml' | 'html' }> = {
  blog: { label: '博客模块', path: CONTENT_PATHS.blogConfig, type: 'yaml' },
  music: { label: '音乐模块', path: CONTENT_PATHS.musicConfig, type: 'yaml' },
  comments: { label: '评论模块', path: CONTENT_PATHS.commentsConfig, type: 'yaml' },
  anime: { label: '追番模块', path: CONTENT_PATHS.animeConfig, type: 'yaml' },
  analysis: { label: '分析模块', path: CONTENT_PATHS.analysisConfig, type: 'yaml' },
  footer: { label: '页脚配置', path: CONTENT_PATHS.footerConfig, type: 'yaml' },
  'analysis-umami': { label: 'Umami 统计脚本', path: CONTENT_PATHS.analysisUmamiHtml, type: 'html' },
  'analysis-clarity': { label: 'Clarity 统计脚本', path: CONTENT_PATHS.analysisClarity, type: 'html' },
  'anime-bilibili': { label: 'Bilibili 配置', path: CONTENT_PATHS.animeBilibili, type: 'yaml' },
  'anime-tmdb': { label: 'TMDB 配置', path: CONTENT_PATHS.animeTmdb, type: 'yaml' },
  'comments-giscus': { label: 'Giscus 配置', path: CONTENT_PATHS.commentsGiscus, type: 'yaml' },
  'comments-twikoo': { label: 'Twikoo 配置', path: CONTENT_PATHS.commentsTwikoo, type: 'yaml' },
  'comments-waline': { label: 'Waline 配置', path: CONTENT_PATHS.commentsWaline, type: 'yaml' },
  'analysis-umami-config': { label: 'Umami 配置', path: CONTENT_PATHS.analysisUmami, type: 'yaml' },
}

// Provider 子配置映射（动态加载）
const PROVIDER_MODULES = ['comments', 'anime', 'analysis']

// 已在 ModuleTitlesPage 中统一管理的模块（不需要在此显示 title/subtitle）
const MODULES_WITH_CENTRALIZED_TITLES = ['blog', 'friends', 'project', 'navigation', 'album', 'music']

// 需要过滤掉的字段（由 ModuleTitlesPage 统一管理或其他原因）
const FILTERED_FIELDS: Record<string, string[]> = {
  blog: ['title', 'subtitle'],
  friends: ['title', 'subtitle'],
  project: ['title', 'subtitle'],
  navigation: ['title', 'subtitle'],
  album: ['title', 'subtitle'],
  music: ['title', 'subtitle', 'api'],
  anime: ['title', 'subtitle'],
}

export function ModuleConfigPage() {
  const { token } = useAuthStore()
  const addChange = useStagingStore(s => s.addChange)
  const { module } = useParams<{ module: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [textContent, setTextContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [providers, setProviders] = useState<{ label: string; path: string }[]>([])
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [newProviderName, setNewProviderName] = useState('')
  const [deleteProviderTarget, setDeleteProviderTarget] = useState<{ label: string; path: string } | null>(null)

  const modInfo = module ? MODULE_CONFIGS[module] : null
  const isMainModule = module && PROVIDER_MODULES.includes(module)

  useEffect(() => {
    if (!token || !module || !modInfo) return
    setLoading(true)
    const load = async () => {
      try {
        if (modInfo.type === 'html') {
          const text = await readTextFile(token, modInfo.path)
          setTextContent(text || '')
          setData(null)
        } else {
          const yaml = await readYamlFile<Record<string, unknown>>(token, modInfo.path)
          setData(yaml || {})
          setTextContent('')
        }
        // 动态加载 provider 列表
        if (PROVIDER_MODULES.includes(module)) {
          const provs = await listProviderFiles(token, module)
          setProviders(provs)
        }
      } catch (e: any) { toast.error('加载失败: ' + e.message) }
      finally { setLoading(false) }
    }
    load()
  }, [token, module, modInfo])

  const handleSave = async () => {
    if (!token || !module || !modInfo) return
    setSaving(true)
    try {
      const modName = modInfo.label
      if (modInfo.type === 'html') {
        addChange({ module: 'moduleConfig', title: `更新${modName}配置`, action: 'update', serviceFunc: 'saveTextFile', args: [modInfo.path, textContent, `feat(config): update ${module}`], commitMessage: `feat(config): update ${module}` })
      } else if (data) {
        addChange({ module: 'moduleConfig', title: `更新${modName}配置`, action: 'update', serviceFunc: 'saveYamlFile', args: [modInfo.path, data, `feat(config): update ${module}`], commitMessage: `feat(config): update ${module}` })
      }
      toast.success('已暂存')
    } catch (e: any) { toast.error('暂存失败: ' + e.message) }
    finally { setSaving(false) }
  }

  // Provider CRUD handlers
  const handleAddProvider = async () => {
    if (!token || !module || !newProviderName.trim()) {
      toast.error('请输入 Provider 名称')
      return
    }
    setSaving(true)
    try {
      await createProviderConfig(token, module, newProviderName.trim(), {})
      toast.success(`Provider "${newProviderName.trim()}" 已创建`)
      setNewProviderName('')
      setShowAddProvider(false)
      // 刷新 provider 列表
      const provs = await listProviderFiles(token, module)
      setProviders(provs)
    } catch (e: any) { toast.error('创建失败: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleDeleteProvider = async () => {
    if (!token || !module || !deleteProviderTarget) return
    setSaving(true)
    try {
      await deleteProviderConfig(token, module, deleteProviderTarget.path, deleteProviderTarget.label)
      toast.success(`Provider "${deleteProviderTarget.label}" 已删除`)
      setDeleteProviderTarget(null)
      // 刷新 provider 列表
      const provs = await listProviderFiles(token, module)
      setProviders(provs)
    } catch (e: any) { toast.error('删除失败: ' + e.message) }
    finally { setSaving(false) }
  }

  if (!modInfo) {
    return (
      <div className="text-center py-16">
        <p className="text-base-content/50">未知模块: {module}</p>
        <button className="btn btn-ghost btn-sm mt-2" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
      </div>
    )
  }

  if (loading) return <LoadingSpinner />

  // 渲染 footer 社交链接
  const renderFooterSocial = () => {
    if (!data) return null
    const social = data.social as Array<{ href?: string; ariaLabel?: string; title?: string; svg?: string }> | undefined
    const arr = social || []

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">社交链接</span>
          <button className="btn btn-ghost btn-xs gap-1" onClick={() => {
            const next = [...arr, { href: '', title: '', svg: 'ri:link', ariaLabel: '' }]
            setData({ ...data, social: next })
          }}>
            <Plus className="w-3 h-3" /> 添加
          </button>
        </div>
        {arr.map((link, idx) => {
          // 找到当前 svg 对应的预设
          const currentPreset = SOCIAL_PRESETS.find((p) => p.value === link.svg)
          return (
            <div key={idx} className="flex gap-2 items-center p-2 bg-base-200/50 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-base-300 flex items-center justify-center shrink-0">
                {link.svg && <Icon icon={link.svg} className="w-5 h-5" />}
              </div>
              <select
                className="select select-bordered select-xs w-36"
                value={link.svg || 'ri:link'}
                onChange={(e) => {
                  const next = [...arr]
                  next[idx] = { ...next[idx], svg: e.target.value, title: currentPreset?.label || next[idx].title }
                  setData({ ...data, social: next })
                }}
              >
                {SOCIAL_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <input
                className="input input-bordered input-xs flex-1"
                placeholder="URL"
                value={link.href || ''}
                onChange={(e) => {
                  const next = [...arr]
                  next[idx] = { ...next[idx], href: e.target.value }
                  setData({ ...data, social: next })
                }}
              />
              <button
                className="btn btn-ghost btn-xs btn-square text-error"
                onClick={() => {
                  const next = [...arr]
                  next.splice(idx, 1)
                  setData({ ...data, social: next })
                }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  // 渲染 provider 列表（动态加载 + 增删改）
  const renderProviders = () => {
    if (!module) return null
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Provider 配置</span>
          <button
            className="btn btn-ghost btn-xs gap-1"
            onClick={() => setShowAddProvider(true)}
          >
            <Plus className="w-3 h-3" /> 添加
          </button>
        </div>
        {providers.length === 0 ? (
          <p className="text-xs text-base-content/40 py-2">暂无 Provider 配置，点击"添加"创建</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {providers.map((p) => (
              <div key={p.path} className="flex items-center gap-1">
                <button
                  className="btn btn-ghost btn-sm justify-between gap-2 flex-1"
                  onClick={() => {
                    // 找到对应的模块 key
                    const entry = Object.entries(MODULE_CONFIGS).find(([, v]) => v.path === p.path)
                    if (entry) navigate(`/config/${entry[0]}`)
                  }}
                >
                  <span>{p.label}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  className="btn btn-ghost btn-xs btn-square text-error"
                  onClick={() => setDeleteProviderTarget(p)}
                  title="删除"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // 渲染追番 provider 卡片
  const renderAnimeProvider = (key: string, value: unknown) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
    return (
      <div className="card bg-base-200">
        <div className="card-body p-3">
          <div className="badge badge-primary badge-outline text-xs font-semibold mb-2">{key}</div>
          {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
            <div className="form-control" key={k}>
              <label className="label py-1"><span className="label-text text-xs font-medium">{k}</span></label>
              <input
                className="input input-bordered input-xs"
                value={String(v ?? '')}
                onChange={(e) => {
                  const obj = { ...(value as Record<string, unknown>), [k]: e.target.value }
                  setData({ ...data, [key]: obj })
                }}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 特殊字段渲染
  const renderField = (key: string, value: unknown): React.ReactNode => {
    // 评论/追番/分析模块的 provider 字段用下拉框
    if ((key === 'provider' || key === 'type') && (module === 'comments' || module === 'anime' || module === 'analysis')) {
      // 处理数组
      const isArray = Array.isArray(value)
      const values = isArray ? value as string[] : [String(value)]

      if (isArray) {
        return (
          <div className="space-y-1">
            {values.map((v, idx) => (
              <select
                key={idx}
                className="select select-bordered select-sm w-full"
                value={v}
                onChange={(e) => {
                  const arr = [...values]
                  arr[idx] = e.target.value
                  setData({ ...data, [key]: arr })
                }}
              >
                {COMMENT_PROVIDERS.map((cp) => (
                  <option key={cp.value} value={cp.value}>{cp.label}</option>
                ))}
              </select>
            ))}
          </div>
        )
      }

      return (
        <select
          className="select select-bordered select-sm w-full"
          value={String(value)}
          onChange={(e) => setData({ ...data, [key]: e.target.value })}
        >
          {COMMENT_PROVIDERS.map((cp) => (
            <option key={cp.value} value={cp.value}>{cp.label}</option>
          ))}
        </select>
      )
    }

    // 追番模块的嵌套对象
    if (module === 'anime' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return renderAnimeProvider(key, value)
    }

    // 页脚社交链接
    if (module === 'footer' && key === 'social' && Array.isArray(value)) {
      return renderFooterSocial()
    }

    // 默认渲染
    if (typeof value === 'boolean') {
      return (
        <input
          type="checkbox"
          className="toggle toggle-primary toggle-sm"
          checked={value}
          onChange={(e) => setData({ ...data, [key]: e.target.checked })}
        />
      )
    }
    if (typeof value === 'number') {
      return (
        <input
          type="number"
          className="input input-bordered input-sm w-full"
          value={value}
          onChange={(e) => setData({ ...data, [key]: Number(e.target.value) })}
        />
      )
    }
    if (Array.isArray(value) && module !== 'footer') {
      return (
        <div className="space-y-1">
          {value.map((item, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                className="input input-bordered input-sm flex-1"
                value={typeof item === 'string' ? item : JSON.stringify(item)}
                onChange={(e) => {
                  const arr = [...value]
                  try { arr[idx] = JSON.parse(e.target.value) }
                  catch { arr[idx] = e.target.value }
                  setData({ ...data, [key]: arr })
                }}
              />
              <button
                className="btn btn-ghost btn-xs btn-square text-error"
                onClick={() => {
                  const arr = [...value]
                  arr.splice(idx, 1)
                  setData({ ...data, [key]: arr })
                }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            className="btn btn-ghost btn-xs gap-1"
            onClick={() => {
              setData({ ...data, [key]: [...value, ''] })
            }}
          >
            <Plus className="w-3 h-3" /> 添加
          </button>
        </div>
      )
    }
    return (
      <textarea
        className="textarea textarea-bordered textarea-sm"
        rows={3}
        value={String(value)}
        onChange={(e) => setData({ ...data, [key]: e.target.value })}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold">{modInfo.label}</h1>
        </div>
        <button className="btn btn-primary btn-sm gap-1" onClick={handleSave} disabled={saving}>
          {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="w-4 h-4" />}
          保存配置
        </button>
      </div>

      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body p-6">
          {modInfo.type === 'html' ? (
            <textarea
              className="textarea textarea-bordered font-mono text-sm"
              rows={20}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
            />
          ) : data ? (
            <div className="space-y-3">
              {/* Provider 子配置列表 */}
              {isMainModule && renderProviders()}

              {Object.entries(data)
                  .filter(([key]) => {
                    // 过滤掉在 ModuleTitlesPage 中统一管理的字段
                    if (module && FILTERED_FIELDS[module]?.includes(key)) return false
                    return true
                  })
                  .map(([key, value]) => (
                <div className="form-control" key={key}>
                  <label className="label py-1">
                    <span className="label-text text-sm font-medium">{key}</span>
                  </label>
                  {renderField(key, value)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-base-content/50">无数据</p>
          )}
        </div>
      </div>

      {/* 添加 Provider 弹窗 */}
      {showAddProvider && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">添加 Provider</h3>
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-sm font-medium">Provider 名称</span>
              </label>
              <input
                className="input input-bordered input-sm"
                placeholder="例如: disqus"
                value={newProviderName}
                onChange={(e) => setNewProviderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddProvider()}
              />
              <label className="label py-1">
                <span className="label-text text-xs text-base-content/50">
                  将在 {module === 'comments' ? 'src/content/comments/provider/' : module === 'anime' ? 'src/content/anime/provider/' : 'src/content/analysis/provider/'} 目录下创建配置文件
                </span>
              </label>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setShowAddProvider(false); setNewProviderName('') }}
              >
                <X className="w-4 h-4" /> 取消
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAddProvider}
                disabled={saving || !newProviderName.trim()}
              >
                {saving ? <span className="loading loading-spinner loading-sm" /> : <Plus className="w-4 h-4" />}
                创建
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => { setShowAddProvider(false); setNewProviderName('') }}>
            <button className="cursor-default">close</button>
          </div>
        </div>
      )}

      {/* 删除 Provider 确认 */}
      {deleteProviderTarget && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">删除 Provider</h3>
            <p className="text-sm">
              确定要删除 Provider "<span className="font-semibold">{deleteProviderTarget.label}</span>" 吗？此操作不可撤销，将删除配置文件。
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setDeleteProviderTarget(null)}
              >
                <X className="w-4 h-4" /> 取消
              </button>
              <button
                className="btn btn-error btn-sm"
                onClick={handleDeleteProvider}
                disabled={saving}
              >
                {saving ? <span className="loading loading-spinner loading-sm" /> : <Trash2 className="w-4 h-4" />}
                确认删除
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setDeleteProviderTarget(null)}>
            <button className="cursor-default">close</button>
          </div>
        </div>
      )}
    </div>
  )
}