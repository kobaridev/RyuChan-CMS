import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useStagingStore } from '@/stores/staging-store'
import {
  listMusicPlaylists, saveYamlFile, createMusicPlaylist, deleteMusicPlaylist, readYamlFile,
  listMusicCustomPlaylists, createMusicCustomPlaylist, saveMusicCustomPlaylist, deleteMusicCustomPlaylist,
} from '@/lib/content-service'
import { CONTENT_PATHS } from '@/config'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Plus, Trash2, Music, Save, X, Globe, Disc } from 'lucide-react'
import type { MusicPlaylist, MusicSong, MusicCustomPlaylist } from '@/types'
import { toast } from 'sonner'

export function MusicPage() {
  const { token } = useAuthStore()
  const addChange = useStagingStore(s => s.addChange)
  const [playlists, setPlaylists] = useState<MusicPlaylist[]>([])
  const [customPlaylists, setCustomPlaylists] = useState<MusicCustomPlaylist[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<MusicPlaylist | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MusicPlaylist | null>(null)
  const [editingCustom, setEditingCustom] = useState<MusicCustomPlaylist | null>(null)
  const [isNewCustom, setIsNewCustom] = useState(false)
  const [deleteCustomTarget, setDeleteCustomTarget] = useState<MusicCustomPlaylist | null>(null)
  const [apiUrl, setApiUrl] = useState('')
  const [savingApi, setSavingApi] = useState(false)

  const load = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [pls, customPls, apiConfig] = await Promise.all([
        listMusicPlaylists(token),
        listMusicCustomPlaylists(token),
        readYamlFile<{ api?: string }>(token, CONTENT_PATHS.musicConfig).catch(() => null),
      ])
      setPlaylists(pls)
      setCustomPlaylists(customPls)
      setApiUrl(apiConfig?.api || '')
    } catch (e: any) { toast.error('加载失败: ' + e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [token])

  // ---- 在线歌单 ----
  const handleSave = async () => {
    if (!token || !editing) return
    if (!editing.name.trim()) { toast.error('请输入歌单名称'); return }
    setSaving(true)
    try {
      if (isNew) addChange({ module: 'music', title: `新建歌单「${editing.name}」`, action: 'create', serviceFunc: 'createMusicPlaylist', args: [editing], commitMessage: `feat(music): add playlist "${editing.name}"` })
      else addChange({ module: 'music', title: `更新歌单「${editing.name}」`, action: 'update', serviceFunc: 'saveYamlFile', args: [editing._filePath!, editing, `feat(music): update playlist "${editing.name}"`], commitMessage: `feat(music): update playlist "${editing.name}"` })
      toast.success('已暂存')
      setEditing(null); setIsNew(false)
      load()
    } catch (e: any) { toast.error('暂存失败: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!token || !deleteTarget) return
    setSaving(true)
    try {
      addChange({ module: 'music', title: `删除歌单「${deleteTarget.name}」`, action: 'delete', serviceFunc: 'deleteMusicPlaylist', args: [deleteTarget._filePath!, deleteTarget.name], commitMessage: `feat(music): delete playlist "${deleteTarget.name}"` })
      toast.success('已暂存')
      setDeleteTarget(null)
      load()
    } catch (e: any) { toast.error('暂存失败: ' + e.message) }
    finally { setSaving(false) }
  }

  const addSong = () => {
    if (!editing) return
    setEditing({ ...editing, songs: [...editing.songs, { index: '', provider: 'netease' }] })
  }

  const handleSaveApi = async () => {
    if (!token) return
    setSavingApi(true)
    try {
      const existing = await readYamlFile<Record<string, unknown>>(token, CONTENT_PATHS.musicConfig)
      const data = existing || {}
      data.api = apiUrl
      addChange({ module: 'music', title: '更新音乐 API 配置', action: 'update', serviceFunc: 'saveYamlFile', args: [CONTENT_PATHS.musicConfig, data, `feat(music): update API config`], commitMessage: `feat(music): update API config` })
      toast.success('已暂存')
    } catch (e: any) { toast.error('暂存失败: ' + e.message) }
    finally { setSavingApi(false) }
  }

  // ---- 自定义歌单 ----
  const handleSaveCustom = async () => {
    if (!token || !editingCustom) return
    if (!editingCustom.name.trim()) { toast.error('请输入歌单名称'); return }
    setSaving(true)
    try {
      if (isNewCustom) addChange({ module: 'music', title: `新建自定义歌单「${editingCustom.name}」`, action: 'create', serviceFunc: 'createMusicCustomPlaylist', args: [editingCustom], commitMessage: `feat(music): add custom playlist "${editingCustom.name}"` })
      else addChange({ module: 'music', title: `更新自定义歌单「${editingCustom.name}」`, action: 'update', serviceFunc: 'saveMusicCustomPlaylist', args: [editingCustom], commitMessage: `feat(music): update custom playlist "${editingCustom.name}"` })
      toast.success('已暂存')
      setEditingCustom(null); setIsNewCustom(false)
      load()
    } catch (e: any) { toast.error('暂存失败: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleDeleteCustom = async () => {
    if (!token || !deleteCustomTarget) return
    setSaving(true)
    try {
      addChange({ module: 'music', title: `删除自定义歌单「${deleteCustomTarget.name}」`, action: 'delete', serviceFunc: 'deleteMusicCustomPlaylist', args: [deleteCustomTarget._filePath!, deleteCustomTarget.name], commitMessage: `feat(music): delete custom playlist "${deleteCustomTarget.name}"` })
      toast.success('已暂存')
      setDeleteCustomTarget(null)
      load()
    } catch (e: any) { toast.error('暂存失败: ' + e.message) }
    finally { setSaving(false) }
  }

  const addCustomSong = () => {
    if (!editingCustom) return
    setEditingCustom({ ...editingCustom, songs: [...editingCustom.songs, { index: '', provider: 'custom', title: '', artist: '', cover: '', url: '' }] })
  }

  // ---- 歌曲输入组件 ----
  const SongInput = ({ label, value, onChange, placeholder, w = '' }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; w?: string
  }) => (
    <div className="form-control">
      <label className="label py-1"><span className="label-text text-xs font-semibold text-base-content/60">{label}</span></label>
      <input
        className={`input input-bordered input-xs w-full bg-base-100 ${w}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">音乐管理</h1>

      {/* API 配置 */}
      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body p-4">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-base-content/50" />
            <div className="form-control flex-1">
              <label className="label py-0"><span className="label-text text-sm font-medium">Meting API 地址</span></label>
              <div className="flex gap-2">
                <input
                  className="input input-bordered input-sm flex-1"
                  placeholder="https://meting.mikus.ink/api"
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

      {/* 在线歌单 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Music className="w-4 h-4" /> 在线歌单
          </h2>
          <button className="btn btn-primary btn-sm gap-1" onClick={() => {
            setEditing({ name: '', songs: [], _filePath: undefined })
            setIsNew(true)
          }}>
            <Plus className="w-3 h-3" /> 新建歌单
          </button>
        </div>
        {playlists.length === 0 ? (
          <EmptyState icon={<Music className="w-16 h-16" />} title="还没有播放列表" description='点击"新建歌单"开始' />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {playlists.map((pl) => (
              <div key={pl._filePath} className="card bg-base-100 shadow-sm border border-base-300 hover:border-primary/20 transition-all group">
                <div className="card-body p-3 cursor-pointer" onClick={() => { setEditing({ ...pl }); setIsNew(false) }}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{pl.name}</h3>
                    <button className="btn btn-ghost btn-xs btn-square text-error opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setDeleteTarget(pl) }} title="删除">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-base-content/50">{pl.songs?.length || 0} 首歌曲</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 自定义歌单 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Disc className="w-4 h-4" /> 自定义歌单
          </h2>
          <button className="btn btn-accent btn-sm gap-1" onClick={() => {
            setEditingCustom({ name: '', songs: [], _filePath: undefined })
            setIsNewCustom(true)
          }}>
            <Plus className="w-3 h-3" /> 新建自定义歌单
          </button>
        </div>
        {customPlaylists.length === 0 ? (
          <EmptyState icon={<Disc className="w-16 h-16" />} title="还没有自定义歌单" description="自定义歌单的数据直接存储在仓库中，无需在线拉取" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customPlaylists.map((pl) => (
              <div key={pl._filePath} className="card bg-base-100 shadow-sm border border-accent/20 hover:border-accent/50 transition-all group">
                <div className="card-body p-3 cursor-pointer" onClick={() => { setEditingCustom({ ...pl }); setIsNewCustom(false) }}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{pl.name}</h3>
                    <button className="btn btn-ghost btn-xs btn-square text-error opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setDeleteCustomTarget(pl) }} title="删除">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-base-content/50">{pl.songs?.length || 0} 首歌曲 · 本地数据</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- 在线歌单编辑弹窗 ---- */}
      {editing && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">{isNew ? '新建歌单' : '编辑歌单'}</h3>
            <div className="space-y-3">
              <SongInput label="歌单名称 *" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} placeholder="例如：我的最爱" />
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
                          songs[idx] = { ...songs[idx], provider: e.target.value as 'netease' | 'tencent' | 'custom' }
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

      {/* ---- 自定义歌单编辑弹窗 ---- */}
      {editingCustom && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">{isNewCustom ? '新建自定义歌单' : '编辑自定义歌单'}</h3>
            <div className="space-y-3">
              <SongInput label="歌单名称 *" value={editingCustom.name} onChange={(v) => setEditingCustom({ ...editingCustom, name: v })} placeholder="例如：周杰伦精选" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">歌曲</span>
                  <button className="btn btn-ghost btn-xs gap-1" onClick={addCustomSong}><Plus className="w-3 h-3" /> 添加</button>
                </div>
                <div className="space-y-2">
                  {editingCustom.songs?.map((song, idx) => (
                    <div key={idx} className="p-2 bg-base-200/50 rounded-lg space-y-2">
                      <div className="flex gap-2 items-center mb-1">
                        <span className="text-xs font-mono text-base-content/30 w-5 shrink-0">#{idx + 1}</span>
                        <SongInput label="歌曲名" value={song.title || ''} onChange={(v) => {
                          const songs = [...editingCustom.songs]; songs[idx] = { ...songs[idx], title: v }; setEditingCustom({ ...editingCustom, songs })
                        }} placeholder="歌曲标题" />
                        <SongInput label="歌手" value={song.artist || ''} onChange={(v) => {
                          const songs = [...editingCustom.songs]; songs[idx] = { ...songs[idx], artist: v }; setEditingCustom({ ...editingCustom, songs })
                        }} placeholder="艺术家" w="w-28" />
                        <button className="btn btn-ghost btn-xs btn-square text-error shrink-0" onClick={() => {
                          const songs = [...editingCustom.songs]; songs.splice(idx, 1); setEditingCustom({ ...editingCustom, songs })
                        }}><Trash2 className="w-3 h-3" /></button>
                      </div>
                      <SongInput label="封面" value={song.cover || ''} onChange={(v) => {
                        const songs = [...editingCustom.songs]; songs[idx] = { ...songs[idx], cover: v }; setEditingCustom({ ...editingCustom, songs })
                      }} placeholder="封面图片 URL" />
                      <SongInput label="音频" value={song.url || ''} onChange={(v) => {
                        const songs = [...editingCustom.songs]; songs[idx] = { ...songs[idx], url: v }; setEditingCustom({ ...editingCustom, songs })
                      }} placeholder="音频文件 URL" />
                      <div className="flex gap-2">
                        <SongInput label="歌词" value={song.lrc || ''} onChange={(v) => {
                          const songs = [...editingCustom.songs]; songs[idx] = { ...songs[idx], lrc: v }; setEditingCustom({ ...editingCustom, songs })
                        }} placeholder="歌词 URL（可选）" />
                        <SongInput label="时长" value={song.duration || ''} onChange={(v) => {
                          const songs = [...editingCustom.songs]; songs[idx] = { ...songs[idx], duration: v }; setEditingCustom({ ...editingCustom, songs })
                        }} placeholder="如 04:59" w="w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditingCustom(null); setIsNewCustom(false) }}><X className="w-4 h-4" /> 取消</button>
              <button className="btn btn-accent btn-sm" onClick={handleSaveCustom} disabled={saving}>
                {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="w-4 h-4" />} 保存
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => { setEditingCustom(null); setIsNewCustom(false) }}><button className="cursor-default">close</button></div>
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="删除歌单"
        message={`确定要删除歌单「${deleteTarget?.name}」吗？此操作不可撤销。`}
        confirmLabel={saving ? '删除中...' : '确认删除'} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      <ConfirmDialog open={!!deleteCustomTarget} title="删除自定义歌单"
        message={`确定要删除自定义歌单「${deleteCustomTarget?.name}」吗？此操作不可撤销。`}
        confirmLabel={saving ? '删除中...' : '确认删除'} onConfirm={handleDeleteCustom} onCancel={() => setDeleteCustomTarget(null)} />
    </div>
  )
}
