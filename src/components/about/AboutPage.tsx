import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { getAboutConfig, saveAboutConfig, getAboutContent, saveAboutContent, uploadImage } from '@/lib/content-service'
import { IconPicker } from '@/components/shared/IconPicker'
import { ImageField } from '@/components/shared/ImageField'
import { MarkdownEditorToggle } from '@/components/shared/MarkdownEditorToggle'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Save, Settings, Plus, Trash2 } from 'lucide-react'
import { Icon } from '@iconify/react'
import type { AboutConfig } from '@/types'
import { toast } from 'sonner'

type Tab = 'info' | 'content'

export function AboutPage() {
  const { token } = useAuthStore()
  const [config, setConfig] = useState<AboutConfig | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('info')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    Promise.all([
      getAboutConfig(token),
      getAboutContent(token),
    ]).then(([cfg, cnt]) => {
      setConfig(cfg)
      setContent(cnt)
    }).catch((e) => toast.error('加载失败: ' + e.message))
    .finally(() => setLoading(false))
  }, [token])

  const handleSave = async () => {
    if (!token) return
    setSaving(true)
    try {
      if (config) await saveAboutConfig(token, config)
      await saveAboutContent(token, content)
      toast.success('关于页面已保存')
    } catch (e: any) { toast.error('保存失败: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleUpload = async (file: File): Promise<string> => {
    if (!token) throw new Error('未登录')
    return uploadImage(token, file)
  }

  if (loading) return <LoadingSpinner />
  if (!config) return <div className="text-center py-8 text-base-content/50">加载失败</div>

  const f = (label: string, value: string, onChange: (v: string) => void) => (
    <div className="form-control w-full">
      <label className="label py-1.5"><span className="label-text text-xs font-semibold tracking-wide uppercase text-primary/60">{label}</span></label>
      <input className="input input-bordered input-sm w-full bg-base-100 focus:outline-none focus:border-primary/50 transition-colors" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">关于页面</h1>
        <button className="btn btn-primary btn-sm gap-1" onClick={handleSave} disabled={saving}>
          {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="w-4 h-4" />}
          保存全部
        </button>
      </div>

      <div className="tabs tabs-boxed bg-base-100">
        <button className={`tab tab-sm ${activeTab === 'info' ? 'tab-active' : ''}`} onClick={() => setActiveTab('info')}>
          <Settings className="w-3 h-3 mr-1" /> 页面信息
        </button>
        <button className={`tab tab-sm ${activeTab === 'content' ? 'tab-active' : ''}`} onClick={() => setActiveTab('content')}>
          <Settings className="w-3 h-3 mr-1" /> 正文内容
        </button>
      </div>

      {activeTab === 'info' && (
        <div className="card bg-base-100 shadow-sm border border-base-300">
          <div className="card-body p-6">
            {/* 图片区 */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <ImageField label="头像" value={config.avatar} onChange={(v) => setConfig({ ...config, avatar: v })} size="md" onUpload={handleUpload} />
              <ImageField label="GitHub 头像" value={config.githubAvatar} onChange={(v) => setConfig({ ...config, githubAvatar: v })} size="md" onUpload={handleUpload} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {f('页面标题', config.page.title, (v) => setConfig({ ...config, page: { ...config.page, title: v } }))}
              {f('页面副标题', config.page.subtitle, (v) => setConfig({ ...config, page: { ...config.page, subtitle: v } }))}
              {f('名称', config.name, (v) => setConfig({ ...config, name: v }))}
              {f('显示名称', config.displayName || '', (v) => setConfig({ ...config, displayName: v }))}
              {f('职位', config.title, (v) => setConfig({ ...config, title: v }))}
              {f('GitHub 用户名', config.githubUsername, (v) => setConfig({ ...config, githubUsername: v }))}
              {f('GitHub 仓库', config.githubRepo, (v) => setConfig({ ...config, githubRepo: v }))}

              <div className="col-span-full">
                <label className="label py-1.5"><span className="label-text text-xs font-semibold tracking-wide uppercase text-primary/60">个人描述</span></label>
                {config.description.map((desc, idx) => (
                  <div key={idx} className="flex gap-2 mb-1">
                    <textarea
                      className="textarea textarea-bordered textarea-sm flex-1"
                      rows={2}
                      value={desc}
                      onChange={(e) => {
                        const arr = [...config.description]
                        arr[idx] = e.target.value
                        setConfig({ ...config, description: arr })
                      }}
                    />
                    <button className="btn btn-ghost btn-xs btn-square text-error self-start" onClick={() => {
                      const arr = [...config.description]
                      arr.splice(idx, 1)
                      setConfig({ ...config, description: arr })
                    }}>×</button>
                  </div>
                ))}
                <button className="btn btn-ghost btn-xs mt-1" onClick={() => setConfig({ ...config, description: [...config.description, ''] })}>
                  + 添加描述行
                </button>
              </div>

              {/* 链接 */}
              <div className="col-span-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold tracking-wide uppercase text-primary/60">社交链接</span>
                  <button className="btn btn-ghost btn-xs gap-1" onClick={() => {
                    setConfig({ ...config, links: [...config.links, { href: '', title: '', svg: 'ri:link', ariaLabel: '' }] })
                  }}>
                    <Plus className="w-3 h-3" /> 添加
                  </button>
                </div>
                <div className="space-y-2">
                  {config.links.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-base-200/50 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-base-300 flex items-center justify-center shrink-0">
                        {link.svg && <Icon icon={link.svg} className="w-5 h-5" />}
                      </div>
                      <div className="w-40">
                        <IconPicker value={link.svg} onChange={(icon) => {
                          const links = [...config.links]
                          links[idx] = { ...links[idx], svg: icon }
                          setConfig({ ...config, links })
                        }} />
                      </div>
                        <input
                          className="input input-bordered input-xs flex-1"
                          placeholder="URL"
                          value={link.href || ''}
                          onChange={(e) => {
                            const links = [...config.links]
                            links[idx] = { ...links[idx], href: e.target.value }
                            setConfig({ ...config, links })
                          }}
                        />
                        <button className="btn btn-ghost btn-xs btn-square text-error" onClick={() => {
                          const links = [...config.links]
                          links.splice(idx, 1)
                          setConfig({ ...config, links })
                        }}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                  ))}
                </div>
              </div>

              {/* 技术栈 */}
              <div className="col-span-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold tracking-wide uppercase text-primary/60">技术栈</span>
                  <button className="btn btn-ghost btn-xs gap-1" onClick={() => setConfig({ ...config, techStack: [...config.techStack, { name: '', icon: '', color: '' }] })}>
                    <Plus className="w-3 h-3" /> 添加
                  </button>
                </div>
                {config.techStack.map((tech, idx) => (
                  <div key={idx} className="flex gap-2 mb-1 items-center">
                    <div className="w-8 h-8 rounded-lg bg-base-300 flex items-center justify-center shrink-0">
                      {tech.icon && <Icon icon={tech.icon} className="w-5 h-5" style={{ color: tech.color || undefined }} />}
                    </div>
                    <input className="input input-bordered input-xs flex-1" placeholder="名称" value={tech.name} onChange={(e) => {
                      const arr = [...config.techStack]
                      arr[idx] = { ...arr[idx], name: e.target.value }
                      setConfig({ ...config, techStack: arr })
                    }} />
                    <input className="input input-bordered input-xs w-32" placeholder="Iconify" value={tech.icon} onChange={(e) => {
                      const arr = [...config.techStack]
                      arr[idx] = { ...arr[idx], icon: e.target.value }
                      setConfig({ ...config, techStack: arr })
                    }} />
                    <input className="input input-bordered input-xs w-24" placeholder="颜色" value={tech.color} onChange={(e) => {
                      const arr = [...config.techStack]
                      arr[idx] = { ...arr[idx], color: e.target.value }
                      setConfig({ ...config, techStack: arr })
                    }} />
                    <button className="btn btn-ghost btn-xs btn-square text-error" onClick={() => {
                      const arr = [...config.techStack]
                      arr.splice(idx, 1)
                      setConfig({ ...config, techStack: arr })
                    }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="bg-base-100 rounded-xl border border-base-300 overflow-hidden p-4">
          <MarkdownEditorToggle value={content} onChange={setContent} minHeight="400px" />
        </div>
      )}
    </div>
  )
}