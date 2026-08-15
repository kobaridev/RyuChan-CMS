import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { redirectToGitHubOAuth } from '@/lib/oauth'
import { CMS_CONFIG } from '@/config'
import { useAuthStore } from '@/stores/auth-store'
import { Code2 } from 'lucide-react'

export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [patMode, setPatMode] = useState(false)
  const [patToken, setPatToken] = useState('')
  const [error, setError] = useState('')
  const { isAuth, setToken, checkAuth } = useAuthStore()
  const navigate = useNavigate()

  // 如果已登录，跳转
  if (isAuth) {
    navigate('/dashboard', { replace: true })
    return null
  }

  const handleOAuthLogin = async () => {
    if (!CMS_CONFIG.GITHUB_CLIENT_ID) {
      setPatMode(true)
      setError('OAuth 未配置，请使用 Personal Access Token 登录')
      return
    }
    setLoading(true)
    try {
      await redirectToGitHubOAuth()
    } catch {
      setLoading(false)
      setError('跳转 GitHub 授权失败')
    }
  }

  const handlePATLogin = async () => {
    if (!patToken.trim()) {
      setError('请输入 Personal Access Token')
      return
    }
    setLoading(true)
    setError('')
    try {
      setToken(patToken.trim())
      await checkAuth()
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Token 无效，请检查')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-2xl">
        <div className="card-body items-center text-center gap-6 p-8">
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Code2 className="w-8 h-8 text-primary" />
          </div>

          <div>
            <h1 className="text-2xl font-bold">RyuChanCMS</h1>
            <p className="text-base-content/60 mt-1">内容管理后台</p>
          </div>

          {error && (
            <div className="alert alert-error text-sm">
              <span>{error}</span>
            </div>
          )}

          {!patMode ? (
            <>
              <button
                className="btn btn-primary btn-wide gap-2"
                onClick={handleOAuthLogin}
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <Code2 className="w-5 h-5" />
                )}
                使用 GitHub 登录
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPatMode(true)}
              >
                使用 Personal Access Token
              </button>
            </>
          ) : (
            <>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-medium">Personal Access Token</span>
                </label>
                <input
                  type="password"
                  value={patToken}
                  onChange={(e) => setPatToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="input input-bordered w-full font-mono text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handlePATLogin()}
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/50">
                    需要 <code className="text-xs bg-base-200 px-1 rounded">repo</code> 权限
                  </span>
                </label>
              </div>
              <div className="flex gap-2 w-full">
                <button
                  className="btn btn-ghost flex-1"
                  onClick={() => { setPatMode(false); setError('') }}
                >
                  返回
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={handlePATLogin}
                  disabled={loading}
                >
                  {loading ? <span className="loading loading-spinner loading-sm" /> : '登录'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}