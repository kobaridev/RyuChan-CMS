// GitHub API 客户端（适配 OAuth token）
import { toast } from 'sonner'

export const GH_API = 'https://api.github.com'

function handle401Error(): void {
  toast.error('登录已过期，请重新登录')
  // 触发自定义事件，由 AuthGuard 监听处理
  window.dispatchEvent(new CustomEvent('auth:unauthorized'))
}

function handle422Error(): void {
  toast.error('操作太快了，请稍后再试')
}

export function toBase64Utf8(input: string): string {
  return btoa(unescape(encodeURIComponent(input)))
}

export async function getRef(token: string, owner: string, repo: string, ref: string): Promise<{ sha: string }> {
  const res = await fetch(`${GH_API}/repos/${owner}/${repo}/git/ref/${encodeURIComponent(ref)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (res.status === 401) handle401Error()
  if (res.status === 422) handle422Error()
  if (!res.ok) throw new Error(`get ref failed: ${res.status}`)
  const data = await res.json()
  return { sha: data.object.sha }
}

export async function getCommit(token: string, owner: string, repo: string, sha: string): Promise<{ tree: { sha: string } }> {
  const res = await fetch(`${GH_API}/repos/${owner}/${repo}/git/commits/${sha}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (res.status === 401) handle401Error()
  if (res.status === 422) handle422Error()
  if (!res.ok) throw new Error(`get commit failed: ${res.status}`)
  const data = await res.json()
  return data
}

export type TreeItem = {
  path: string
  mode: '100644' | '100755' | '040000' | '160000' | '120000'
  type: 'blob' | 'tree' | 'commit'
  content?: string
  sha?: string | null
}

export async function createTree(token: string, owner: string, repo: string, tree: TreeItem[], baseTree?: string): Promise<{ sha: string }> {
  const res = await fetch(`${GH_API}/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tree, base_tree: baseTree }),
  })
  if (res.status === 401) handle401Error()
  if (res.status === 422) handle422Error()
  if (!res.ok) throw new Error(`create tree failed: ${res.status}`)
  const data = await res.json()
  return { sha: data.sha }
}

export async function createCommit(token: string, owner: string, repo: string, message: string, tree: string, parents: string[]): Promise<{ sha: string }> {
  const res = await fetch(`${GH_API}/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, tree, parents }),
  })
  if (res.status === 401) handle401Error()
  if (res.status === 422) handle422Error()
  if (!res.ok) throw new Error(`create commit failed: ${res.status}`)
  const data = await res.json()
  return { sha: data.sha }
}

export async function updateRef(token: string, owner: string, repo: string, ref: string, sha: string, force = false): Promise<void> {
  const res = await fetch(`${GH_API}/repos/${owner}/${repo}/git/refs/${encodeURIComponent(ref)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sha, force }),
  })
  if (res.status === 401) handle401Error()
  if (res.status === 422) handle422Error()
  if (!res.ok) throw new Error(`update ref failed: ${res.status}`)
}

export async function readTextFileFromRepo(token: string, owner: string, repo: string, path: string, ref: string): Promise<string | null> {
  const res = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}&t=${Date.now()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  })
  if (res.status === 401) handle401Error()
  if (res.status === 422) handle422Error()
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`read file failed: ${res.status}`)
  const data: any = await res.json()
  if (Array.isArray(data) || !data.content) return null
  try {
    return decodeURIComponent(escape(atob(data.content)))
  } catch {
    return atob(data.content)
  }
}

export async function getFileSha(token: string, owner: string, repo: string, path: string, branch: string): Promise<string | undefined> {
  const res = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (res.status === 401) handle401Error()
  if (res.status === 422) handle422Error()
  if (res.status === 404) return undefined
  if (!res.ok) throw new Error(`get file sha failed: ${res.status}`)
  const data = await res.json()
  return (data && data.sha) || undefined
}

export async function listRepoFilesRecursive(token: string, owner: string, repo: string, path: string, ref: string): Promise<string[]> {
  async function fetchPath(targetPath: string): Promise<string[]> {
    const res = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(targetPath)}?ref=${encodeURIComponent(ref)}&t=${Date.now()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store',
    })
    if (res.status === 401) handle401Error()
    if (res.status === 422) handle422Error()
    if (res.status === 404) return []
    if (!res.ok) throw new Error(`read directory failed: ${res.status}`)
    const data: any = await res.json()
    if (Array.isArray(data)) {
      const files: string[] = []
      for (const item of data) {
        if (item.type === 'file') {
          files.push(item.path)
        } else if (item.type === 'dir') {
          const nested = await fetchPath(item.path)
          files.push(...nested)
        }
      }
      return files
    }
    if (data?.type === 'file') return [data.path]
    if (data?.type === 'dir') return fetchPath(data.path)
    return []
  }
  return fetchPath(path)
}

export async function createBlob(token: string, owner: string, repo: string, content: string, encoding: 'utf-8' | 'base64' = 'base64'): Promise<{ sha: string }> {
  const res = await fetch(`${GH_API}/repos/${owner}/${repo}/git/blobs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content, encoding }),
  })
  if (res.status === 401) handle401Error()
  if (res.status === 422) handle422Error()
  if (!res.ok) throw new Error(`create blob failed: ${res.status}`)
  const data = await res.json()
  return { sha: data.sha }
}

export async function deleteFileFromTree(token: string, owner: string, repo: string, path: string, message: string, branch: string): Promise<void> {
  const sha = await getFileSha(token, owner, repo, path, branch)
  if (!sha) throw new Error(`File not found: ${path}`)

  const res = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, sha, branch }),
  })
  if (res.status === 401) handle401Error()
  if (res.status === 422) handle422Error()
  if (!res.ok) throw new Error(`delete file failed: ${res.status}`)
}

// 获取仓库信息
export async function getRepoInfo(token: string, owner: string, repo: string): Promise<{ description: string; default_branch: string }> {
  const res = await fetch(`${GH_API}/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!res.ok) throw new Error(`get repo info failed: ${res.status}`)
  return res.json()
}

// 获取当前用户信息
export async function getCurrentUser(token: string): Promise<{ login: string; avatar_url: string; name: string }> {
  const res = await fetch(`${GH_API}/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!res.ok) throw new Error(`get user failed: ${res.status}`)
  return res.json()
}