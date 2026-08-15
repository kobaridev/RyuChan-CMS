import { CMS_CONFIG } from '@/config'

const { CONTENT_OWNER, CONTENT_REPO, CONTENT_BRANCH } = CMS_CONFIG

/**
 * 内容仓库的 raw 文件访问基础 URL（public 仓库可用）
 * 格式: https://raw.githubusercontent.com/{owner}/{repo}/{branch}/
 */
const RAW_BASE = `https://raw.githubusercontent.com/${CONTENT_OWNER}/${CONTENT_REPO}/${CONTENT_BRANCH}/`

/**
 * 判断 URL 是否为相对路径（不以 http:// https:// // 开头）
 */
export function isRelativeUrl(url: string): boolean {
  return !/^(https?:)?\/\//i.test(url)
}

/**
 * 已知的内容仓库文件映射
 * 配置文件中的路径 → 内容仓库中的实际路径
 */
const KNOWN_FILE_MAP: Record<string, string> = {
  '/logo.png': 'assets/brand/logo.png',
  '/favicon.ico': 'assets/brand/favicon.ico',
  '/profile.png': 'assets/brand/profile.png',
  '/home.webp': 'assets/brand/home.webp',
  '/WeChat.jpg': 'assets/brand/qrcode/WeChat.jpg',
  '/Alipay.jpg': 'assets/brand/qrcode/Alipay.jpg',
}

/**
 * 路径前缀映射：/image/ → assets/media/
 * 博客文章等使用的图片路径前缀
 */
const PATH_PREFIX_MAP: Array<[string, string]> = [
  ['/image/', 'assets/media/'],
  ['image/', 'assets/media/'],
]

const QR_KEYWORDS = ['wechat', 'alipay', 'qr', 'qrcode', 'wx', 'zfb']

/**
 * 将相对路径映射为内容仓库中的实际路径
 * 不添加 raw URL 前缀，返回纯仓库路径
 * @param url 图片 URL（可能为相对路径）
 * @param basePath 文件所在路径（用于解析 ./ 相对路径）
 */
export function resolveRepoPath(url: string | undefined | null, basePath?: string): string {
  if (!url) return ''

  if (KNOWN_FILE_MAP[url]) {
    return KNOWN_FILE_MAP[url]
  }

  const path = url.replace(/^\/+/, '')

  // 前缀匹配：/image/xxx → assets/media/xxx
  for (const [prefix, replacement] of PATH_PREFIX_MAP) {
    if (url.startsWith(prefix)) {
      return replacement + url.substring(prefix.length)
    }
  }

  // 如果是 ./ 或 ../ 开头的相对路径，基于 basePath 解析
  if (basePath && (path.startsWith('./') || path.startsWith('../'))) {
    const dir = basePath.substring(0, basePath.lastIndexOf('/'))
    const parts = dir.split('/')
    const relParts = path.split('/')
    for (const part of relParts) {
      if (part === '..') {
        parts.pop()
      } else if (part !== '.') {
        parts.push(part)
      }
    }
    return parts.join('/')
  }

  const filename = path.split('/').pop()?.toLowerCase() || ''

  if (QR_KEYWORDS.some(k => filename.includes(k))) {
    return `assets/brand/qrcode/${filename}`
  }

  if (!path.includes('/')) {
    return `assets/brand/${path}`
  }

  return path
}

/**
 * 将相对路径的图片 URL 解析为完整 URL（public 仓库 raw URL）
 * 如果是绝对 URL 则直接返回
 * @param url 图片 URL
 * @param basePath 文件所在路径（用于解析 ./ 相对路径）
 */
export function resolveImageUrl(url: string | undefined | null, basePath?: string): string {
  if (!url) return ''
  if (!isRelativeUrl(url)) return url
  return `${RAW_BASE}${resolveRepoPath(url, basePath)}`
}

// ========== Private 仓库支持 ==========

/** 内存缓存：repoPath → dataURL */
const imageCache = new Map<string, string>()

/**
 * 通过 GitHub Contents API 获取图片内容，返回 data URL
 * 适用于 private 仓库或 raw.githubusercontent.com 无法访问的情况
 * 
 * GitHub API: GET /repos/{owner}/{repo}/contents/{path}
 * 返回 base64 编码的内容
 */
export async function fetchImageViaApi(token: string, repoPath: string): Promise<string> {
  const cached = imageCache.get(repoPath)
  if (cached) return cached

  const res = await fetch(
    `https://api.github.com/repos/${CONTENT_OWNER}/${CONTENT_REPO}/contents/${encodeURIComponent(repoPath)}?ref=${CONTENT_BRANCH}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  )

  if (!res.ok) {
    throw new Error(`GitHub API fetch failed: ${res.status}`)
  }

  const data: { content?: string; encoding?: string } = await res.json()
  if (!data.content) {
    throw new Error('No content in response')
  }

  // base64 → data URL（自动检测 MIME type）
  const ext = repoPath.split('.').pop()?.toLowerCase() || 'png'
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    bmp: 'image/bmp',
  }
  const mime = mimeMap[ext] || 'image/png'
  const dataUrl = `data:${mime};base64,${data.content.replace(/\n/g, '')}`

  // 缓存（简单实现，不设过期时间）
  imageCache.set(repoPath, dataUrl)

  return dataUrl
}

/**
 * 清除图片缓存（在登出或切换仓库时调用）
 */
export function clearImageCache(): void {
  imageCache.clear()
}

/** 生成 img onError 的 React 属性 */
export function imgErrorHide() {
  return {
    onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
      (e.target as HTMLImageElement).style.display = 'none'
    },
  }
}