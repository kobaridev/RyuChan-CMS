import { useState } from 'react'
import { Menu, LogOut, Archive } from 'lucide-react'
import { useStagingStore } from '@/stores/staging-store'
import { StagingPanel } from './StagingPanel'
import type { GitHubUser } from '@/types'

interface HeaderProps {
  user: GitHubUser | null
  onMenuClick: () => void
  onLogout: () => void
}

export function Header({ user, onMenuClick, onLogout }: HeaderProps) {
  const [showStagingPanel, setShowStagingPanel] = useState(false)
  const changeCount = useStagingStore((s) => s.changes.length)

  return (
    <header className="navbar bg-base-100 border-b border-base-300 px-4 sticky top-0 z-30">
      <div className="flex-none lg:hidden">
        <button className="btn btn-ghost btn-square" onClick={onMenuClick}>
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1">
        <a className="text-xl font-bold flex items-center gap-2" href="/dashboard">
          <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          <span>RyuChanCMS</span>
        </a>
      </div>

      <div className="flex-none gap-2">
        {/* 暂存区按钮 */}
        <button
          className="btn btn-ghost btn-sm gap-1 relative"
          onClick={() => setShowStagingPanel(true)}
          title="暂存区"
        >
          <Archive className="w-4 h-4" />
          {changeCount > 0 && (
            <span className="absolute -top-1 -right-1 badge badge-primary badge-xs px-1">
              {changeCount > 99 ? '99+' : changeCount}
            </span>
          )}
        </button>

        {user && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-sm">
              <div className="font-semibold">{user.name || user.login}</div>
              <div className="text-base-content/50 text-xs">@{user.login}</div>
            </div>
            <div className="avatar">
              <div className="w-9 h-9 rounded-full ring ring-primary/20">
                <img src={user.avatar_url} alt={user.login} />
              </div>
            </div>
          </div>
        )}
        <button
          className="btn btn-ghost btn-sm gap-1"
          onClick={onLogout}
          title="退出登录"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">退出</span>
        </button>
      </div>

      {/* 暂存面板 */}
      {showStagingPanel && <StagingPanel onClose={() => setShowStagingPanel(false)} />}
    </header>
  )
}