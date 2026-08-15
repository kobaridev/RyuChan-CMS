import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useStagingStore } from '@/stores/staging-store'
import { getBlogPost, saveBlogPost, uploadImage, getSiteConfig, listBlogPosts } from '@/lib/content-service'
import { MarkdownEditorToggle } from '@/components/shared/MarkdownEditorToggle'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ArrowLeft, Save, FileText, Images, Copy, Trash2, Pin, Calendar, ChevronDown } from 'lucide-react'
import type { BlogPost } from '@/types'
import { toast } from 'sonner'

const emptyPost: BlogPost = {
  slug: '',
  title: '',
  description: '',
  pubDate: new Date().toISOString().split('T')[0],
  draft: false,
  categories: [],
  tags: [],
  content: '',
  fileFormat: 'md',
  filePath: '',
}

export function BlogEditorPage() {
  const { token } = useAuthStore()
  const addChange = useStagingStore(s => s.addChange)
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const isEdit = !!slug

  const [post, setPost] = useState<BlogPost>(emptyPost)
  const [originalFilePath, setOriginalFilePath] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [codeTheme, setCodeTheme] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [existingCategories, setExistingCategories] = useState<string[]>([])
  const [newCatInput, setNewCatInput] = useState('')
  const [showCatDropdown, setShowCatDropdown] = useState(false)
  const [newTagInput, setNewTagInput] = useState('')

  useEffect(() => {
    if (!token) return
    getSiteConfig(token)
      .then((cfg) => { if (cfg?.site?.theme?.code) setCodeTheme(cfg.site.theme.code) })
      .catch(() => {})
    listBlogPosts(token)
      .then((posts) => {
        const cats = [...new Set(posts.flatMap(p => p.categories || []))].sort()
        setExistingCategories(cats)
      })
      .catch(() => {})
  }, [token])

  useEffect(() => {
    if (!token || !isEdit) return
    setLoading(true)
    getBlogPost(token, slug!)
      .then((data) => { if (data) { setPost(data); setOriginalFilePath(data.filePath) }
        else { toast.error('文章不存在'); navigate('/blog') }
      })
      .catch((e) => toast.error('加载文章失败: ' + e.message))
      .finally(() => setLoading(false))
  }, [token, slug, isEdit, navigate])

  const handleSave = async () => {
    if (!token) return
    if (!post.title.trim()) { toast.error('请输入文章标题'); return }
    if (!post.slug.trim()) {
      const s = post.title.toLowerCase().replace(/[^\w一-鿿]+/g, '-').replace(/^-+|-+$/g, '')
      setPost({ ...post, slug: s })
    }
    setSaving(true)
    try {
      addChange({ module: 'blog', title: `${isEdit ? '更新' : '发布'}文章「${post.title}」`, action: isEdit ? 'update' : 'create', serviceFunc: 'saveBlogPost', args: [post, isEdit ? 'edit' : 'create', originalFilePath], commitMessage: isEdit ? `feat(blog): update post "${post.title}"` : `feat(blog): publish post "${post.title}"` })
      toast.success('已暂存')
      navigate('/blog')
    } catch (e: any) { toast.error('暂存失败: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    setUploadingCover(true)
    try {
      const url = await uploadImage(token, file)
      setPost({ ...post, image: url })
    } catch (err: any) {
      toast.error('上传失败: ' + err.message)
    } finally {
      setUploadingCover(false)
      e.target.value = ''
    }
  }

  const updateField = (field: keyof BlogPost, value: unknown) => {
    setPost({ ...post, [field]: value })
  }

  const copyImageUrl = () => {
    if (post.image) { navigator.clipboard.writeText(post.image); toast.success('已复制') }
  }

  const addTag = (v: string) => { if (v && !post.tags!.includes(v)) updateField('tags', [...post.tags!, v]) }
  const removeTag = (idx: number) => { const t = [...(post.tags || [])]; t.splice(idx, 1); updateField('tags', t) }
  const addCategory = (v: string) => { if (v && !post.categories!.includes(v)) { updateField('categories', [...post.categories!, v]); setNewCatInput('') } }
  const removeCategory = (idx: number) => { const c = [...(post.categories || [])]; c.splice(idx, 1); updateField('categories', c) }

  const isPin = post.badge === 'Pin' || post.badge === 'pin'

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/blog')}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold">{isEdit ? '编辑文章' : '新建文章'}</h1>
        </div>
        <button className="btn btn-primary btn-sm gap-1" onClick={handleSave} disabled={saving}>
          {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="w-4 h-4" />}
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      {/* 文章属性 */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        {/* 卡片标题栏 — 粉色渐变背景，仿参考图 */}
        <div className="px-6 py-4 border-b border-base-200 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-primary">文章属性</h2>
          </div>
        </div>

        <div className="card-body p-6">
          {/* 三列布局 */}
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr_1fr] gap-8">

            {/* 第1列：封面图 */}
            <div className="space-y-6">
              {/* 封面图 */}
              <div>
                <div className="text-xs font-semibold text-base-content/50 mb-2 uppercase tracking-wide">封面图</div>
                <div
                  className="rounded-xl border-2 border-dashed border-base-300 hover:border-primary/40 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 min-h-[180px] bg-base-200/40"
                  onClick={() => document.getElementById('cover-upload')?.click()}
                >
                  {post.image ? (
                    <div className="group relative w-full h-full min-h-[180px] rounded-xl overflow-hidden">
                      <img src={post.image} alt="封面" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-white font-semibold">点击更换</span>
                      </div>
                      {uploadingCover && (
                        <div className="absolute inset-0 flex items-center justify-center bg-base-100/80 rounded-xl z-10">
                          <span className="loading loading-spinner loading-sm text-primary" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <Images className="w-8 h-8 text-base-content/20" />
                      <span className="text-xs text-base-content/40 text-center px-4">点击或拖拽上传封面图</span>
                      <span className="text-[10px] text-base-content/30">建议尺寸：1200×630</span>
                    </>
                  )}
                </div>
                <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={handleUploadCover} />
                <div className="mt-3">
                  <div className="text-xs font-semibold text-base-content/50 mb-1.5 uppercase tracking-wide">封面图路径</div>
                  <div className="flex gap-1">
                    <input type="text" className="input input-bordered input-sm flex-1 bg-base-100 font-mono text-xs"
                      placeholder="/images/cover.webp" value={post.image || ''}
                      onChange={(e) => updateField('image', e.target.value)} />
                    <button className="btn btn-sm btn-square btn-ghost" onClick={copyImageUrl} title="复制路径">
                      <Copy className="w-4 h-4" />
                    </button>
                    {post.image && (
                      <button className="btn btn-sm btn-square btn-ghost text-error" onClick={() => updateField('image', '')}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              </div>

            {/* 第2列：标题 + slug + 角标 */}
            <div className="space-y-5">
              <div>
                <div className="text-xs font-semibold text-base-content/50 mb-1.5 uppercase tracking-wide">标题 <span className="text-error">*</span></div>
                <input type="text" className="input input-bordered w-full bg-base-100 focus:input-primary text-sm"
                  value={post.title} onChange={(e) => updateField('title', e.target.value)} placeholder="文章标题" />
              </div>
              <div>
                <div className="text-xs font-semibold text-base-content/50 mb-1.5 uppercase tracking-wide">SLUG</div>
                <input type="text" className="input input-bordered w-full bg-base-100 focus:input-primary text-sm font-mono"
                  value={post.slug} onChange={(e) => updateField('slug', e.target.value)} placeholder="自动生成" />
              </div>
              <div>
                <div className="text-xs font-semibold text-base-content/50 mb-1.5 uppercase tracking-wide">Badge</div>
                <div className="join border border-base-300 rounded-lg w-full bg-base-100 overflow-hidden">
                  <button className={`join-item btn btn-sm flex-1 gap-1 ${isPin ? 'btn-primary' : 'btn-ghost text-base-content/60'}`}
                    onClick={() => updateField('badge', isPin ? '' : 'Pin')} title={isPin ? '移除 Pin' : '设置 Pin'}>
                    <Pin className={`w-3.5 h-3.5 ${isPin ? '' : 'text-base-content/40'}`} />
                    {isPin ? 'Pin' : 'Badge'}
                  </button>
                  {!isPin && (
                    <input type="text" className="input input-bordered input-sm flex-1 bg-transparent focus:bg-base-100"
                      value={post.badge || ''} onChange={(e) => updateField('badge', e.target.value)} placeholder="自定义 Badge" />
                  )}
                </div>
              </div>
              
            </div>

            {/* 第3列 */}
            <div className="space-y-5">
              <div>
                <div className="text-xs font-semibold text-base-content/50 mb-1.5 uppercase tracking-wide">文件格式</div>
                <select className="select select-bordered w-full bg-base-100 focus:select-primary text-sm"
                  value={post.fileFormat} onChange={(e) => updateField('fileFormat', e.target.value)}>
                  <option value="md">Markdown (.md)</option>
                  <option value="mdx">MDX (.mdx)</option>
                </select>
              </div>
              <div>
                <div className="text-xs font-semibold text-base-content/50 mb-1.5 uppercase tracking-wide">发布日期</div>
                <div className="input input-bordered w-full bg-base-100 focus:input-primary flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-base-content/40 shrink-0" />
                  <input type="date" className="flex-1 bg-transparent border-0 p-0 focus:outline-none"
                    value={post.pubDate} onChange={(e) => updateField('pubDate', e.target.value)} />
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-base-content/50 mb-1.5 uppercase tracking-wide">标签</div>
                <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 border border-base-300 rounded-lg bg-base-100 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-colors">
                  {(post.tags || []).map((tag, idx) => (
                    <span key={idx} className="badge badge-primary badge-sm gap-0.5 py-2 px-3 text-xs bg-primary/10 text-primary">
                      {tag}<button className="hover:text-error" onClick={() => removeTag(idx)}>&times;</button>
                    </span>
                  ))}
                  <input type="text" className="input input-xs w-32 shrink-0 bg-transparent border-0 focus:outline-none placeholder:text-base-content/30"
                    placeholder="输入后回车" value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(newTagInput.trim()) } }}
                  />
                </div>
              </div>
              
            </div>

          </div>

            {/* 描述 + 分类 & 隐藏 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              {/* 左侧：描述 */}
              <div>
                <div className="text-xs font-semibold text-base-content/50 mb-1.5 uppercase tracking-wide">描述</div>
                <textarea className="textarea textarea-bordered w-full bg-base-100 focus:textarea-primary resize-none text-sm min-h-[90px]"
                  value={post.description} onChange={(e) => updateField('description', e.target.value)} placeholder="文章摘要" />
              </div>
              {/* 右侧：分类 + 隐藏 */}
              <div className="space-y-5">
                <div>
                  <div className="text-xs font-semibold text-base-content/50 mb-1.5 uppercase tracking-wide">分类</div>
                  <div className="flex flex-wrap gap-1.5 min-h-[36px] px-2 py-1.5 border border-base-300 rounded-lg bg-base-100 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-colors relative">
                    {(post.categories || []).map((cat, idx) => (
                      <span key={idx} className="badge badge-primary badge-sm gap-0.5 py-2 px-3 text-xs bg-primary/10 text-primary">
                        {cat}<button className="hover:text-error" onClick={() => removeCategory(idx)}>&times;</button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <input type="text" className="input input-xs flex-1 bg-transparent border-0 focus:outline-none placeholder:text-base-content/30"
                        placeholder="输入后回车" value={newCatInput}
                        onChange={(e) => setNewCatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(newCatInput.trim()) } }}
                      />
                      <div className="relative">
                        <button className="btn btn-xs btn-outline gap-1 border-base-300" onClick={() => setShowCatDropdown(!showCatDropdown)} title="从已有分类选择">
                          <ChevronDown className="w-3 h-3" />
                          选择
                        </button>
                        {showCatDropdown && (
                          <div className="absolute right-0 top-full mt-1 z-50 w-40 bg-base-100 border border-base-300 rounded-lg shadow-lg overflow-hidden">
                            <div className="max-h-48 overflow-y-auto p-1">
                              {existingCategories.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-base-content/40 text-center">暂无分类</div>
                              ) : (
                                existingCategories.map((c, idx) => (
                                  <button key={idx} className="w-full text-left px-3 py-1.5 text-xs hover:bg-base-200 rounded transition-colors"
                                    onClick={() => { addCategory(c); setShowCatDropdown(false); }}>
                                    {c}
                                  </button>
                                ))
                              )}
                              <button className="w-full text-left px-3 py-1.5 text-xs text-primary hover:bg-primary/10 rounded transition-colors font-medium"
                                onClick={() => { setShowCatDropdown(false); null }}>
                                + 手动输入新分类
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={post.draft || false}
                      onChange={(e) => updateField('draft', e.target.checked)} />
                    <span className="text-sm text-base-content/80">隐藏此文章（草稿）</span>
                  </label>
                </div>
              </div>
            </div>
        </div>
      </div>

      {/* 编辑器 */}
      <div className="bg-base-100 rounded-xl border border-base-300 overflow-hidden p-4" style={{ minHeight: 'calc(100vh - 500px)' }}>
        <MarkdownEditorToggle value={post.content} onChange={(v) => updateField('content', v)} codeTheme={codeTheme} />
      </div>
    </div>
  )
}
