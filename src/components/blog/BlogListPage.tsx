import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useStagingStore } from '@/stores/staging-store'
import { listBlogPosts, deleteBlogPost } from '@/lib/content-service'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Plus, Edit, Trash2, Search, FileText, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Icon } from '@iconify/react'
import type { BlogPost } from '@/types'
import { toast } from 'sonner'

export function BlogListPage() {
  const { token } = useAuthStore()
  const addChange = useStagingStore(s => s.addChange)
  const navigate = useNavigate()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadPosts = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await listBlogPosts(token)
      setPosts(data)
    } catch (e: any) {
      toast.error('加载文章失败: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [token])

  const handleDelete = async () => {
    if (!token || !deleteTarget) return
    setDeleting(true)
    try {
      addChange({ module: 'blog', title: `删除文章「${deleteTarget.title}」`, action: 'delete', serviceFunc: 'deleteBlogPost', args: [deleteTarget.filePath, deleteTarget.title], commitMessage: `feat(blog): delete post "${deleteTarget.title}"` })
      toast.success('已暂存')
      setPosts(posts.filter((p) => p.filePath !== deleteTarget.filePath))
      setDeleteTarget(null)
    } catch (e: any) {
      toast.error('暂存失败: ' + e.message)
    } finally {
      setDeleting(false)
    }
  }

  const filteredPosts = posts.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q)) ||
      p.categories?.some((c) => c.toLowerCase().includes(q))
    )
  })

  const getWordCount = (content: string) => {
    // 统计中文字符数 + 英文单词数
    const chinese = (content.match(/[\u4e00-\u9fff]/g) || []).length
    const english = (content.match(/[a-zA-Z]+/g) || []).length
    return chinese + english
  }

  const getReadTime = (content: string) => {
    return Math.max(1, Math.ceil(getWordCount(content) / 300))
  }

  if (loading) return <LoadingSpinner text="加载文章列表..." />

  return (
    <div className="space-y-4">
      {/* 顶栏 */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">博客文章</h1>
        <button
          className="btn btn-primary btn-sm gap-1"
          onClick={() => navigate('/blog/new')}
        >
          <Plus className="w-4 h-4" /> 新建文章
        </button>
      </div>

      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30" />
        <input
          type="text"
          className="input input-bordered w-full pl-10"
          placeholder="搜索文章标题、描述、标签..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 列表 */}
      {filteredPosts.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-16 h-16" />}
          title={search ? '没有找到匹配的文章' : '还没有文章'}
          description={search ? '试试其他关键词' : '点击"新建文章"开始写作'}
          action={
            !search && (
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/blog/new')}>
                <Plus className="w-4 h-4" /> 新建文章
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => {
            const wordCount = getWordCount(post.content)
            const readTime = getReadTime(post.content)

            const PostCardContent = (
              <div className="hidden lg:flex flex-row min-h-32 h-auto">
                {/* 内容区 */}
                <div className="flex-1 p-5 order-1 flex flex-col justify-between overflow-hidden">
                  <div className="overflow-hidden">
                    <div className="mb-2 flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg truncate">{post.title}</h3>
                      {post.draft ? (
                        <span className="badge badge-warning badge-sm gap-1">
                          <EyeOff className="w-3 h-3" /> 草稿
                        </span>
                      ) : (
                        <span className="badge badge-success badge-sm gap-1">
                          <Eye className="w-3 h-3" /> 已发布
                        </span>
                      )}
                      <span className="badge badge-outline badge-sm">{post.fileFormat}</span>
                      {post.badge && <span className="badge badge-sm">{post.badge}</span>}
                    </div>

                    <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm text-base-content/60 mb-3 opacity-75">
                      {post.pubDate && (
                        <span className="flex items-center gap-1">
                          <Icon icon="lucide:calendar" className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{post.pubDate}</span>
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        <Icon icon="lucide:book-open" className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{wordCount} 字 · {readTime} 分钟</span>
                      </div>
                      {post.badge && (
                        <span className="flex items-center gap-1">
                          <Icon icon="lucide:bookmark" className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{post.badge}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-base-content/60 mb-3 line-clamp-2">{post.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {post.categories?.map((c) => (
                      <span key={c} className="badge badge-xs bg-base-200">{c}</span>
                    ))}
                    {post.tags?.map((t) => (
                      <span key={t} className="badge badge-xs badge-outline">#{t}</span>
                    ))}
                  </div>
                </div>
                {/* 图片区 */}
                {post.image && (
                  <div className="relative w-2/5 lg:w-2/5 lg:aspect-auto overflow-hidden order-2 group">
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 z-10 transition-all duration-300 flex items-center justify-center">
                      <ArrowRight className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-2" />
                    </div>
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                )}
              </div>
            )

            return (
              <div
                key={post.filePath}
                className="card bg-base-100 shadow-sm border border-base-300 hover:shadow-lg transition-shadow overflow-hidden group"
              >
                {/* 移动端 */}
                <div className="flex flex-col w-full lg:hidden">
                  {post.image && (
                    <div className="relative w-full aspect-video overflow-hidden">
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 z-10 transition-all duration-300 flex items-center justify-center">
                        <ArrowRight className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-2" />
                      </div>
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    </div>
                  )}
                  <div className="p-4 overflow-hidden flex flex-col">
                    <div className="mb-2 flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg truncate">{post.title}</h3>
                      {post.draft ? (
                        <span className="badge badge-warning badge-sm gap-1"><EyeOff className="w-3 h-3" /> 草稿</span>
                      ) : (
                        <span className="badge badge-success badge-sm gap-1"><Eye className="w-3 h-3" /> 已发布</span>
                      )}
                      <span className="badge badge-outline badge-sm">{post.fileFormat}</span>
                      {post.badge && <span className="badge badge-sm">{post.badge}</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-base-content/60 mb-2 opacity-75">
                      {post.pubDate && (
                        <span className="flex items-center gap-1">
                          <Icon icon="lucide:calendar" className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{post.pubDate}</span>
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        <Icon icon="lucide:book-open" className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{wordCount} 字 · {readTime} 分钟</span>
                      </div>
                      {post.badge && (
                        <span className="flex items-center gap-1">
                          <Icon icon="lucide:bookmark" className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{post.badge}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-base-content/60 mb-3 line-clamp-2">{post.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {post.categories?.map((c) => (
                        <span key={c} className="badge badge-xs bg-base-200">{c}</span>
                      ))}
                      {post.tags?.map((t) => (
                        <span key={t} className="badge badge-xs badge-outline">#{t}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 桌面端 */}
                {PostCardContent}

                {/* 操作按钮 */}
                <div className="absolute top-3 right-3 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="btn btn-ghost btn-sm btn-square bg-base-100/80"
                    onClick={(e) => { e.stopPropagation(); navigate(`/blog/${post.slug}/edit`) }}
                    title="编辑"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm btn-square bg-base-100/80 text-error"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(post) }}
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* 点击跳转编辑 */}
                <button
                  className="absolute inset-0 z-0"
                  onClick={() => navigate(`/blog/${post.slug}/edit`)}
                  title="编辑文章"
                />
              </div>
            )
          })}
        </div>
      )}

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除文章"
        message={`确定要删除「${deleteTarget?.title}」吗？此操作不可撤销。`}
        confirmLabel={deleting ? '删除中...' : '确认删除'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}