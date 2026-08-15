import { useEffect, useState, useMemo } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useStagingStore } from '@/stores/staging-store'
import { getSiteConfig, saveSiteConfig, uploadImage } from '@/lib/content-service'
import { loadWithCache } from '@/stores/cache-store'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Save, Plus, Trash2, ChevronUp, ChevronDown, Globe, User, AlertTriangle } from 'lucide-react'
import { Icon } from '@iconify/react'
import type { SiteConfig } from '@/types'
import { toast } from 'sonner'

/* ====== 图标预设 ====== */
const SOCIAL_PRESETS = [
  { label: 'Bilibili', value: 'ri:bilibili-line' },
  { label: 'CloudMusic', value: 'ri:netease-cloud-music-line' },
  { label: 'Discord', value: 'ri:discord-line' },
  { label: 'Douban', value: 'ri:douban-line' },
  { label: 'Email', value: 'ri:mail-line' },
  { label: 'Facebook', value: 'ri:facebook-line' },
  { label: 'Github', value: 'ri:github-line' },
  { label: 'Instagram', value: 'ri:instagram-line' },
  { label: 'LinkedIn', value: 'ri:linkedin-box-line' },
  { label: 'Mastodon', value: 'ri:mastodon-line' },
  { label: 'Pixiv', value: 'simple-icons:pixiv' },
  { label: 'QQ', value: 'ri:qq-line' },
  { label: 'Reddit', value: 'ri:reddit-line' },
  { label: 'RSS', value: 'ri:rss-fill' },
  { label: 'Spotify', value: 'ri:spotify-line' },
  { label: 'Steam', value: 'ri:steam-line' },
  { label: 'Telegram', value: 'ri:telegram-line' },
  { label: 'Twitter (X)', value: 'ri:twitter-line' },
  { label: 'WeChat', value: 'ri:wechat-fill' },
  { label: 'Weibo', value: 'ri:weibo-fill' },
  { label: 'YouTube', value: 'ri:youtube-line' },
  { label: 'Zhihu', value: 'ri:zhihu-line' },
]

/* ====== 通用组件 ====== */

function Section({ icon: IconC, title, children }: { icon: React.FC<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-extrabold text-base-content/85 flex items-center gap-2">
        <span className="w-1 h-4 bg-primary rounded-full" />
        <IconC className="w-4 h-4 text-primary/70" />
        {title}
      </h3>
      {children}
    </div>
  )
}

