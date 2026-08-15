import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseOAuthCallback } from '@/lib/oauth'
import { useAuthStore } from '@/stores/auth-store'

export function OAuthCallback() {
  const [error, setError] = useState('')
  const { setToken, checkAuth } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const result = parseOAuthCallback()
    if (!result) {
      setError('未收到授权信息')
      return
    }

    if (result.error) {
      setError(`授权失败: ${result.error}`)
      return
    }

    if (result.accessToken) {
      setToken(result.accessToken)
      checkAuth().then(() => {
        navigate('/dashboard', { replace: true })
      })
    }
  }, [setToken, checkAuth, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="text-center">
        {error ? (
          <div className="space-y-4">
            <div className="text-error text-xl">😞 登录失败</div>
            <p className="text-base-content/60">{error}</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/login')}
            >
              返回登录
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <span className="loading loading-spinner loading-lg text-primary" />
            <p className="text-base-content/60">正在验证身份...</p>
          </div>
        )}
      </div>
    </div>
  )
}