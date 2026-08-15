import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { readYamlFile, saveYamlFile } from '@/lib/content-service'
import { CONTENT_PATHS } from '@/config'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Save, FileText, Link, FolderGit2, Compass, Images, Music } from 'lucide-react'
import { toast } from 'sonner'

interface ModuleTitleData {
  title: string
  subtitle: string
}

interface ModuleEntry {
  key: string
  label: string
  configPath: string
  icon: string
  title: string
  subtitle: string
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  FileText, Link, FolderGit2, Compass, Images, Music,
}

const MODULE_DEFS = [
  { key: 'blog', label: '博客', configPath: CONTENT_PATHS.blogConfig, icon: 'FileText' },
  { key: 'friends', label: '友链', configPath: CONTENT_PATHS.friendsConfig, icon: 'Link' },
  { key: 'project', label: '项目', configPath: CONTENT_PATHS.projectsConfig, icon: 'FolderGit2' },
  { key: 'navigation', label: '导航', configPath: CONTENT_PATHS.navigationConfig, icon: 'Compass' },
  { key: 'album', label: '相册', configPath: CONTENT_PATHS.albumConfig, icon: 'Images' },
  { key: 'music', label: '音乐', configPath: CONTENT_PATHS.musicConfig, icon: 'Music' },
]

export function ModuleTitlesPage() {
  const { token } = useAuthStore()
  const [modules, setModules] = useState<ModuleEntry[]>(
    MODULE_DEFS.map((m) => ({ ...m, title: '', subtitle: '' }))
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    const loadAll = async () => {
      const results = await Promise.all(
        MODULE_DEFS.map(async (mod) => {
          try {
            const data = await readYamlFile<ModuleTitleData>(token, mod.configPath)
            return {
              ...mod,
              title: data?.title || '',
              subtitle: data?.subtitle || '',
            }
          } catch {
            return { ...mod, title: '', subtitle: '' }
          }
        })
      )
      setModules(results)
      setLoading(false)
    }
    loadAll()
  }, [token])

  const handleSaveAll = async () => {
    if (!token) return
    setSaving(true)
    try {
      // 逐个保存，每个模块独立提交
      for (const mod of modules) {
        // 先读取完整配置，只更新 title/subtitle
        const existing = await readYamlFile<Record<string, unknown>>(token, mod.configPath)
        const data = existing || {}
        data.title = mod.title
        data.subtitle = mod.subtitle
        await saveYamlFile(
          token,
          mod.configPath,
          data,
          `feat(config): update ${mod.label} title/subtitle`
        )
      }
      toast.success('所有模块标题已保存')
    } catch (e: any) {
      toast.error('保存失败: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner text="加载模块标题..." />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">模块标题管理</h1>
        <button
          className="btn btn-primary btn-sm gap-1"
          onClick={handleSaveAll}
          disabled={saving}
        >
          {saving ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          全部保存
        </button>
      </div>

      <p className="text-sm text-base-content/60">
        统一管理博客、友链、项目、导航、相册、音乐模块的标题和副标题。
      </p>

      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body p-6">
          <div className="space-y-4">
            {modules.map((mod) => {
              const IconComp = iconMap[mod.icon]
              return (
                <div
                  key={mod.key}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-base-200/50 rounded-xl"
                >
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {IconComp && <IconComp className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                    <div className="form-control">
                      <label className="label py-1">
                        <span className="label-text text-xs font-medium text-base-content/60">
                          {mod.label} - 标题
                        </span>
                      </label>
                      <input
                        className="input input-bordered input-sm"
                        value={mod.title}
                        onChange={(e) => {
                          const next = modules.map((m) =>
                            m.key === mod.key ? { ...m, title: e.target.value } : m
                          )
                          setModules(next)
                        }}
                        placeholder={`输入${mod.label}模块标题`}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label py-1">
                        <span className="label-text text-xs font-medium text-base-content/60">
                          {mod.label} - 副标题
                        </span>
                      </label>
                      <input
                        className="input input-bordered input-sm"
                        value={mod.subtitle}
                        onChange={(e) => {
                          const next = modules.map((m) =>
                            m.key === mod.key ? { ...m, subtitle: e.target.value } : m
                          )
                          setModules(next)
                        }}
                        placeholder={`输入${mod.label}模块副标题`}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}