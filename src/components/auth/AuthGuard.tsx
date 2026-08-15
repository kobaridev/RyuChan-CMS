import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { getStoredToken } from '@/lib/oauth'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuth, isLoading, checkAuth, logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // 监听 401 事件
  useEffect(() => {
    const handler = () => {
      logout()
      navigate('/login')
    }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [logout, navigate])

  useEffect(() => {
    if (!isLoading && !isAuth) {
      navigate('/login')
    }
  }, [isAuth, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    )
  }

  if (!isAuth) {
    return null
  }

  return <>{children}</>
}