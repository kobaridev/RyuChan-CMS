import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useStagingStore } from '@/stores/staging-store'
import { listFriends, createFriend, deleteFriend, saveFriends, uploadImage } from '@/lib/content-service'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SafeImage } from '@/components/shared/SafeImage'
import { Plus, Edit, Trash2, Link, Save, X, Upload } from 'lucide-react'
import type { Friend } from '@/types'
import { toast } from 'sonner'

const emptyFriend: Friend = { name: '', url: '', avatar: '', description: '', badge: '' }

export function FriendsPage() {
  const { token } = useAuthStore()
  const addChange = useStagingStore(s => s.addChange)
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Friend | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Friend | null>(null)
  const [isNew, setIsNew] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    if (!token) return
    setLoading(true)
    try {
      setFriends(await listFriends(token))
    } catch (e: any) {
      toast.error('加载失败: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [token])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    try {
      const url = await uploadImage(token, file)
      setEditing({ ...editing!, avatar: url })
    } catch (err: any) {
      toast.error('上传失败: ' + err.message)
    }
  }

  const handleSave = async () => {
    if (!token || !editing) return
    if (!editing.name.trim() || !editing.url.trim()) {
      toast.error('名称和链接为必填')
      return
    }
    setSaving(true)
    try {
      if (isNew) {
        addChange({ module: 'friend', title: `新增友链「${editing.name}」`, action: 'create', serviceFunc: 'createFriend', args: [editing], commitMessage: `feat(friends): add friend "${editing.name}"` })
      } else {
        const updated = friends.map((f) =>
          f._filePath === editing._filePath ? editing : f
        )
        addChange({ module: 'friend', title: `更新友链「${editing.name}」`, action: 'update', serviceFunc: 'saveFriends', args: [updated], commitMessage: `feat(friends): update friend "${editing.name}"` })
      }
      toast.success('已暂存')
      setEditing(null)
      setIsNew(false)
      load()
    } catch (e: any) {
      toast.error('暂存失败: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!token || !deleteTarget) return
    try {
      addChange({ module: 'friend', title: `删除友链「${deleteTarget.name}」`, action: 'delete', serviceFunc: 'deleteFriend', args: [deleteTarget._filePath!, deleteTarget.name], commitMessage: `feat(friends): delete friend "${deleteTarget.name}"` })
      toast.success('已暂存')
      setDeleteTarget(null)
      load()
    } catch (e: any) {
      toast.error('暂存失败: ' + e.message)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">友链管理</h1>
        <button
          className="btn btn-primary btn-sm gap-1"
          onClick={() => { setEditing({ ...emptyFriend }); setIsNew(true) }}
        >
          <Plus className="w-4 h-4" /> 添加友链
        </button>
      </div>

      {friends.length === 0 ? (
        <EmptyState icon={<Link className="w-16 h-16" />} title="还没有友链" description='点击"添加友链"开始' />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {friends.map((friend) => (
            <div key={friend._filePath} className="card bg-base-100 shadow-sm border border-base-300">
              <div className="card-body p-4">
                <div className="flex items-center gap-3">
                  {friend.avatar && (
                    <img src={friend.avatar} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{friend.name}</h3>
                    <p className="text-xs text-base-content/50 truncate">{friend.url}</p>
                  </div>
                </div>
                {friend.description && (
                  <p className="text-sm text-base-content/60 mt-2">{friend.description}</p>
                )}
                {friend.badge && (
                  <span className="badge badge-sm mt-1">{friend.badge}</span>
                )}
                <div className="card-actions justify-end mt-2">
                  <button
                    className="btn btn-ghost btn-xs btn-square"
                    onClick={() => { setEditing({ ...friend }); setIsNew(false) }}
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                  <button
                    className="btn btn-ghost btn-xs btn-square text-error"
                    onClick={() => setDeleteTarget(friend)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑弹窗 */}
      {editing && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">{isNew ? '添加友链' : '编辑友链'}</h3>
            <div className="space-y-3">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-sm font-medium">name *</span></label>
                <input className="input input-bordered input-sm" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-sm font-medium">url *</span></label>
                <input className="input input-bordered input-sm" value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-sm font-medium">avatar</span></label>
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-base-200 ring-2 ring-base-100 shadow-md flex items-center justify-center shrink-0">
                    {editing.avatar ? (
                      <SafeImage src={editing.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-6 h-6 text-base-content/20" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
                    <div className="flex gap-1">
                      <input type="text" className="input input-bordered input-sm flex-1 text-xs"
                        value={editing.avatar || ''} onChange={(e) => setEditing({ ...editing, avatar: e.target.value })}
                        placeholder="输入图片 URL" />
                      {editing.avatar && (
                        <button type="button" className="btn btn-ghost btn-xs btn-square" onClick={() => setEditing({ ...editing, avatar: '' })}>
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <button type="button" className="btn btn-ghost btn-xs gap-1 self-start" onClick={() => fileRef.current?.click()}>
                      <Upload className="w-3 h-3" /> 上传图片
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </div>
                </div>
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-sm font-medium">description</span></label>
                <textarea className="textarea textarea-bordered textarea-sm" rows={2} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-sm font-medium">badge</span></label>
                <input className="input input-bordered input-sm" value={editing.badge || ''} onChange={(e) => setEditing({ ...editing, badge: e.target.value })} />
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>
                <X className="w-4 h-4" /> 取消
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="w-4 h-4" />}
                保存
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setEditing(null)}>
            <button className="cursor-default">close</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除友链"
        message={`确定要删除「${deleteTarget?.name}」吗？`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}