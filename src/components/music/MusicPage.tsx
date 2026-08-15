import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { listMusicPlaylists, saveYamlFile, createMusicPlaylist, deleteMusicPlaylist, readYamlFile } from '@/lib/content-service'
import { CONTENT_PATHS } from '@/config'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Plus, Trash2, Music, Save, X, Globe } from 'lucide-react'
import type { MusicPlaylist, MusicSong } from '@/types'
import { toast } from 'sonner'

export function MusicPage() {
  const { token } = useAuthStore()
  const [playlists, setPlaylists] = useState<MusicPlaylist[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<MusicPlaylist | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MusicPlaylist | null>(null)
  const [apiUrl, setApiUrl] = useState('')
  const [savingApi, setSavingApi] = useState(false)

  const load = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [pls, apiConfig] = await Promise.all([
        listMusicPlaylists(token),
        readYamlFile<{ api?: string }>(token, CONTENT_PATHS.musicConfig).catch(() => null),
      ])
      setPlaylists(pls)
      setApiUrl(apiConfig?.api || '')
    } catch (e: any) { toast.error('加载失败: ' + e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [token])

  const handleSave = async () => {
    if (!token || !editing) return
    if (!editing.name.trim()) { toast.error('请输入歌单名称'); return }
    setSaving(true)
    try {
      if (isNew) {
        await createMusicPlaylist(token, editing)
      } else {
        await saveYamlFile(token, editing._filePath!, editing, `feat(music): update playlist "${editing.name}"`)
      }
      toast.success(isNew ? '歌单已创建' : '歌单已保存')
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
      await deleteMusicPlaylist(token, deleteTarget._filePath!, deleteTarget.name)
      toast.success(`已删除 "${deleteTarget.name}"`)
      setDeleteTarget(null)
      load()
    } catch (e: any) { toast.error('删除失败: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleSaveApi = async () => {
    if (!token) return
    setSavingApi(true)
    try {
      const existing = await readYamlFile<Record<string, unknown>>(token, CONTENT_PATHS.musicConfig)
      const data = existing || {}
      data.api = apiUrl
      await saveYamlFile(token, CONTENT_PATHS.musicConfig, data, `feat(music): update API config`)
      toast.success('API 配置已保存')
    } catch (e: any) { toast.error('保存失败: ' + e.message) }
    finally { setSavingApi(false) }
  }

  const addSong = () => {
    if (!editing) return
    setEditing({ ...editing, songs: [...editing.songs, { index: '', provider: 'netease' }] })
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">音乐管理</h1>
        <button className="btn btn-primary btn-sm gap-1" onClick={() => {
          setEditing({ name: '', songs: [], _filePath: undefined })
          setIsNew(true)
        }}>
          <Plus className="w-4 h-4" /> 新建歌单
        </button>
      </div>

      {/* API 配置 */}
      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body p-4">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-base-content/50" />
            <div className="form-control flex-1">
              <label className="label py-0"><span className="label-text text-sm font-medium">音乐 API 地址</span></label>
              <div className="flex gap-2">
                <input
                  className="input input-bordered input-sm flex-1"
                  placeholder="https://163.hyc.moe"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveApi}
                  disabled={savingApi}
                >
                  {savingApi ? <span className="loading loading-spinner loading-sm" /> : <Save className="w-4 h-4" />}
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {playlists.length === 0 ? (
        <EmptyState icon={<Music className="w-16 h-16" />} title="还没有播放列表" description='点击"新建歌单"开始' />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {playlists.map((pl) => (
            <div key={pl._filePath} className="card bg-base-100 shadow-sm border border-base-300 hover:border-primary/20 transition-all group">
              <div className="card-body p-4 cursor-pointer" onClick={() => { setEditing({ ...pl }); setIsNew(false) }}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{pl.name}</h3>
                  <button className="btn btn-ghost btn-xs btn-square text-error opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setDeleteTarget(pl) }} title="删除">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-sm text-base-content/50">{pl.songs?.length || 0} 首歌曲</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑弹窗 */}
      {editing && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">{isNew ? '新建歌单' : '编辑歌单'}</h3>
            <div className="space-y-3">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-sm font-medium">名称 *</span></label>
                <input className="input input-bordered input-sm" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">歌曲</span>
                  <button className="btn btn-ghost btn-xs gap-1" onClick={addSong}><Plus className="w-3 h-3" /> 添加</button>
                </div>
                <div className="space-y-2">
                  {editing.songs?.map((song, idx) => (
                    <div key={idx} className="p-2 bg-base-200/50 rounded-lg space-y-2">
                      <div className="flex gap-2 items-center">
                        <input className="input input-bordered input-xs flex-1" placeholder="歌单 ID" value={song.index} onChange={(e) => {
                          const songs = [...editing.songs]
                          songs[idx] = { ...songs[idx], index: e.target.value }
                          setEditing({ ...editing, songs })
                        }} />
                        <select className="select select-bordered select-xs w-28" value={song.provider} onChange={(e) => {
                          const songs = [...editing.songs]
                          songs[idx] = { ...songs[idx], provider: e.target.value }
                          setEditing({ ...editing, songs })
                        }}>
                          <option value="netease">网易云</option>
                          <option value="tencent">QQ音乐</option>
                          <option value="custom">自定义</option>
                        </select>
                        <button className="btn btn-ghost btn-xs btn-square text-error" onClick={() => {
                          const songs = [...editing.songs]
                          songs.splice(idx, 1)
                          setEditing({ ...editing, songs })
                        }}><Trash2 className="w-3 h-3" /></button>
                      </div>
                      {/* 自定义歌单字段 */}
                      {song.provider === 'custom' && (
                        <div className="grid grid-cols-2 gap-2 p-2 bg-base-300/30 rounded">
                          <input className="input input-bordered input-xs" placeholder="歌曲标题" value={song.customTitle || ''} onChange={(e) => {
                            const songs = [...editing.songs]
                            songs[idx] = { ...songs[idx], customTitle: e.target.value }
                            setEditing({ ...editing, songs })
                          }} />
                          <input className="input input-bordered input-xs" placeholder="艺术家" value={song.customArtist || ''} onChange={(e) => {
                            const songs = [...editing.songs]
                            songs[idx] = { ...songs[idx], customArtist: e.target.value }
                            setEditing({ ...editing, songs })
                          }} />
                          <input className="input input-bordered input-xs col-span-2" placeholder="封面 URL" value={song.customCover || ''} onChange={(e) => {
                            const songs = [...editing.songs]
                            songs[idx] = { ...songs[idx], customCover: e.target.value }
                            setEditing({ ...editing, songs })
                          }} />
                          <input className="input input-bordered input-xs col-span-2" placeholder="音频 URL" value={song.customUrl || ''} onChange={(e) => {
                            const songs = [...editing.songs]
                            songs[idx] = { ...songs[idx], customUrl: e.target.value }
                            setEditing({ ...editing, songs })
                          }} />
                        </div>
                      )}
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
        title="删除歌单"
        message={`确定要删除歌单「${deleteTarget?.name}」吗？此操作不可撤销。`}
        confirmLabel={saving ? '删除中...' : '确认删除'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}