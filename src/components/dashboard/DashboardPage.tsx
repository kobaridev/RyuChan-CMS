import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { getRepoInfo } from '@/lib/github-client'
import { CMS_CONFIG } from '@/config'
import { FileText, Link, FolderGit2, Compass, Images, Music } from 'lucide-react'

export function DashboardPage() {
  const { token } = useAuthStore()
  const [repoInfo, setRepoInfo] = useState<{ description: string; default_branch: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    getRepoInfo(token, CMS_CONFIG.CONTENT_OWNER, CMS_CONFIG.CONTENT_REPO)
      .then(setRepoInfo)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [token])

  const modules = [
    { label: '博客文章', path: '/blog', icon: FileText, desc: '管理 Markdown/MDX 文章' },
    { label: '友链', path: '/friends', icon: Link, desc: '管理友情链接' },
    { label: '项目', path: '/projects', icon: FolderGit2, desc: '管理项目展示' },
    { label: '导航', path: '/navigation', icon: Compass, desc: '管理网站导航' },
    { label: '相册', path: '/album', icon: Images, desc: '管理照片相册' },
    { label: '音乐', path: '/music', icon: Music, desc: '管理音乐播放列表' },
  ]

  return (
    <div className="space-y-6">
      {/* 仓库信息 */}
      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body">
          <h2 className="card-title text-lg">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            内容仓库
          </h2>
          {loading ? (
            <div className="flex items-center gap-2">
              <span className="loading loading-spinner loading-sm" />
              <span className="text-base-content/50">加载中...</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm bg-base-200 px-2 py-0.5 rounded">
                  {CMS_CONFIG.CONTENT_OWNER}/{CMS_CONFIG.CONTENT_REPO}
                </span>
                <span className="badge badge-sm">{CMS_CONFIG.CONTENT_BRANCH}</span>
              </div>
              {repoInfo?.description && (
                <p className="text-base-content/60 text-sm">{repoInfo.description}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 功能模块 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod) => (
          <a
            key={mod.path}
            href={mod.path}
            className="card bg-base-100 shadow-sm border border-base-300 hover:shadow-md hover:border-primary/30 transition-all"
            onClick={(e) => {
              e.preventDefault()
              window.location.hash = mod.path
            }}
          >
            <div className="card-body p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <mod.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{mod.label}</h3>
                  <p className="text-xs text-base-content/50">{mod.desc}</p>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}