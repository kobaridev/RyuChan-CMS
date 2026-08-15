import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { getSiteConfig, saveSiteConfig, uploadImage } from '@/lib/content-service'
import { ImageField } from '@/components/shared/ImageField'
import { IconPicker } from '@/components/shared/IconPicker'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Save, Plus, Trash2, ChevronUp, ChevronDown, Globe, User, Image } from 'lucide-react'
import { Icon } from '@iconify/react'
import type { SiteConfig } from '@/types'
import { toast } from 'sonner'

/* ====== 复用组件 ====== */

function Section({ icon: IconC, title, children }: { icon: React.FC<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-base-content/80 flex items-center gap-2">
        <span className="w-1 h-4 bg-primary rounded-full" />
        <IconC className="w-4 h-4 text-primary/60" />
        {title}
      </h3>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="label-text text-xs font-semibold tracking-wide uppercase text-primary/60">{children}</span>
}

function TextField({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div className="form-control w-full">
      <label className="label py-1.5"><Label>{label}</Label></label>
      {type === 'textarea' ? (
        <textarea className="textarea textarea-bordered textarea-sm w-full bg-base-100 focus:outline-none focus:border-primary/50 transition-colors" rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input type={type} className="input input-bordered input-sm w-full bg-base-100 focus:outline-none focus:border-primary/50 transition-colors" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  )
}

/* ====== 主组件 ====== */

export function SiteConfigPage() {
  const { token } = useAuthStore()
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    getSiteConfig(token).then(setConfig).catch((e) => toast.error('加载失败: ' + e.message)).finally(() => setLoading(false))
  }, [token])

  const handleSave = async () => {
    if (!token || !config) return
    setSaving(true)
    try { await saveSiteConfig(token, config); toast.success('站点配置已保存') }
    catch (e: any) { toast.error('保存失败: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleUpload = async (file: File): Promise<string> => {
    if (!token) throw new Error('未登录')
    return uploadImage(token, file)
  }

  const updateSite = (key: string, value: unknown) => {
    if (!config) return
    setConfig({ ...config, site: { ...config.site, [key]: value } })
  }
  const updateUser = (key: string, value: unknown) => {
    if (!config) return
    setConfig({ ...config, user: { ...config.user, [key]: value } })
  }
  const updateTheme = (key: string, value: string) => {
    if (!config) return
    setConfig({ ...config, site: { ...config.site, theme: { ...config.site.theme, [key]: value } } })
  }
  const updateBanner = (key: string, value: unknown) => {
    if (!config) return
    setConfig({ ...config, site: { ...config.site, banner: { ...config.site.banner, [key]: value } } })
  }

  if (loading) return <LoadingSpinner />
  if (!config) return <div className="text-center py-8 text-base-content/50">配置加载失败</div>

  const { site, user } = config

  return (
    <div className="space-y-4">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">站点配置</h1>
        <button className="btn btn-primary btn-sm gap-1" onClick={handleSave} disabled={saving}>
          {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="w-4 h-4" />}
          保存配置
        </button>
      </div>

      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body p-6 space-y-8">

          {/* ====== site ====== */}
          <Section icon={Globe} title="site — 站点信息">
            {/* 品牌图片 — 同一行对齐 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <ImageField label="favicon" value={site.favicon} onChange={(v) => updateSite('favicon', v)} size="md" onUpload={handleUpload} />
              <ImageField label="title_image" value={site.title_image} onChange={(v) => updateSite('title_image', v)} size="md" onUpload={handleUpload} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField label="tab" value={site.tab} onChange={(v) => updateSite('tab', v)} />
              <TextField label="title" value={site.title} onChange={(v) => updateSite('title', v)} />
              <div className="form-control w-full">
                <label className="label py-1.5"><Label>title_type</Label></label>
                <select className="select select-bordered select-sm w-full bg-base-100 focus:outline-none focus:border-primary/50 transition-colors" value={site.title_type} onChange={(e) => updateSite('title_type', e.target.value)}>
                  <option value="text">text</option>
                  <option value="image">image</option>
                </select>
              </div>
              <TextField label="language" value={site.language} onChange={(v) => updateSite('language', v)} />
              <TextField label="date_format" value={site.date_format} onChange={(v) => updateSite('date_format', v)} />
              <TextField label="description" value={site.description} onChange={(v) => updateSite('description', v)} type="textarea" />
            </div>

            {/* theme */}
            <div className="bg-base-200/50 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-base-content/50 uppercase tracking-wider">theme</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextField label="light" value={site.theme.light} onChange={(v) => updateTheme('light', v)} />
                <TextField label="dark" value={site.theme.dark} onChange={(v) => updateTheme('dark', v)} />
                <TextField label="code" value={site.theme.code} onChange={(v) => updateTheme('code', v)} />
              </div>
            </div>

            {/* banner */}
            <div className="bg-base-200/50 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-base-content/50 uppercase tracking-wider">banner</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label cursor-pointer gap-3 py-1.5">
                    <Label>enableRandom</Label>
                    <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={site.banner.enableRandom} onChange={(e) => updateBanner('enableRandom', e.target.checked)} />
                  </label>
                </div>
                <TextField label="randomUrl" value={site.banner.randomUrl} onChange={(v) => updateBanner('randomUrl', v)} />
                <TextField label="randomCount" value={String(site.banner.randomCount)} onChange={(v) => updateBanner('randomCount', Number(v))} type="number" />
                <TextField label="height" value={site.banner.height} onChange={(v) => updateBanner('height', v)} />
              </div>
              {/* banner images */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-base-content/50">images</span>
                  <button className="btn btn-ghost btn-xs gap-1" onClick={() => updateBanner('images', [...site.banner.images, ''])}>
                    <Plus className="w-3 h-3" /> 添加
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {site.banner.images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <ImageField
                        label={`#${idx + 1}`}
                        value={img}
                        onChange={(v) => {
                          const images = [...site.banner.images]
                          images[idx] = v
                          updateBanner('images', images)
                        }}
                        size="sm"
                        onUpload={handleUpload}
                      />
                      <button className="absolute -top-1 -right-1 btn btn-ghost btn-xs btn-square text-error opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => { const images = [...site.banner.images]; images.splice(idx, 1); updateBanner('images', images) }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* menu */}
            <div className="bg-base-200/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-base-content/50 uppercase tracking-wider">menu</h4>
                <button className="btn btn-ghost btn-xs gap-1" onClick={() => updateSite('menu', [...site.menu, { id: '', text: '', href: '', svg: 'ri:link', target: '_self' }])}>
                  <Plus className="w-3 h-3" /> 添加菜单
                </button>
              </div>
              <div className="space-y-2">
                {site.menu.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-base-100 rounded-lg group">
                    <div className="w-8 h-8 rounded bg-base-300 flex items-center justify-center shrink-0">
                      {item.svg ? <Icon icon={item.svg} className="w-4 h-4" /> : <span className="text-[10px]">icon</span>}
                    </div>
                    <input className="input input-bordered input-xs flex-1 bg-base-100 focus:outline-none focus:border-primary/50 transition-colors" placeholder="id" value={item.id}
                      onChange={(e) => { const m = [...site.menu]; m[idx] = { ...m[idx], id: e.target.value }; updateSite('menu', m) }} />
                    <input className="input input-bordered input-xs w-24 bg-base-100 focus:outline-none focus:border-primary/50 transition-colors" placeholder="text" value={item.text}
                      onChange={(e) => { const m = [...site.menu]; m[idx] = { ...m[idx], text: e.target.value }; updateSite('menu', m) }} />
                    <input className="input input-bordered input-xs w-32 bg-base-100 focus:outline-none focus:border-primary/50 transition-colors" placeholder="href" value={item.href}
                      onChange={(e) => { const m = [...site.menu]; m[idx] = { ...m[idx], href: e.target.value }; updateSite('menu', m) }} />
                    <div className="w-28">
                      <IconPicker value={item.svg} onChange={(icon) => { const m = [...site.menu]; m[idx] = { ...m[idx], svg: icon }; updateSite('menu', m) }} />
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="btn btn-ghost btn-xs btn-square" onClick={() => {
                        if (idx === 0) return; const m = [...site.menu]; [m[idx], m[idx - 1]] = [m[idx - 1], m[idx]]; updateSite('menu', m)
                      }} disabled={idx === 0}><ChevronUp className="w-3 h-3" /></button>
                      <button className="btn btn-ghost btn-xs btn-square" onClick={() => {
                        if (idx === site.menu.length - 1) return; const m = [...site.menu]; [m[idx], m[idx + 1]] = [m[idx + 1], m[idx]]; updateSite('menu', m)
                      }} disabled={idx === site.menu.length - 1}><ChevronDown className="w-3 h-3" /></button>
                      <button className="btn btn-ghost btn-xs btn-square text-error" onClick={() => {
                        const m = [...site.menu]; m.splice(idx, 1); updateSite('menu', m)
                      }}><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* 分隔线 */}
          <div className="divider" />

          {/* ====== user ====== */}
          <Section icon={User} title="user — 用户信息">
            {/* 用户图片 — 统一 3 列对齐 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <ImageField label="avatar" value={user.avatar} onChange={(v) => updateUser('avatar', v)} size="md" onUpload={handleUpload} />
              <ImageField label="qr_wechat" value={user.qr_wechat} onChange={(v) => updateUser('qr_wechat', v)} size="md" onUpload={handleUpload} />
              <ImageField label="qr_alipay" value={user.qr_alipay} onChange={(v) => updateUser('qr_alipay', v)} size="md" onUpload={handleUpload} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField label="name" value={user.name} onChange={(v) => updateUser('name', v)} />
              <TextField label="site" value={user.site} onChange={(v) => updateUser('site', v)} />
              <TextField label="description" value={user.description} onChange={(v) => updateUser('description', v)} type="textarea" />
            </div>

            {/* sidebar.social */}
            <div className="bg-base-200/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-base-content/50 uppercase tracking-wider">sidebar.social</h4>
                <button className="btn btn-ghost btn-xs gap-1" onClick={() => {
                  const social = [...user.sidebar.social, { href: '', ariaLabel: '', title: '', svg: 'ri:link' }]
                  setConfig({ ...config, user: { ...user, sidebar: { social } } })
                }}>
                  <Plus className="w-3 h-3" /> 添加
                </button>
              </div>
              <div className="space-y-2">
                {user.sidebar.social.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-base-100 rounded-lg group">
                    <div className="w-8 h-8 rounded bg-base-300 flex items-center justify-center shrink-0">
                      {link.svg ? <Icon icon={link.svg} className="w-4 h-4" /> : <span className="text-[10px]">icon</span>}
                    </div>
                    <div className="w-36">
                      <IconPicker value={link.svg} onChange={(icon) => {
                        const social = [...user.sidebar.social]; social[idx] = { ...social[idx], svg: icon }
                        setConfig({ ...config, user: { ...user, sidebar: { social } } })
                      }} />
                    </div>
                    <input className="input input-bordered input-xs flex-1 bg-base-100 focus:outline-none focus:border-primary/50 transition-colors" placeholder="href" value={link.href}
                      onChange={(e) => { const social = [...user.sidebar.social]; social[idx] = { ...social[idx], href: e.target.value }; setConfig({ ...config, user: { ...user, sidebar: { social } } }) }} />
                    <input className="input input-bordered input-xs w-20 bg-base-100 focus:outline-none focus:border-primary/50 transition-colors" placeholder="title" value={link.title}
                      onChange={(e) => { const social = [...user.sidebar.social]; social[idx] = { ...social[idx], title: e.target.value }; setConfig({ ...config, user: { ...user, sidebar: { social } } }) }} />
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="btn btn-ghost btn-xs btn-square" onClick={() => {
                        if (idx === 0) return; const social = [...user.sidebar.social]; [social[idx], social[idx - 1]] = [social[idx - 1], social[idx]]
                        setConfig({ ...config, user: { ...user, sidebar: { social } } })
                      }} disabled={idx === 0}><ChevronUp className="w-3 h-3" /></button>
                      <button className="btn btn-ghost btn-xs btn-square" onClick={() => {
                        if (idx === user.sidebar.social.length - 1) return; const social = [...user.sidebar.social]; [social[idx], social[idx + 1]] = [social[idx + 1], social[idx]]
                        setConfig({ ...config, user: { ...user, sidebar: { social } } })
                      }} disabled={idx === user.sidebar.social.length - 1}><ChevronDown className="w-3 h-3" /></button>
                      <button className="btn btn-ghost btn-xs btn-square text-error" onClick={() => {
                        const social = [...user.sidebar.social]; social.splice(idx, 1)
                        setConfig({ ...config, user: { ...user, sidebar: { social } } })
                      }}><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>

        </div>
      </div>
    </div>
  )
}