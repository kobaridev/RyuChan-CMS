import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { isRelativeUrl, resolveImageUrl, resolveRepoPath, fetchImageViaApi } from '@/lib/image-url'

interface SafeImageProps {
  src: string | undefined | null
  alt?: string
  className?: string
  /** 加载失败时隐藏图片（默认 true） */
  hideOnError?: boolean
  /** 加载中的占位符 */
  fallback?: React.ReactNode
}

/**
 * 安全图片组件
 * 
 * 自动处理 public/private 仓库的图片加载：
 * 1. 绝对 URL（http/https）→ 直接渲染
 * 2. 相对路径 → 先尝试 raw.githubusercontent.com（public 仓库）
 * 3. 加载失败 → 通过 GitHub API 获取（支持 private 仓库）
 * 4. 结果缓存，避免重复请求
 */
export function SafeImage({ src, alt = '', className = '', hideOnError = true, fallback }: SafeImageProps) {
  const { token } = useAuthStore()
  const imgRef = useRef<HTMLImageElement>(null)
  const [displaySrc, setDisplaySrc] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!src) {
      setDisplaySrc('')
      setLoading(false)
      return
    }

    // 绝对 URL：直接使用
    if (!isRelativeUrl(src)) {
      setDisplaySrc(src)
      setLoading(false)
      return
    }

    // 相对路径：先尝试 raw URL
    const rawUrl = resolveImageUrl(src)
    setDisplaySrc(rawUrl)
    setLoading(false)
  }, [src])

  // 处理加载失败 → 通过 GitHub API 获取
  const handleError = async () => {
    if (!src || !isRelativeUrl(src) || !token) {
      if (hideOnError && imgRef.current) {
        imgRef.current.style.display = 'none'
      }
      return
    }

    // 已经尝试过 API 了，不再重试
    if (displaySrc.startsWith('data:')) {
      if (hideOnError && imgRef.current) {
        imgRef.current.style.display = 'none'
      }
      return
    }

    setLoading(true)
    try {
      const repoPath = resolveRepoPath(src)
      const dataUrl = await fetchImageViaApi(token, repoPath)
      if (mountedRef.current) {
        setDisplaySrc(dataUrl)
        setLoading(false)
      }
    } catch {
      if (mountedRef.current) {
        setLoading(false)
        if (hideOnError && imgRef.current) {
          imgRef.current.style.display = 'none'
        }
      }
    }
  }

  if (!src) return null

  return (
    <>
      {displaySrc && (
        <img
          ref={imgRef}
          src={displaySrc}
          alt={alt}
          className={className}
          onError={handleError}
        />
      )}
      {loading && fallback && fallback}
      {loading && !fallback && (
        <div className={`${className} bg-base-200 flex items-center justify-center`}>
          <span className="loading loading-spinner loading-sm text-primary/50" />
        </div>
      )}
    </>
  )
}