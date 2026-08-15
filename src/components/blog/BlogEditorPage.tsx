import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { getBlogPost, saveBlogPost, uploadImage } from '@/lib/content-service'
import { resolveImageUrl } from '@/lib/image-url'
import { ImageField } from '@/components/shared/ImageField'
import { MarkdownEditorToggle } from '@/components/shared/MarkdownEditorToggle'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ArrowLeft, Save, FileText } from 'lucide-react'
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
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const isEdit = !!slug

  const [post, setPost] = useState<BlogPost>(emptyPost)
  const [originalFilePath, setOriginalFilePath] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token || !isEdit) return
    setLoading(true)
    getBlogPost(token, slug!)
      .then((data) => {
        if (data) { setPost(data); setOriginalFilePath(data.filePath) }
        else { toast.error('文章不存在'); navigate('/blog') }
      })
      .catch((e) => toast.error('加载文章失败: ' + e.message))
      .finally(() => setLoading(false))
  }, [token, slug, isEdit, navigate])

  const handleSave = async () => {
    if (!token) return
    if (!post.title.trim()) { toast.error('请输入文章标题'); return }
    if (!post.slug.trim()) {
      const s = post.title.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '')
      setPost({ ...post, slug: s })
    }
    setSaving(true)
    try {
      await saveBlogPost(token, post, isEdit ? 'edit' : 'create', originalFilePath)
      toast.success(isEdit ? '文章已更新' : '文章已发布')
      navigate('/blog')
    } catch (e: any) { toast.error('保存失败: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleUpload = async (file: File): Promise<string> => {
    if (!token) throw new Error('未登录')
    return uploadImage(token, file)
  }

  const updateField = (field: keyof BlogPost, value: unknown) => {
    setPost({ ...post, [field]: value })
  }

  if (loading) return <LoadingSpinner text="加载文章..." />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
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

      {/* 两栏布局：表单 + 编辑器 */}
      <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: 'calc(100vh - 180px)' }}>
        {/* 左栏：Frontmatter 表单 */}
        <div className="w-full lg:w-72 shrink-0 bg-base-100 rounded-xl border border-base-300 overflow-y-auto p-4 space-y-3">
          <h3 className="font-semibold text-sm text-base-content/60">文章属性</h3>

          <div className="form-control w-full">
            <label className="label py-1"><span className="label-text text-sm font-medium text-base-content/70">标题 <span className="text-error">*</span></span></label>
            <input type="text" className="input input-bordered input-sm w-full" value={post.title} onChange={(e) => updateField('title', e.target.value)} placeholder="文章标题" />
          </div>
          <div className="form-control w-full">
            <label className="label py-1"><span className="label-text text-sm font-medium text-base-content/70">Slug</span></label>
            <input type="text" className="input input-bordered input-sm w-full font-mono text-xs" value={post.slug} onChange={(e) => updateField('slug', e.target.value)} placeholder="自动生成" />
          </div>
          <div className="form-control w-full">
            <label className="label py-1"><span className="label-text text-sm font-medium text-base-content/70">描述 <span className="text-error">*</span></span></label>
            <textarea className="textarea textarea-bordered textarea-sm w-full" rows={2} value={post.description} onChange={(e) => updateField('description', e.target.value)} placeholder="文章摘要" />
          </div>
          <div className="form-control w-full">
            <label className="label py-1"><span className="label-text text-sm font-medium text-base-content/70">发布日期</span></label>
            <input type="text" className="input input-bordered input-sm w-full" value={post.pubDate} onChange={(e) => updateField('pubDate', e.target.value)} placeholder="YYYY-MM-DD" />
          </div>

          {/* 封面图 */}
          <ImageField label="封面图" value={post.image || ''} onChange={(v) => updateField('image', v)} size="sm" onUpload={handleUpload} />

          <div className="form-control w-full">
            <label className="label py-1"><span className="label-text text-sm font-medium text-base-content/70">角标</span></label>
            <input type="text" className="input input-bordered input-sm w-full" value={post.badge || ''} onChange={(e) => updateField('badge', e.target.value)} placeholder="如: Markdown" />
          </div>
          <div className="form-control w-full">
            <label className="label py-1"><span className="label-text text-sm font-medium text-base-content/70">文件格式</span></label>
            <select className="select select-bordered select-sm w-full" value={post.fileFormat} onChange={(e) => updateField('fileFormat', e.target.value)}>
              <option value="md">Markdown (.md)</option>
              <option value="mdx">MDX (.mdx)</option>
            </select>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer py-1">
              <span className="label-text text-sm font-medium text-base-content/70">草稿</span>
              <input type="checkbox" className="toggle toggle-sm toggle-primary" checked={post.draft || false} onChange={(e) => updateField('draft', e.target.checked)} />
            </label>
          </div>

          {/* 分类 */}
          <div className="form-control w-full">
            <label className="label py-1"><span className="label-text text-sm font-medium text-base-content/70">分类</span></label>
            <div className="flex flex-wrap gap-1 mb-2">
              {(post.categories || []).map((cat, idx) => (
                <span key={idx} className="badge badge-primary badge-sm gap-1">{cat}
                  <button className="hover:text-error" onClick={() => { const a = [...(post.categories || [])]; a.splice(idx, 1); updateField('categories', a) }}>×</button>
                </span>
              ))}
            </div>
            <input type="text" className="input input-bordered input-sm w-full" placeholder="输入后按回车添加"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (v) { updateField('categories', [...(post.categories || []), v]); (e.target as HTMLInputElement).value = '' } } }} />
          </div>

          {/* 标签 */}
          <div className="form-control w-full">
            <label className="label py-1"><span className="label-text text-sm font-medium text-base-content/70">标签</span></label>
            <div className="flex flex-wrap gap-1 mb-2">
              {(post.tags || []).map((tag, idx) => (
                <span key={idx} className="badge badge-secondary badge-sm gap-1">{tag}
                  <button className="hover:text-error" onClick={() => { const a = [...(post.tags || [])]; a.splice(idx, 1); updateField('tags', a) }}>×</button>
                </span>
              ))}
            </div>
            <input type="text" className="input input-bordered input-sm w-full" placeholder="输入后按回车添加"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (v) { updateField('tags', [...(post.tags || []), v]); (e.target as HTMLInputElement).value = '' } } }} />
          </div>
        </div>

        {/* 右栏：Markdown 编辑器 */}
        <div className="flex-1 bg-base-100 rounded-xl border border-base-300 overflow-hidden p-4">
          <MarkdownEditorToggle value={post.content} onChange={(v) => updateField('content', v)} minHeight="calc(100vh - 260px)" />
        </div>
      </div>
    </div>
  )
}