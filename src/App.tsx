import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { LoginPage } from '@/components/auth/LoginPage'
import { OAuthCallback } from '@/components/auth/OAuthCallback'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/components/dashboard/DashboardPage'
import { BlogListPage } from '@/components/blog/BlogListPage'
import { BlogEditorPage } from '@/components/blog/BlogEditorPage'
import { NavigationPage } from '@/components/navigation/NavigationPage'
import { AlbumPage } from '@/components/album/AlbumPage'
import { FriendsPage } from '@/components/friends/FriendsPage'
import { ProjectsPage } from '@/components/projects/ProjectsPage'
import { MusicPage } from '@/components/music/MusicPage'
import { SiteConfigPage } from '@/components/config/SiteConfigPage'
import { ModuleConfigPage } from '@/components/config/ModuleConfigPage'
import { ModuleTitlesPage } from '@/components/config/ModuleTitlesPage'
import { AboutPage } from '@/components/about/AboutPage'

export default function App() {
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <>
      <Toaster
        richColors
        position="top-center"
        toastOptions={{
          className: 'shadow-xl rounded-2xl',
          style: { fontSize: '0.95rem', padding: '12px 18px', borderRadius: '12px' },
          duration: 4000,
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/blog" element={<BlogListPage />} />
          <Route path="/blog/new" element={<BlogEditorPage />} />
          <Route path="/blog/:slug/edit" element={<BlogEditorPage />} />
          <Route path="/navigation" element={<NavigationPage />} />
          <Route path="/album" element={<AlbumPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/music" element={<MusicPage />} />
          <Route path="/config/site" element={<SiteConfigPage />} />
          <Route path="/config/module-titles" element={<ModuleTitlesPage />} />
          <Route path="/config/:module" element={<ModuleConfigPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}