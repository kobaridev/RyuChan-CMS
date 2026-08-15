import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { listAlbums, saveAlbum, createAlbum, uploadImage, deleteAlbum } from '@/lib/content-service'
import { resolveImageUrl } from '@/lib/image-url'
import { SafeImage } from '@/components/shared/SafeImage'
import { IconPicker } from '@/components/shared/IconPicker'
import { ImageField } from '@/components/shared/ImageField'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Plus, Edit, Trash2, Images, Save, X, ImageIcon } from 'lucide-react'
import { Icon } from '@iconify/react'
import type { Album, Photo } from '@/types'
import { toast } from 'sonner'

const emptyAlbum: Album = { date: '', title: '', description: '', icon: '', photos: [], event: '' }

export function AlbumPage() {
  const { token } = useAuthStore()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Album | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Album | null>(null)

  const load = async () => {
    if (!token) return
    setLoading(true)
    try { setAlbums(await listAlbums(token)) }
    catch (e: any) { toast.error('加载失败: ' + e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [token])

  const handleSave = async () => {
    if (!token || !editing) return
    if (!editing.title.trim()) { toast.error('请输入标题'); return }
    setSaving(true)
    try {
      if (isNew) {
        await createAlbum(token, editing)
      } else {
        await saveAlbum(token, editing)
      }
      toast.success(isNew ? '相册已创建' : '相册已保存')
      setEditing(null)
      setIsNew(false)
      load()
    } catch (e: any) { toast.error('保存失败: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!token || !deleteTarget) return
    setSaving(true)
    try {
      await deleteAlbum(token, deleteTarget._filePath!, deleteTarget.title)
      toast.success(`已删除 "${deleteTarget.title}"`)
      setDeleteTarget(null)
      load()
    } catch (e: any) { toast.error('删除失败: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleUpload = async (file: File): Promise<string> => {
    if (!token) throw new Error('未登录')
    return uploadImage(token, file)
  }

  const addPhoto = () => {
    if (!editing) return
    setEditing({ ...editing, photos: [...editing.photos, { src: '', variant: '1x1', title: '', description: '' }] })
  }

  const removePhoto = (idx: number) => {
    if (!editing) return
    const photos = [...editing.photos]
    photos.splice(idx, 1)
    setEditing({ ...editing, photos })
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">相册管理</h1>
        <button className="btn btn-primary btn-sm gap-1" onClick={() => { setEditing({ ...emptyAlbum }); setIsNew(true) }}>
          <Plus className="w-4 h-4" /> 新建相册
        </button>
      </div>

      {albums.length === 0 ? (
        <EmptyState icon={<Images className="w-16 h-16" />} title="还没有相册" description='点击"新建相册"开始' />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map((album) => (
            <div key={album._filePath} className="card bg-base-100 shadow-sm border border-base-300 hover:border-primary/20 transition-all group">
              <div className="card-body p-4 cursor-pointer" onClick={() => { setEditing({ ...album }); setIsNew(false) }}>
                <div className="flex items-center gap-2">
                  {album.icon && (
                    album.icon.startsWith('ri:') || album.icon.startsWith('lucide:') || album.icon.startsWith('simple-icons:') || album.icon.startsWith('iconfont:') || album.icon.includes(':') ? (
                      <div className="w-8 h-8 rounded-lg bg-base-300 flex items-center justify-center">
                        <Icon icon={album.icon} className="w-5 h-5" />
                      </div>
                    ) : (
                      <span className="text-2xl">{album.icon}</span>
                    )
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{album.title}</h3>
                    {album.event && <p className="text-xs text-base-content/50">{album.event}</p>}
                  </div>
                  <button className="btn btn-ghost btn-xs btn-square text-error opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setDeleteTarget(album) }} title="删除">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {album.description && <p className="text-sm text-base-content/60 mt-2">{album.description}</p>}
                <div className="flex items-center gap-2 text-xs text-base-content/40 mt-2">
                  <span>{album.date}</span>
                  <span>·</span>
                  <span>{album.photos?.length || 0} 张照片</span>
                </div>
                {album.photos?.length > 0 && (
                  <div className="grid grid-cols-4 gap-1 mt-2">
                    {album.photos.slice(0, 4).map((p, i) => (
                      <SafeImage key={i} src={p.src} alt="" className="w-full aspect-square object-cover rounded" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑弹窗 */}
      {editing && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">{isNew ? '新建相册' : '编辑相册'}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-sm font-medium">标题 *</span></label>
                  <input className="input input-bordered input-sm" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                </div>
                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-sm font-medium">日期</span></label>
                  <input type="date" className="input input-bordered input-sm" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-sm font-medium">事件名</span></label>
                  <input className="input input-bordered input-sm" value={editing.event || ''} onChange={(e) => setEditing({ ...editing, event: e.target.value })} />
                </div>
                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-sm font-medium text-base-content/70">图标 (Iconify / Emoji)</span></label>
                  <div className="flex items-center gap-2">
                    {editing.icon && (
                      editing.icon.includes(':') ? (
                        <div className="w-8 h-8 rounded-lg bg-base-300 flex items-center justify-center shrink-0">
                          <Icon icon={editing.icon} className="w-5 h-5" />
                        </div>
                      ) : (
                        <span className="text-2xl shrink-0">{editing.icon}</span>
                      )
                    )}
                    <div className="flex-1">
                      <IconPicker value={editing.icon || ''} onChange={(v) => setEditing({ ...editing, icon: v })} placeholder="搜索图标或输入 emoji" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-sm font-medium">描述</span></label>
                <textarea className="textarea textarea-bordered textarea-sm" rows={2} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>

              {/* 照片管理 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">照片 ({editing.photos?.length || 0})</span>
                  <button className="btn btn-ghost btn-xs gap-1" onClick={addPhoto}>
                    <Plus className="w-3 h-3" /> 添加照片
                  </button>
                </div>
                <div className="space-y-2">
                  {editing.photos?.map((photo, idx) => (
                    <div key={idx} className="flex gap-2 items-start p-2 bg-base-200/50 rounded-lg">
                      {photo.src && (
                        <SafeImage src={photo.src} alt="" className="w-16 h-16 object-cover rounded" />
                      )}
                      {!photo.src && (
                        <div className="w-16 h-16 bg-base-300 rounded flex items-center justify-center shrink-0">
                          <ImageIcon className="w-6 h-6 text-base-content/20" />
                        </div>
                      )}
                      <div className="flex-1 space-y-1">
                        <input className="input input-bordered input-xs w-full" placeholder="图片 URL" value={photo.src} onChange={(e) => {
                          const photos = [...editing.photos]
                          photos[idx] = { ...photos[idx], src: e.target.value }
                          setEditing({ ...editing, photos })
                        }} />
                        <div className="flex gap-1">
                          <input className="input input-bordered input-xs flex-1" placeholder="标题" value={photo.title || ''} onChange={(e) => {
                            const photos = [...editing.photos]
                            photos[idx] = { ...photos[idx], title: e.target.value }
                            setEditing({ ...editing, photos })
                          }} />
                          <select className="select select-bordered select-xs w-20" value={photo.variant} onChange={(e) => {
                            const photos = [...editing.photos]
                            photos[idx] = { ...photos[idx], variant: e.target.value as Photo['variant'] }
                            setEditing({ ...editing, photos })
                          }}>
                            <option value="1x1">1:1</option>
                            <option value="4x3">4:3</option>
                            <option value="4x5">4:5</option>
                            <option value="9x16">9:16</option>
                          </select>
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-xs btn-square text-error" onClick={() => removePhoto(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(null); setIsNew(false) }}><X className="w-4 h-4" /> 取消</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="w-4 h-4" />} 保存
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => { setEditing(null); setIsNew(false) }}><button className="cursor-default">close</button></div>
        </div>
      )}

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除相册"
        message={`确定要删除相册「${deleteTarget?.title}」吗？此操作不可撤销。`}
        confirmLabel={saving ? '删除中...' : '确认删除'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}