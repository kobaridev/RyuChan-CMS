import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useStagingStore } from '@/stores/staging-store'
import { listNavigation, saveNavigationCategory, createNavigationCategory, deleteNavigationCategory, uploadImage } from '@/lib/content-service'
import { loadWithCache } from '@/stores/cache-store'
import { resolveImageUrl } from '@/lib/image-url'
import { SafeImage } from '@/components/shared/SafeImage'
import { IconPicker } from '@/components/shared/IconPicker'
import { ImageField } from '@/components/shared/ImageField'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Plus, Edit, Trash2, Compass, Save, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Icon } from '@iconify/react'
import type { NavigationCategory, NavigationItem } from '@/types'
import { toast } from 'sonner'

const emptyItem: NavigationItem = { name: '', url: '', avatar: '', description: '', category: '', id: '', badge: '', badgeIcon: '', badgeColor: '' }

export function NavigationPage() {
  const { token } = useAuthStore()
  const addChange = useStagingStore(s => s.addChange)
  const [categories, setCategories] = useState<NavigationCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editingCategory, setEditingCategory] = useState<NavigationCategory | null>(null)
  const [isNewCategory, setIsNewCategory] = useState(false)
  const [editingItem, setEditingItem] = useState<{ item: NavigationItem; catIdx: number; itemIdx: number } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ category: NavigationCategory } | null>(null)

  const load = async () => {
    if (!token) return
    setLoading(true)
    try { setCategories(await loadWithCache('navigation', token, listNavigation)) }
    catch (e: any) { toast.error('加载失败: ' + e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [token])

  const handleSaveCategory = async () => {
    if (!token || !editingCategory) return
    if (!editingCategory.category.trim()) { toast.error('请输入分组名称'); return }
    setSaving(true)
    try {
      if (isNewCategory) {
        addChange({ module: 'navigation', title: `新建导航分组「${editingCategory.category}」`, action: 'create', serviceFunc: 'createNavigationCategory', args: [editingCategory], commitMessage: `feat(navigation): add category "${editingCategory.category}"`, sourceRoute: '/navigation' })
      } else {
        addChange({ module: 'navigation', title: `更新导航分组「${editingCategory.category}」`, action: 'update', serviceFunc: 'saveNavigationCategory', args: [editingCategory], commitMessage: `feat(navigation): update category "${editingCategory.category}"`, sourceRoute: '/navigation' })
      }
      toast.success('已暂存')
      setEditingCategory(null)
      setIsNewCategory(false)
      load()
    } catch (e: any) { toast.error('暂存失败: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleDeleteCategory = async () => {
    if (!token || !deleteTarget) return
    setSaving(true)
    try {
      addChange({ module: 'navigation', title: `删除导航分组「${deleteTarget.category.category}」`, action: 'delete', serviceFunc: 'deleteNavigationCategory', args: [deleteTarget.category._filePath!, deleteTarget.category.category], commitMessage: `feat(navigation): delete category "${deleteTarget.category.category}"`, sourceRoute: '/navigation' })
      toast.success('已暂存')
      setDeleteTarget(null)
      load()
    } catch (e: any) { toast.error('暂存失败: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleSaveItem = async () => {
    if (!token || !editingItem) return
    const { item, catIdx, itemIdx } = editingItem
    const newCategories = [...categories]
    if (itemIdx >= 0) {
      newCategories[catIdx].navigations[itemIdx] = item
    } else {
      newCategories[catIdx].navigations.push(item)
    }
    setSaving(true)
    try {
      addChange({ module: 'navigation', title: `更新导航条目「${item.name}」`, action: 'update', serviceFunc: 'saveNavigationCategory', args: [newCategories[catIdx]], commitMessage: `feat(navigation): update items in "${newCategories[catIdx].category}"` })
      toast.success('已暂存')
      setEditingItem(null)
      load()
    } catch (e: any) { toast.error('暂存失败: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleDeleteItem = async (catIdx: number, itemIdx: number) => {
    if (!token) return
    const newCategories = [...categories]
    const deletedItem = newCategories[catIdx].navigations[itemIdx]
    newCategories[catIdx].navigations.splice(itemIdx, 1)
    setSaving(true)
    try {
      addChange({ module: 'navigation', title: `删除导航条目「${deletedItem.name}」`, action: 'update', serviceFunc: 'saveNavigationCategory', args: [newCategories[catIdx]], commitMessage: `feat(navigation): remove item "${deletedItem.name}" from "${newCategories[catIdx].category}"` })
      toast.success('已暂存')
      load()
    } catch (e: any) { toast.error('暂存失败: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleUpload = async (file: File): Promise<string> => {
    if (!token) throw new Error('未登录')
    return uploadImage(token, file)
  }

  const toggleExpand = (cat: string) => {
    const next = new Set(expanded)
    if (next.has(cat)) next.delete(cat); else next.add(cat)
    setExpanded(next)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">导航管理</h1>
        <button className="btn btn-primary btn-sm gap-1" onClick={() => {
          setEditingCategory({ category: '', icon: '', navigations: [], _filePath: undefined })
          setIsNewCategory(true)
        }}>
          <Plus className="w-4 h-4" /> 新建分组
        </button>
      </div>

      {categories.length === 0 ? (
        <EmptyState icon={<Compass className="w-16 h-16" />} title="还没有导航分组" description='点击"新建分组"开始' />
      ) : (
        <div className="space-y-3">
          {categories.map((cat, catIdx) => (
            <div key={cat._filePath} className="card bg-base-100 shadow-sm border border-base-300">
              <div className="card-body p-4">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(cat.category)}>
                  <div className="flex items-center gap-2">
                    {expanded.has(cat.category) ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    <h3 className="font-semibold">{cat.icon} {cat.category}</h3>
                    <span className="badge badge-sm">{cat.navigations?.length || 0} 条</span>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); setEditingCategory({ ...cat }); setIsNewCategory(false) }}>
                      <Edit className="w-3 h-3" />
                    </button>
                    <button className="btn btn-ghost btn-xs text-error" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ category: cat }) }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {expanded.has(cat.category) && (
                  <div className="mt-3 space-y-2">
                    <button
                      className="btn btn-ghost btn-xs gap-1 w-full"
                      onClick={() => setEditingItem({ item: { ...emptyItem, category: cat.category }, catIdx, itemIdx: -1 })}
                    >
                      <Plus className="w-3 h-3" /> 添加站点
                    </button>
                    {cat.navigations?.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex items-center gap-3 p-2 bg-base-200/50 rounded-lg">
                        {item.avatar && <SafeImage src={item.avatar} alt="" className="w-8 h-8 rounded-lg" />}
                        {item.badgeIcon && !item.avatar && (
                          <div className="w-8 h-8 rounded-lg bg-base-300 flex items-center justify-center shrink-0">
                            <Icon icon={item.badgeIcon} className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{item.name}</div>
                          <div className="text-xs text-base-content/50 truncate">{item.url}</div>
                        </div>
                        {item.badge && <span className="badge badge-xs">{item.badge}</span>}
                        <button className="btn btn-ghost btn-xs btn-square" onClick={() => setEditingItem({ item: { ...item }, catIdx, itemIdx })}>
                          <Edit className="w-3 h-3" />
                        </button>
                        <button className="btn btn-ghost btn-xs btn-square text-error" onClick={() => handleDeleteItem(catIdx, itemIdx)}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑分组弹窗 */}
      {editingCategory && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">{isNewCategory ? '新建分组' : '编辑分组'}</h3>
            <div className="space-y-3">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-sm font-medium">分组名称 *</span></label>
                <input className="input input-bordered input-sm" value={editingCategory.category} onChange={(e) => setEditingCategory({ ...editingCategory, category: e.target.value })} />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-sm font-medium">图标 (Iconify)</span></label>
                <input className="input input-bordered input-sm" value={editingCategory.icon || ''} onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })} placeholder="lucide:code" />
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditingCategory(null); setIsNewCategory(false) }}><X className="w-4 h-4" /> 取消</button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveCategory} disabled={saving}>
                {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="w-4 h-4" />} 保存
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => { setEditingCategory(null); setIsNewCategory(false) }}><button className="cursor-default">close</button></div>
        </div>
      )}

      {/* 编辑条目弹窗 */}
      {editingItem && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">{editingItem.itemIdx >= 0 ? '编辑站点' : '添加站点'}</h3>
            <div className="space-y-3">
              {/* 头像图片 / icon */}
              <ImageField label="头像" value={editingItem.item.avatar || ''} onChange={(v) => setEditingItem({ ...editingItem, item: { ...editingItem.item, avatar: v } })} size="sm" iconMode onUpload={handleUpload} />
              {/* badge 图标 */}
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-sm font-medium text-base-content/70">badge 图标</span></label>
                <IconPicker value={editingItem.item.badgeIcon || ''} onChange={(v) => setEditingItem({ ...editingItem, item: { ...editingItem.item, badgeIcon: v } })} />
              </div>
              {(['name', 'url', 'description', 'category', 'id', 'badge', 'badgeColor'] as const).map((field) => (
                <div className="form-control" key={field}>
                  <label className="label py-1"><span className="label-text text-sm font-medium text-base-content/70">{field}</span></label>
                  <input
                    className="input input-bordered input-sm"
                    value={editingItem.item[field] || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, [field]: e.target.value } })}
                  />
                </div>
              ))}
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingItem(null)}><X className="w-4 h-4" /> 取消</button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveItem} disabled={saving}>
                {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="w-4 h-4" />} 保存
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setEditingItem(null)}><button className="cursor-default">close</button></div>
        </div>
      )}

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除分组"
        message={`确定要删除分组「${deleteTarget?.category.category}」吗？分组下的所有站点也会被删除。`}
        confirmLabel={saving ? '删除中...' : '确认删除'}
        onConfirm={handleDeleteCategory}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}