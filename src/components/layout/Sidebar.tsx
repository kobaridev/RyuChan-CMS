import {
  LayoutDashboard, FileText, Link, FolderGit2, Compass,
  Images, Music, Settings, User, PanelLeftClose, PanelLeftOpen, Heading
} from 'lucide-react'

interface SidebarProps {
  currentPath: string
  onNavigate: (path: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

const menuItems = [
  { label: '仪表盘', path: '/dashboard', icon: LayoutDashboard },
  {
    label: '内容管理',
    children: [
      { label: '博客文章', path: '/blog', icon: FileText },
      { label: '友链', path: '/friends', icon: Link },
      { label: '项目', path: '/projects', icon: FolderGit2 },
      { label: '导航', path: '/navigation', icon: Compass },
      { label: '相册', path: '/album', icon: Images },
      { label: '音乐', path: '/music', icon: Music },
    ],
  },
  { label: '关于页面', path: '/about', icon: User },
  {
    label: '站点配置',
    children: [
      { label: '站点总配置', path: '/config/site', icon: Settings },
      { label: '模块标题', path: '/config/module-titles', icon: Heading },
      { label: '博客模块', path: '/config/blog', icon: FileText },
      { label: '评论模块', path: '/config/comments', icon: Settings },
      { label: '追番模块', path: '/config/anime', icon: Settings },
      { label: '分析模块', path: '/config/analysis', icon: Settings },
      { label: '页脚配置', path: '/config/footer', icon: Settings },
      { label: 'GitHub 配置', path: '/config/github', icon: GithubIcon },
    ],
  },
]

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

function isActive(currentPath: string, path: string): boolean {
  if (path === '/dashboard') return currentPath === '/dashboard'
  return currentPath.startsWith(path)
}

export function Sidebar({ currentPath, onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside className={`menu min-h-full bg-base-100 border-r border-base-300 p-2 text-base-content transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className={`px-2 mb-4 ${collapsed ? 'flex justify-center' : 'block'}`}>
        {collapsed ? (
          <a className="text-xl font-bold flex items-center justify-center" href="/dashboard">
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        ) : (
          <a className="text-xl font-bold flex items-center gap-2" href="/dashboard">
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span>RyuCMS</span>
          </a>
        )}
      </div>

      {/* 折叠按钮 */}
      <div className="flex justify-end mb-2 hidden lg:flex">
        <button className="btn btn-ghost btn-sm btn-square" onClick={onToggleCollapse} title={collapsed ? '展开侧边栏' : '折叠侧边栏'}>
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      <ul className="space-y-1">
        {menuItems.map((item) => {
          if ('children' in item && item.children) {
            return (
              <li key={item.label}>
                {collapsed ? (
                  <div className="tooltip tooltip-right" data-tip={item.label}>
                    <a className="justify-center px-2">
                      <Settings className="w-5 h-5" />
                    </a>
                  </div>
                ) : (
                  <details open>
                    <summary className="font-semibold text-sm text-base-content/70 list-none [&::after]:hidden">
                      {item.label}
                    </summary>
                    <ul className="mt-1 ml-2">
                      {item.children.map((child) => (
                        <li key={child.path}>
                          <a
                            className={isActive(currentPath, child.path) ? 'active' : ''}
                            onClick={() => onNavigate(child.path)}
                          >
                            <child.icon className="w-4 h-4" />
                            {child.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            )
          }
          return (
            <li key={item.path}>
              {collapsed ? (
                <div className="tooltip tooltip-right" data-tip={item.label}>
                  <a
                    className={`justify-center px-2 ${isActive(currentPath, item.path) ? 'active' : ''}`}
                    onClick={() => onNavigate(item.path)}
                  >
                    <item.icon className="w-5 h-5" />
                  </a>
                </div>
              ) : (
                <a
                  className={isActive(currentPath, item.path) ? 'active' : ''}
                  onClick={() => onNavigate(item.path)}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}