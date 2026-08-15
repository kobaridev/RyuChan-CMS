import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { listProjects, createProject, deleteProject, saveYamlFile } from '@/lib/content-service'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Plus, Edit, Trash2, FolderGit2, Save, X } from 'lucide-react'
import type { Project } from '@/types'
import { toast } from 'sonner'

const emptyProject: Project = { name: '', url: '', avatar: '', description: '', badge: '' }

// 注意: saveProjects is not exported from content-service, let's use individual save
export function ProjectsPage() {
  const { token } = useAuthStore()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [isNew, setIsNew] = useState(false)

  const load = async () => {
    if (!token) return
    setLoading(true)
    try {
      setProjects(await listProjects(token))
    } catch (e: any) {
      toast.error('加载失败: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [token])

  const handleSave = async () => {
    if (!token || !editing) return
    if (!editing.name.trim() || !editing.url.trim()) {
      toast.error('名称和链接为必填')
      return
    }
    setSaving(true)
    try {
      if (isNew) {
        await createProject(token, editing)
      } else {
        // For update, save each project individually
        await saveYamlFile(token, editing._filePath!, { name: editing.name, url: editing.url, avatar: editing.avatar, description: editing.description, badge: editing.badge }, `feat(project): update project "${editing.name}"`)
      }
      toast.success(isNew ? '项目已添加' : '项目已更新')
      setEditing(null)
      load()
    } catch (e: any) {
      toast.error('保存失败: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!token || !deleteTarget) return
    try {
      await deleteProject(token, deleteTarget._filePath!, deleteTarget.name)
      toast.success(`已删除 "${deleteTarget.name}"`)
      setDeleteTarget(null)
      load()
    } catch (e: any) {
      toast.error('删除失败: ' + e.message)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">项目管理</h1>
        <button className="btn btn-primary btn-sm gap-1" onClick={() => { setEditing({ ...emptyProject }); setIsNew(true) }}>
          <Plus className="w-4 h-4" /> 添加项目
        </button>
      </div>

      {projects.length === 0 ? (
        <EmptyState icon={<FolderGit2 className="w-16 h-16" />} title="还没有项目" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p._filePath} className="card bg-base-100 shadow-sm border border-base-300">
              <div className="card-body p-4">
                <div className="flex items-center gap-3">
                  {p.avatar && <img src={p.avatar} alt="" className="w-12 h-12 rounded-xl object-cover" />}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{p.name}</h3>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary truncate block">{p.url}</a>
                  </div>
                </div>
                {p.description && <p className="text-sm text-base-content/60 mt-2">{p.description}</p>}
                {p.badge && <span className="badge badge-sm mt-1">{p.badge}</span>}
                <div className="card-actions justify-end mt-2">
                  <button className="btn btn-ghost btn-xs btn-square" onClick={() => { setEditing({ ...p }); setIsNew(false) }}><Edit className="w-3 h-3" /></button>
                  <button className="btn btn-ghost btn-xs btn-square text-error" onClick={() => setDeleteTarget(p)}><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">{isNew ? '添加项目' : '编辑项目'}</h3>
            <div className="space-y-3">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-sm font-medium">名称 *</span></label>
                <input className="input input-bordered input-sm" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-sm font-medium">链接 *</span></label>
                <input className="input input-bordered input-sm" value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-sm font-medium">图标 URL</span></label>
                <input className="input input-bordered input-sm" value={editing.avatar || ''} onChange={(e) => setEditing({ ...editing, avatar: e.target.value })} />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-sm font-medium">描述</span></label>
                <textarea className="textarea textarea-bordered textarea-sm" rows={2} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-sm font-medium">分类标签</span></label>
                <input className="input input-bordered input-sm" value={editing.badge || ''} onChange={(e) => setEditing({ ...editing, badge: e.target.value })} />
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}><X className="w-4 h-4" /> 取消</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="w-4 h-4" />} 保存
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setEditing(null)}><button className="cursor-default">close</button></div>
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="删除项目" message={`确定要删除「${deleteTarget?.name}」吗？`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}