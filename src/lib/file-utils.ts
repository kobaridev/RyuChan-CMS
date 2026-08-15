import { toBase64Utf8, createBlob } from '@/lib/github-client'
import { CMS_CONFIG } from '@/config'

// 文件内容哈希（用于去重）
export async function hashFileSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// 文件转 Base64（无前缀）
export function fileToBase64NoPrefix(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // 去掉 data:xxx;base64, 前缀
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 读取文件为文本
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

// 获取文件扩展名
export function getFileExt(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.substring(lastDot) : ''
}

// 获取文件名（不含扩展名）
export function getFileName(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.substring(0, lastDot) : filename
}

// 上传图片到 GitHub（返回 Blob SHA）
export async function uploadImageToGitHub(
  token: string,
  file: File,
  path: string
): Promise<{ sha: string; path: string }> {
  const contentBase64 = await fileToBase64NoPrefix(file)
  const blob = await createBlob(token, CMS_CONFIG.CONTENT_OWNER, CMS_CONFIG.CONTENT_REPO, contentBase64, 'base64')
  return { sha: blob.sha, path }
}

// 生成 slug
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'untitled'
}