function TextField({ label, value, onChange, type = 'text', placeholder, className = '' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; className?: string
}) {
  return (
    <div className={`form-control w-full ${className}`}>
      <label className="label py-1"><span className="label-text text-xs font-bold tracking-wide uppercase text-primary/60">{label}</span></label>
      {type === 'textarea' ? (
        <textarea className="textarea textarea-bordered textarea-sm w-full bg-base-100 font-medium focus:outline-none focus:border-primary/50 transition-colors" rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input type={type} className="input input-bordered input-sm w-full bg-base-100 font-medium focus:outline-none focus:border-primary/50 transition-colors" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  )
}

function ImageBox({
  src, label, onUpload, uploading, imgKey
}: {
  src: string; label: string; onUpload: () => void; uploading: boolean; imgKey: string
}) {
  return (
    <div className="group relative flex justify-center p-3 md:p-4 bg-base-100 rounded-xl md:rounded-2xl border border-base-200 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl overflow-hidden bg-base-200 ring-4 ring-base-100 shadow-xl group-hover:scale-105 transition-transform duration-300 flex items-center justify-center">
        {src ? (
          <img src={src} alt={label} className="w-full h-full object-cover" />
        ) : (
          <span className="text-base-content/20 text-xs">暂无</span>
        )}
      </div>
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-base-100/50 backdrop-blur-sm rounded-xl md:rounded-2xl cursor-pointer" onClick={onUpload}>
        <button className="btn btn-circle btn-primary shadow-lg scale-90 group-hover:scale-100 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
        </button>
      </div>
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-base-100/80 rounded-xl md:rounded-2xl z-10">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      )}
    </div>
  )
}

/* ====== 主组件 ====== */

export function SiteConfigPage() {
  const { token } = useAuthStore()
  const addChange = useStagingStore(s => s.addChange)
  const stagedChanges = useStagingStore(s => s.changes)
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [serverConfig, setServerConfig] = useState<SiteConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadTarget, setUploadTarget] = useState<string>('')
  const imageInputRef = useState<HTMLInputElement | null>(null)

  // 检查是否有暂存的站点配置修改
  const stagedChange = useMemo(() => {
    return stagedChanges.find(c =>
      c.module === 'siteConfig' && c.action === 'update'
    )
  }, [stagedChanges])

  const stagedConfig = stagedChange ? (stagedChange.args[0] as SiteConfig) : null

  useEffect(() => {
    if (!token) return
    setLoading(true)
    loadWithCache('siteConfig', token, getSiteConfig)
      .then((data) => {
        setServerConfig(data)
        // 如果暂存区有更新版本，优先使用暂存数据
        if (stagedConfig) {
          setConfig(stagedConfig)
        } else {
          setConfig(data)
        }
      })
      .catch((e) => toast.error('加载失败: ' + e.message))
      .finally(() => setLoading(false))
  }, [token, stagedConfig])

  // 深度比较：通过路径字符串判断字段是否被修改
  // 路径格式: 'site.tab', 'site.theme.light', 'user.name' 等
  const isModified = (path: string): boolean => {
    if (!serverConfig || !stagedConfig) return false
    const get = (obj: unknown, p: string) => p.split('.').reduce((o: any, k) => o?.[k], obj)
    const oldVal = get(serverConfig, path)
    const newVal = get(stagedConfig, path)
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      return JSON.stringify(oldVal) !== JSON.stringify(newVal)
    }
    return oldVal !== newVal
  }

  const modifiedClass = (path: string) =>
    isModified(path) ? 'ring-2 ring-warning/50 bg-warning/5' : ''

  const handleSave = async () => {
    if (!token || !config) return
    setSaving(true)
    try {
      addChange({ module: 'siteConfig', title: '更新站点配置', action: 'update', serviceFunc: 'saveSiteConfig', args: [config], commitMessage: 'feat(config): update site config', sourceRoute: '/site-config' })
      toast.success('已暂存')
    } catch (e: any) { toast.error('暂存失败: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleUpload = async (file: File, targetKey: string): Promise<string> => {
    if (!token) throw new Error('未登录')
    setUploadTarget(targetKey)
    setUploadingImage(true)
    try {
      const url = await uploadImage(token, file)
      return url
    } finally {
      setUploadingImage(false)
      setUploadTarget('')
    }
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

  const triggerUpload = async (targetKey: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const url = await handleUpload(file, targetKey)
      if (targetKey.startsWith('site.')) updateSite(targetKey.split('.')[1], url)
      else updateUser(targetKey.split('.')[1], url)
    }
    input.click()
  }

  if (loading) return <LoadingSpinner />
  if (!config) return <div className="text-center py-8 text-base-content/50">配置加载失败</div>

  const { site, user } = config

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">站点配置</h1>
        <button className="btn btn-primary btn-sm gap-1" onClick={handleSave} disabled={saving}>
          {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="w-4 h-4" />}
          保存配置
        </button>
      </div>

      {/* 暂存版本提示 */}
      {stagedConfig && serverConfig && (
        <div className="alert alert-warning py-2 px-4 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>当前正在编辑<strong>暂存版本</strong>，黄色高亮字段为已修改内容。推送后将以暂存版本为准。</span>
        </div>
      )}

      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body p-4 space-y-5">

          {/* ====== site ====== */}
          <Section icon={Globe} title="site — 站点信息">
            {/* Favicon + Title Image */}
            <div className="grid grid-cols-2 gap-3 md:gap-6">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-base-content/70 ml-1">网站图标</div>
                <ImageBox
                  src={site.favicon || ''}
                  label="Favicon"
                  onUpload={() => triggerUpload('favicon')}
                  uploading={uploadingImage && uploadTarget === 'favicon'}
                  imgKey="favicon"
                />
                <input
                  type="text"
                  className="input input-sm input-bordered w-full text-center text-xs rounded-full bg-base-100 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={site.favicon || ''}
                  onChange={(e) => updateSite('favicon', e.target.value)}
                  placeholder="图标 URL 或上传图片（将重命名为 favicon.ico）"
                />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-base-content/70 ml-1">用户头像</div>
                <ImageBox
                  src={user.avatar || ''}
                  label="Avatar"
                  onUpload={() => triggerUpload('avatar')}
                  uploading={uploadingImage && uploadTarget === 'avatar'}
                  imgKey="avatar"
                />
                <input
                  type="text"
                  className="input input-sm input-bordered w-full text-center text-xs rounded-full bg-base-100 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={user.avatar || ''}
                  onChange={(e) => updateUser('avatar', e.target.value)}
                  placeholder="头像 URL"
                />
              </div>
            </div>

            {/* 站点标题图片 */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-base-content/70 ml-1">站点标题图片（若选择图片显示）</div>
              <div className="group relative flex justify-center p-3 md:p-4 bg-base-100 rounded-xl md:rounded-2xl border border-base-200 shadow-sm hover:shadow-md transition-all duration-300 w-full h-32 md:h-40">
                <img src={site.title_image || '/logo.png'} alt="Site Title" className="max-w-full max-h-full object-contain transform scale-125 group-hover:scale-150 transition-transform duration-300" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-base-100/50 backdrop-blur-sm rounded-xl md:rounded-2xl cursor-pointer" onClick={() => triggerUpload('site.title_image')}>
                  <button className="btn btn-circle btn-primary shadow-lg scale-90 group-hover:scale-100 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                  </button>
                </div>
                {uploadingImage && uploadTarget === 'title_image' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-base-100/80 rounded-xl md:rounded-2xl z-10">
                    <span className="loading loading-spinner loading-md text-primary"></span>
                  </div>
                )}
              </div>
              <input
                type="text"
                className="input input-bordered h-10 w-full text-center rounded-full bg-base-100 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={site.title_image || ''}
                onChange={(e) => updateSite('title_image', e.target.value)}
                placeholder="标题图片 URL"
              />
              <div className="flex justify-center">
                <button className="btn btn-sm btn-primary" onClick={() => triggerUpload('site.title_image')}>上传图片</button>
              </div>
            </div>

            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField label="浏览器标签页标题" value={site.tab} onChange={(v) => updateSite('tab', v)} className={modifiedClass('site.tab')} />
              <TextField label="站点标题" value={site.title} onChange={(v) => updateSite('title', v)} className={modifiedClass('site.title')} />
              <div className={`form-control w-full ${modifiedClass('site.title_type')}`}>
                <label className="label py-1"><span className="label-text text-xs font-bold tracking-wide uppercase text-primary/60">标题类型</span></label>
                <select className="select select-bordered select-sm w-full bg-base-100 focus:outline-none focus:border-primary/50 transition-colors" value={site.title_type} onChange={(e) => updateSite('title_type', e.target.value)}>
                  <option value="text">text（文字）</option>
                  <option value="image">image（图片）</option>
                </select>
              </div>
              <TextField label="语言" value={site.language} onChange={(v) => updateSite('language', v)} className={modifiedClass('site.language')} />
              <TextField label="日期格式" value={site.date_format} onChange={(v) => updateSite('date_format', v)} className={modifiedClass('site.date_format')} />
              <div className={`form-control w-full md:col-span-2 ${modifiedClass('site.description')}`}>
                <label className="label py-1"><span className="label-text text-xs font-bold tracking-wide uppercase text-primary/60">站点描述</span></label>
                <textarea className="textarea textarea-bordered textarea-sm w-full bg-base-100 font-medium focus:outline-none focus:border-primary/50 transition-colors" rows={2} value={site.description} onChange={(e) => updateSite('description', e.target.value)} />
              </div>
            </div>

            {/* theme */}
            <div className="bg-base-200/60 rounded-lg p-3 space-y-2">
              <h4 className="text-xs font-extrabold text-base-content/50 uppercase tracking-wider">主题配色</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <TextField label="浅色主题" value={site.theme.light} onChange={(v) => updateTheme('light', v)} className={modifiedClass('site.theme.light')} />
                <TextField label="深色主题" value={site.theme.dark} onChange={(v) => updateTheme('dark', v)} className={modifiedClass('site.theme.dark')} />
                <TextField label="代码高亮主题" value={site.theme.code} onChange={(v) => updateTheme('code', v)} className={modifiedClass('site.theme.code')} />
              </div>
            </div>

            {/* banner */}
            <div className="bg-base-200/60 rounded-lg p-3 space-y-2">
              <h4 className="text-xs font-extrabold text-base-content/50 uppercase tracking-wider">横幅设置</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label cursor-pointer gap-3 py-1">
                    <span className="label-text text-xs font-bold tracking-wide uppercase text-primary/60">启用随机横幅</span>
                    <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={site.banner.enableRandom} onChange={(e) => updateBanner('enableRandom', e.target.checked)} />
                  </label>
                </div>
                <TextField label="随机横幅API" value={site.banner.randomUrl} onChange={(v) => updateBanner('randomUrl', v)} className={modifiedClass('site.banner.randomUrl')} />
                <TextField label="随机数量" value={String(site.banner.randomCount)} onChange={(v) => updateBanner('randomCount', Number(v))} type="number" className={modifiedClass('site.banner.randomCount')} />
                <TextField label="横幅高度" value={site.banner.height} onChange={(v) => updateBanner('height', v)} className={modifiedClass('site.banner.height')} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-base-content/50">横幅图片</span>
                  <button className="btn btn-ghost btn-xs gap-1" onClick={() => updateBanner('images', [...site.banner.images, ''])}>
                    <Plus className="w-3 h-3" /> 添加
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {site.banner.images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <div className="w-full h-24 md:h-32 rounded-xl overflow-hidden bg-base-200 ring-2 ring-base-100 shadow-md flex items-center justify-center">
                        {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <span className="text-base-content/20 text-[10px]">暂无</span>}
                      </div>
                      <input className="input input-bordered input-xs w-full mt-1 bg-base-100" value={img} onChange={(e) => {
                        const images = [...site.banner.images]
                        images[idx] = e.target.value
                        updateBanner('images', images)
                      }} />
                      <button className="absolute -top-1 -right-1 btn btn-ghost btn-xs btn-square text-error opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => { const images = [...site.banner.images]; images.splice(idx, 1); updateBanner('images', images) }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </Section>

          {/* 分隔线 */}
          <div className="divider" />

          {/* ====== user ====== */}
          <Section icon={User} title="user — 用户信息">
            {/* QR Codes — 较大尺寸 */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-base-content/70 ml-1">打赏二维码</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                <div className="space-y-2">
                  <div className="text-xs text-base-content/50 ml-1">微信赞赏码</div>
                  <ImageBox
                    src={user.qr_wechat || ''}
                    label="WeChat"
                    onUpload={() => triggerUpload('qr_wechat')}
                    uploading={uploadingImage && uploadTarget === 'qr_wechat'}
                    imgKey="qr_wechat"
                  />
                  <input
                    type="text"
                    className="input input-sm input-bordered w-full text-center text-xs rounded-full bg-base-100 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                    value={user.qr_wechat || ''}
                    onChange={(e) => updateUser('qr_wechat', e.target.value)}
                    placeholder="微信赞赏码 URL 或上传图片"
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-base-content/50 ml-1">支付宝收款码</div>
                  <ImageBox
                    src={user.qr_alipay || ''}
                    label="Alipay"
                    onUpload={() => triggerUpload('qr_alipay')}
                    uploading={uploadingImage && uploadTarget === 'qr_alipay'}
                    imgKey="qr_alipay"
                  />
                  <input
                    type="text"
                    className="input input-sm input-bordered w-full text-center text-xs rounded-full bg-base-100 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                    value={user.qr_alipay || ''}
                    onChange={(e) => updateUser('qr_alipay', e.target.value)}
                    placeholder="支付宝收款码 URL 或上传图片"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField label="用户名" value={user.name} onChange={(v) => updateUser('name', v)} className={modifiedClass('user.name')} />
              <TextField label="个人网站" value={user.site} onChange={(v) => updateUser('site', v)} className={modifiedClass('user.site')} />
              <div className={`form-control w-full md:col-span-2 ${modifiedClass('user.description')}`}>
                <label className="label py-1"><span className="label-text text-xs font-bold tracking-wide uppercase text-primary/60">个人描述</span></label>
                <textarea className="textarea textarea-bordered textarea-sm w-full bg-base-100 font-medium focus:outline-none focus:border-primary/50 transition-colors" rows={2} value={user.description} onChange={(e) => updateUser('description', e.target.value)} />
              </div>
            </div>

            {/* sidebar.social */}
            <div className="bg-base-200/60 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-base-content/50 uppercase tracking-wider">社交链接</h4>
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
                    <div className="w-32">
                      <select className="select select-bordered select-xs w-full bg-base-100" value={link.svg} onChange={(e) => {
                        const social = [...user.sidebar.social]; social[idx] = { ...social[idx], svg: e.target.value }
                        setConfig({ ...config, user: { ...user, sidebar: { social } } })
                      }}>
                        {SOCIAL_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                    <input className="input input-bordered input-xs flex-1 bg-base-100 focus:outline-none focus:border-primary/50 transition-colors" placeholder="链接地址" value={link.href}
                      onChange={(e) => { const social = [...user.sidebar.social]; social[idx] = { ...social[idx], href: e.target.value }; setConfig({ ...config, user: { ...user, sidebar: { social } } }) }} />
                    <input className="input input-bordered input-xs w-20 bg-base-100 focus:outline-none focus:border-primary/50 transition-colors" placeholder="标题" value={link.title}
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
