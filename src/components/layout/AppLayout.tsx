import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Menu } from 'lucide-react'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="drawer lg:drawer-open">
      <input
        id="sidebar-drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={sidebarOpen}
        onChange={(e) => setSidebarOpen(e.target.checked)}
      />

      {/* 主内容区 */}
      <div className="drawer-content flex flex-col min-h-screen">
        {/* 顶栏 */}
        <Header
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />

        {/* 页面内容 */}
        <main className="flex-1 p-4 md:p-6 overflow-auto bg-base-200/50">
          <Outlet />
        </main>
      </div>

      {/* 侧边栏 */}
      <div className="drawer-side z-40">
        <label htmlFor="sidebar-drawer" className="drawer-overlay" />
        <Sidebar
          currentPath={location.pathname}
          onNavigate={(path) => {
            navigate(path)
            setSidebarOpen(false)
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </div>
    </div>
  )
}