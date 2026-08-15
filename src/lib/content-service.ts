import {
  getRef, createTree, createCommit, updateRef, createBlob,
  readTextFileFromRepo, listRepoFilesRecursive, toBase64Utf8,
  deleteFileFromTree,
  type TreeItem,
} from '@/lib/github-client'
import { CMS_CONFIG, CONTENT_PATHS } from '@/config'
import * as yaml from 'js-yaml'
import { parseYaml } from '@/lib/yaml-utils'
import { parseFrontmatter, stringifyFrontmatter } from '@/lib/markdown-utils'
import type { BlogPost, Friend, Project, NavigationCategory, Album, MusicPlaylist, SiteConfig, AboutConfig, ModuleConfig } from '@/types'

// ============ 通用 Git 提交 ============

export async function commitChanges(
  token: string,
  treeItems: TreeItem[],
  message: string,
  retries = 3
): Promise<void> {
  const { CONTENT_OWNER, CONTENT_REPO, CONTENT_BRANCH } = CMS_CONFIG

  for (let i = 0; i < retries; i++) {
    try {
      const ref = await getRef(token, CONTENT_OWNER, CONTENT_REPO, `heads/${CONTENT_BRANCH}`)
      const tree = await createTree(token, CONTENT_OWNER, CONTENT_REPO, treeItems, ref.sha)
      const commit = await createCommit(token, CONTENT_OWNER, CONTENT_REPO, message, tree.sha, [ref.sha])
      await updateRef(token, CONTENT_OWNER, CONTENT_REPO, `heads/${CONTENT_BRANCH}`, commit.sha)
      return
    } catch (e) {
      if (i === retries - 1) throw e
      // 等待后重试（处理 non-fast-forward 冲突）
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
    }
  }
}

// ============ 博客 ============

export async function listBlogPosts(token: string): Promise<BlogPost[]> {
  const { CONTENT_OWNER, CONTENT_REPO, CONTENT_BRANCH } = CMS_CONFIG
  const files = await listRepoFilesRecursive(token, CONTENT_OWNER, CONTENT_REPO, CONTENT_PATHS.blog, CONTENT_BRANCH)
  const mdFiles = files.filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))

  const posts: BlogPost[] = []
  for (const filePath of mdFiles) {
    const content = await readTextFileFromRepo(token, CONTENT_OWNER, CONTENT_REPO, filePath, CONTENT_BRANCH)
    if (!content) continue
    const { data, content: body } = parseFrontmatter(content)
    const fileFormat = filePath.endsWith('.mdx') ? 'mdx' : 'md'
    posts.push({
      slug: (data.slug as string) || filePath.split('/').pop()!.replace(/\.(md|mdx)$/, ''),
      title: (data.title as string) || '',
      description: (data.description as string) || '',
      pubDate: (data.pubDate as string) || '',
      updated: data.updated as string | undefined,
      image: data.image as string | undefined,
      badge: data.badge as string | undefined,
      draft: data.draft as boolean | undefined,
      categories: data.categories as string[] | undefined,
      tags: data.tags as string[] | undefined,
      content: body,
      fileFormat: fileFormat as 'md' | 'mdx',
      filePath,
    })
  }
  return posts
}

export async function getBlogPost(token: string, slug: string): Promise<BlogPost | null> {
  const { CONTENT_OWNER, CONTENT_REPO, CONTENT_BRANCH } = CMS_CONFIG
  const files = await listRepoFilesRecursive(token, CONTENT_OWNER, CONTENT_REPO, CONTENT_PATHS.blog, CONTENT_BRANCH)
  const filePath = files.find((f) => f.includes(slug) && (f.endsWith('.md') || f.endsWith('.mdx')))

  if (!filePath) return null
  const content = await readTextFileFromRepo(token, CONTENT_OWNER, CONTENT_REPO, filePath, CONTENT_BRANCH)
  if (!content) return null

  const { data, content: body } = parseFrontmatter(content)
  const fileFormat = filePath.endsWith('.mdx') ? 'mdx' : 'md'
  return {
    slug: (data.slug as string) || slug,
    title: (data.title as string) || '',
    description: (data.description as string) || '',
    pubDate: (data.pubDate as string) || '',
    updated: data.updated as string | undefined,
    image: data.image as string | undefined,
    badge: data.badge as string | undefined,
    draft: data.draft as boolean | undefined,
    categories: data.categories as string[] | undefined,
    tags: data.tags as string[] | undefined,
    content: body,
    fileFormat: fileFormat as 'md' | 'mdx',
    filePath,
  }
}

export async function saveBlogPost(
  token: string,
  post: BlogPost,
  mode: 'create' | 'edit',
  originalFilePath?: string
): Promise<void> {
  const { CONTENT_OWNER, CONTENT_REPO } = CMS_CONFIG
  const filePath = post.filePath || `src/content/blog/src/${post.slug}.${post.fileFormat}`

  const frontmatter: Record<string, unknown> = {
    slug: post.slug,
    title: post.title,
    description: post.description,
    pubDate: post.pubDate,
  }
  if (post.updated) frontmatter.updated = post.updated
  if (post.image) frontmatter.image = post.image
  if (post.badge) frontmatter.badge = post.badge
  if (post.draft !== undefined) frontmatter.draft = post.draft
  if (post.categories?.length) frontmatter.categories = post.categories
  if (post.tags?.length) frontmatter.tags = post.tags

  const fileContent = stringifyFrontmatter(frontmatter, post.content)
  const blob = await createBlob(token, CONTENT_OWNER, CONTENT_REPO, toBase64Utf8(fileContent), 'base64')

  const treeItems: TreeItem[] = [{
    path: filePath,
    mode: '100644',
    type: 'blob',
    sha: blob.sha,
  }]

  // 如果编辑且格式变了，删除原文件
  if (mode === 'edit' && originalFilePath && originalFilePath !== filePath) {
    treeItems.push({
      path: originalFilePath,
      mode: '100644',
      type: 'blob',
      sha: null,
    })
  }

  const message = mode === 'edit'
    ? `feat(blog): update post "${post.title}"`
    : `feat(blog): publish post "${post.title}"`

  await commitChanges(token, treeItems, message)
}

export async function deleteBlogPost(token: string, filePath: string, title: string): Promise<void> {
  await deleteFileFromTree(token, CMS_CONFIG.CONTENT_OWNER, CMS_CONFIG.CONTENT_REPO, filePath, `feat(blog): delete post "${title}"`, CMS_CONFIG.CONTENT_BRANCH)
}

// ============ 友链 ============

export async function listFriends(token: string): Promise<Friend[]> {
  const { CONTENT_OWNER, CONTENT_REPO, CONTENT_BRANCH } = CMS_CONFIG
  const files = await listRepoFilesRecursive(token, CONTENT_OWNER, CONTENT_REPO, CONTENT_PATHS.friends, CONTENT_BRANCH)
  const yamlFiles = files.filter((f) => f.endsWith('.yaml'))

  const friends: Friend[] = []
  for (const filePath of yamlFiles) {
    const content = await readTextFileFromRepo(token, CONTENT_OWNER, CONTENT_REPO, filePath, CONTENT_BRANCH)
    if (!content) continue
    const data = parseYaml<Friend>(content)
    friends.push({ ...data, _filePath: filePath })
  }
  return friends
}

export async function saveFriends(token: string, friends: Friend[]): Promise<void> {
  const { CONTENT_OWNER, CONTENT_REPO } = CMS_CONFIG
  const treeItems: TreeItem[] = []

  for (const friend of friends) {
    const filePath = friend._filePath || `src/content/friends/list/${String(friends.indexOf(friend) + 1).padStart(2, '0')}.yaml`
    const { _filePath, ...data } = friend
    const content = yaml.dump(data, { lineWidth: -1 })
    const blob = await createBlob(token, CONTENT_OWNER, CONTENT_REPO, toBase64Utf8(content), 'base64')
    treeItems.push({ path: filePath, mode: '100644', type: 'blob', sha: blob.sha })
  }

  await commitChanges(token, treeItems, 'feat(friends): update friends list')
}

export async function createFriend(token: string, friend: Friend): Promise<void> {
  const all = await listFriends(token)
  const nextIndex = String(all.length + 1).padStart(2, '0')
  const filePath = `src/content/friends/list/${nextIndex}.yaml`

  const { _filePath, ...data } = friend
  const content = yaml.dump(data, { lineWidth: -1 })
  const blob = await createBlob(token, CMS_CONFIG.CONTENT_OWNER, CMS_CONFIG.CONTENT_REPO, toBase64Utf8(content), 'base64')

  await commitChanges(token, [{ path: filePath, mode: '100644', type: 'blob', sha: blob.sha }], `feat(friends): add friend "${friend.name}"`)
}

export async function deleteFriend(token: string, filePath: string, name: string): Promise<void> {
  await deleteFileFromTree(token, CMS_CONFIG.CONTENT_OWNER, CMS_CONFIG.CONTENT_REPO, filePath, `feat(friends): delete friend "${name}"`, CMS_CONFIG.CONTENT_BRANCH)
}

// ============ 项目 ============

export async function listProjects(token: string): Promise<Project[]> {
  const { CONTENT_OWNER, CONTENT_REPO, CONTENT_BRANCH } = CMS_CONFIG
  const files = await listRepoFilesRecursive(token, CONTENT_OWNER, CONTENT_REPO, CONTENT_PATHS.projects, CONTENT_BRANCH)
  const yamlFiles = files.filter((f) => f.endsWith('.yaml'))

  const projects: Project[] = []
  for (const filePath of yamlFiles) {
    const content = await readTextFileFromRepo(token, CONTENT_OWNER, CONTENT_REPO, filePath, CONTENT_BRANCH)
    if (!content) continue
    const data = parseYaml<Project>(content)
    projects.push({ ...data, _filePath: filePath })
  }
  return projects
}

export async function createProject(token: string, project: Project): Promise<void> {
  const all = await listProjects(token)
  const nextIndex = String(all.length + 1).padStart(2, '0')
  const filePath = `src/content/project/src/${nextIndex}.yaml`

  const { _filePath, ...data } = project
  const content = yaml.dump(data, { lineWidth: -1 })
  const blob = await createBlob(token, CMS_CONFIG.CONTENT_OWNER, CMS_CONFIG.CONTENT_REPO, toBase64Utf8(content), 'base64')

  await commitChanges(token, [{ path: filePath, mode: '100644', type: 'blob', sha: blob.sha }], `feat(project): add project "${project.name}"`)
}

export async function deleteProject(token: string, filePath: string, name: string): Promise<void> {
  await deleteFileFromTree(token, CMS_CONFIG.CONTENT_OWNER, CMS_CONFIG.CONTENT_REPO, filePath, `feat(project): delete project "${name}"`, CMS_CONFIG.CONTENT_BRANCH)
}

// ============ 导航 ============

export async function listNavigation(token: string): Promise<NavigationCategory[]> {
  const { CONTENT_OWNER, CONTENT_REPO, CONTENT_BRANCH } = CMS_CONFIG
  const files = await listRepoFilesRecursive(token, CONTENT_OWNER, CONTENT_REPO, CONTENT_PATHS.navigation, CONTENT_BRANCH)
  const yamlFiles = files.filter((f) => f.endsWith('.yaml'))

  const categories: NavigationCategory[] = []
  for (const filePath of yamlFiles) {
    const content = await readTextFileFromRepo(token, CONTENT_OWNER, CONTENT_REPO, filePath, CONTENT_BRANCH)
    if (!content) continue
    const data = parseYaml<NavigationCategory>(content)
    categories.push({ ...data, _filePath: filePath })
  }
  return categories
}

export async function saveNavigationCategory(token: string, category: NavigationCategory): Promise<void> {
  const { CONTENT_OWNER, CONTENT_REPO } = CMS_CONFIG
  const filePath = category._filePath!
  const { _filePath, ...data } = category
  const content = yaml.dump(data, { lineWidth: -1 })
  const blob = await createBlob(token, CONTENT_OWNER, CONTENT_REPO, toBase64Utf8(content), 'base64')

  await commitChanges(token, [{ path: filePath, mode: '100644', type: 'blob', sha: blob.sha }], `feat(navigation): update category "${category.category}"`)
}

export async function createNavigationCategory(token: string, category: NavigationCategory): Promise<void> {
  const { CONTENT_OWNER, CONTENT_REPO } = CMS_CONFIG
  const slug = category.category.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-').toLowerCase() || 'new-category'
  const filePath = `src/content/navigation/categories/${slug}.yaml`
  const { _filePath, ...data } = category
  const content = yaml.dump(data, { lineWidth: -1 })
  const blob = await createBlob(token, CONTENT_OWNER, CONTENT_REPO, toBase64Utf8(content), 'base64')

  await commitChanges(token, [{ path: filePath, mode: '100644', type: 'blob', sha: blob.sha }], `feat(navigation): add category "${category.category}"`)
}

export async function deleteNavigationCategory(token: string, filePath: string, categoryName: string): Promise<void> {
  await deleteFileFromTree(token, CMS_CONFIG.CONTENT_OWNER, CMS_CONFIG.CONTENT_REPO, filePath, `feat(navigation): delete category "${categoryName}"`, CMS_CONFIG.CONTENT_BRANCH)
}

// ============ 相册 ============

export async function listAlbums(token: string): Promise<Album[]> {
  const { CONTENT_OWNER, CONTENT_REPO, CONTENT_BRANCH } = CMS_CONFIG
  const files = await listRepoFilesRecursive(token, CONTENT_OWNER, CONTENT_REPO, CONTENT_PATHS.album, CONTENT_BRANCH)
  const yamlFiles = files.filter((f) => f.endsWith('.yaml'))

  const albums: Album[] = []
  for (const filePath of yamlFiles) {
    const content = await readTextFileFromRepo(token, CONTENT_OWNER, CONTENT_REPO, filePath, CONTENT_BRANCH)
    if (!content) continue
    const data = parseYaml<Album>(content)
    albums.push({ ...data, _filePath: filePath })
  }
  return albums
}

export async function saveAlbum(token: string, album: Album): Promise<void> {
  const { CONTENT_OWNER, CONTENT_REPO } = CMS_CONFIG
  const filePath = album._filePath!
  const { _filePath, ...data } = album
  const content = yaml.dump(data, { lineWidth: -1 })
  const blob = await createBlob(token, CONTENT_OWNER, CONTENT_REPO, toBase64Utf8(content), 'base64')

  await commitChanges(token, [{ path: filePath, mode: '100644', type: 'blob', sha: blob.sha }], `feat(album): update album "${album.title}"`)
}

export async function createAlbum(token: string, album: Album): Promise<void> {
  const { CONTENT_OWNER, CONTENT_REPO } = CMS_CONFIG
  const slug = album.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-').toLowerCase() || 'new-album'
  const filePath = `src/content/album/categories/${slug}.yaml`
  const { _filePath, ...data } = album
  const content = yaml.dump(data, { lineWidth: -1 })
  const blob = await createBlob(token, CONTENT_OWNER, CONTENT_REPO, toBase64Utf8(content), 'base64')

  await commitChanges(token, [{ path: filePath, mode: '100644', type: 'blob', sha: blob.sha }], `feat(album): add album "${album.title}"`)
}

export async function deleteAlbum(token: string, filePath: string, albumTitle: string): Promise<void> {
  await deleteFileFromTree(token, CMS_CONFIG.CONTENT_OWNER, CMS_CONFIG.CONTENT_REPO, filePath, `feat(album): delete album "${albumTitle}"`, CMS_CONFIG.CONTENT_BRANCH)
}

// ============ 音乐 ============

export async function listMusicPlaylists(token: string): Promise<MusicPlaylist[]> {
  const { CONTENT_OWNER, CONTENT_REPO, CONTENT_BRANCH } = CMS_CONFIG
  const files = await listRepoFilesRecursive(token, CONTENT_OWNER, CONTENT_REPO, CONTENT_PATHS.music, CONTENT_BRANCH)
  const yamlFiles = files.filter((f) => f.endsWith('.yaml'))

  const playlists: MusicPlaylist[] = []
  for (const filePath of yamlFiles) {
    const content = await readTextFileFromRepo(token, CONTENT_OWNER, CONTENT_REPO, filePath, CONTENT_BRANCH)
    if (!content) continue
    const data = parseYaml<MusicPlaylist>(content)
    playlists.push({ ...data, _filePath: filePath })
  }
  return playlists
}

export async function createMusicPlaylist(token: string, playlist: MusicPlaylist): Promise<void> {
  const { CONTENT_OWNER, CONTENT_REPO } = CMS_CONFIG
  const slug = playlist.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-').toLowerCase() || 'new-playlist'
  const filePath = `src/content/music/list/${slug}.yaml`
  const { _filePath, ...data } = playlist
  const content = yaml.dump(data, { lineWidth: -1 })
  const blob = await createBlob(token, CONTENT_OWNER, CONTENT_REPO, toBase64Utf8(content), 'base64')

  await commitChanges(token, [{ path: filePath, mode: '100644', type: 'blob', sha: blob.sha }], `feat(music): add playlist "${playlist.name}"`)
}

export async function deleteMusicPlaylist(token: string, filePath: string, playlistName: string): Promise<void> {
  await deleteFileFromTree(token, CMS_CONFIG.CONTENT_OWNER, CMS_CONFIG.CONTENT_REPO, filePath, `feat(music): delete playlist "${playlistName}"`, CMS_CONFIG.CONTENT_BRANCH)
}

// ============ 站点配置 ============

export async function getSiteConfig(token: string): Promise<SiteConfig | null> {
  const { CONTENT_OWNER, CONTENT_REPO, CONTENT_BRANCH } = CMS_CONFIG
  const content = await readTextFileFromRepo(token, CONTENT_OWNER, CONTENT_REPO, CONTENT_PATHS.siteConfig, CONTENT_BRANCH)
  if (!content) return null
  return parseYaml<SiteConfig>(content)
}

export async function saveSiteConfig(token: string, config: SiteConfig): Promise<void> {
  const { CONTENT_OWNER, CONTENT_REPO } = CMS_CONFIG
  const content = yaml.dump(config, { lineWidth: -1 })
  const blob = await createBlob(token, CONTENT_OWNER, CONTENT_REPO, toBase64Utf8(content), 'base64')

  await commitChanges(token, [{ path: CONTENT_PATHS.siteConfig, mode: '100644', type: 'blob', sha: blob.sha }], 'feat(config): update site config')
}

// ============ 模块配置 ============

export async function getModuleConfig(token: string, configPath: string): Promise<ModuleConfig | null> {
  const { CONTENT_OWNER, CONTENT_REPO, CONTENT_BRANCH } = CMS_CONFIG
  const content = await readTextFileFromRepo(token, CONTENT_OWNER, CONTENT_REPO, configPath, CONTENT_BRANCH)
  if (!content) return null
  return parseYaml<ModuleConfig>(content)
}

export async function saveModuleConfig(token: string, configPath: string, config: ModuleConfig): Promise<void> {
  const { CONTENT_OWNER, CONTENT_REPO } = CMS_CONFIG
  const content = yaml.dump(config, { lineWidth: -1 })
  const blob = await createBlob(token, CONTENT_OWNER, CONTENT_REPO, toBase64Utf8(content), 'base64')

  const moduleName = configPath.split('/').pop()?.replace('.yaml', '') || 'unknown'
  await commitChanges(token, [{ path: configPath, mode: '100644', type: 'blob', sha: blob.sha }], `feat(config): update ${moduleName} config`)
}

// ============ 关于页面 ============

export async function getAboutConfig(token: string): Promise<AboutConfig | null> {
  const { CONTENT_OWNER, CONTENT_REPO, CONTENT_BRANCH } = CMS_CONFIG
  const content = await readTextFileFromRepo(token, CONTENT_OWNER, CONTENT_REPO, CONTENT_PATHS.aboutConfig, CONTENT_BRANCH)
  if (!content) return null
  return parseYaml<AboutConfig>(content)
}

export async function getAboutContent(token: string): Promise<string> {
  const { CONTENT_OWNER, CONTENT_REPO, CONTENT_BRANCH } = CMS_CONFIG
  const content = await readTextFileFromRepo(token, CONTENT_OWNER, CONTENT_REPO, CONTENT_PATHS.aboutSrc, CONTENT_BRANCH)
  return content || ''
}

export async function saveAboutConfig(token: string, config: AboutConfig): Promise<void> {
  const { CONTENT_OWNER, CONTENT_REPO } = CMS_CONFIG
  const content = yaml.dump(config, { lineWidth: -1 })
  const blob = await createBlob(token, CONTENT_OWNER, CONTENT_REPO, toBase64Utf8(content), 'base64')

  await commitChanges(token, [{ path: CONTENT_PATHS.aboutConfig, mode: '100644', type: 'blob', sha: blob.sha }], 'feat(about): update about config')
}

export async function saveAboutContent(token: string, content: string): Promise<void> {
  const { CONTENT_OWNER, CONTENT_REPO } = CMS_CONFIG
  const blob = await createBlob(token, CONTENT_OWNER, CONTENT_REPO, toBase64Utf8(content), 'base64')

  await commitChanges(token, [{ path: CONTENT_PATHS.aboutSrc, mode: '100644', type: 'blob', sha: blob.sha }], 'feat(about): update about content')
}

// ============ 通用 YAML 文件读写 ============

export async function readYamlFile<T>(token: string, filePath: string): Promise<T | null> {
  const { CONTENT_OWNER, CONTENT_REPO, CONTENT_BRANCH } = CMS_CONFIG
  const content = await readTextFileFromRepo(token, CONTENT_OWNER, CONTENT_REPO, filePath, CONTENT_BRANCH)
  if (!content) return null
  return parseYaml<T>(content)
}

export async function readTextFile(token: string, filePath: string): Promise<string | null> {
  const { CONTENT_OWNER, CONTENT_REPO, CONTENT_BRANCH } = CMS_CONFIG
  return readTextFileFromRepo(token, CONTENT_OWNER, CONTENT_REPO, filePath, CONTENT_BRANCH)
}

export async function saveYamlFile(token: string, filePath: string, data: unknown, message: string): Promise<void> {
  const { CONTENT_OWNER, CONTENT_REPO } = CMS_CONFIG
  const content = yaml.dump(data, { lineWidth: -1 })
  const blob = await createBlob(token, CONTENT_OWNER, CONTENT_REPO, toBase64Utf8(content), 'base64')

  await commitChanges(token, [{ path: filePath, mode: '100644', type: 'blob', sha: blob.sha }], message)
}

export async function saveTextFile(token: string, filePath: string, content: string, message: string): Promise<void> {
  const { CONTENT_OWNER, CONTENT_REPO } = CMS_CONFIG
  const blob = await createBlob(token, CONTENT_OWNER, CONTENT_REPO, toBase64Utf8(content), 'base64')

  await commitChanges(token, [{ path: filePath, mode: '100644', type: 'blob', sha: blob.sha }], message)
}

// ============ 模块标题 ============

export async function getModuleTitle(token: string, configPath: string): Promise<{ title?: string; subtitle?: string } | null> {
  const { CONTENT_OWNER, CONTENT_REPO, CONTENT_BRANCH } = CMS_CONFIG
  const content = await readTextFileFromRepo(token, CONTENT_OWNER, CONTENT_REPO, configPath, CONTENT_BRANCH)
  if (!content) return null
  const data = parseYaml<{ title?: string; subtitle?: string }>(content)
  return data
}

export async function saveModuleTitle(token: string, configPath: string, title: string, subtitle: string): Promise<void> {
  const { CONTENT_OWNER, CONTENT_REPO, CONTENT_BRANCH } = CMS_CONFIG
  // 读取完整配置，只更新 title 和 subtitle
  const existing = await readTextFileFromRepo(token, CONTENT_OWNER, CONTENT_REPO, configPath, CONTENT_BRANCH)
  const data = existing ? parseYaml<Record<string, unknown>>(existing) : {}
  data.title = title
  data.subtitle = subtitle
  const content = yaml.dump(data, { lineWidth: -1 })
  const blob = await createBlob(token, CONTENT_OWNER, CONTENT_REPO, toBase64Utf8(content), 'base64')

  await commitChanges(token, [{ path: configPath, mode: '100644', type: 'blob', sha: blob.sha }], `feat(config): update module title`)
}

// ============ 图片上传 ============

/**
 * 将图片文件上传到内容仓库的 assets/uploads/ 目录
 * 返回 GitHub raw URL 可直接用于图片显示
 */
export async function uploadImage(
  token: string,
  file: File,
  subdir: string = 'uploads'
): Promise<string> {
  const { CONTENT_OWNER, CONTENT_REPO } = CMS_CONFIG

  // 将文件转为 base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // 去掉 data:image/...;base64, 前缀
      const idx = result.indexOf(',')
      resolve(idx >= 0 ? result.slice(idx + 1) : result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  // 生成唯一文件名
  const ext = file.name.split('.').pop() || 'png'
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '')
  const fileName = `${safeName}_${timestamp}.${ext}`
  const filePath = `assets/${subdir}/${fileName}`

  // 创建 blob 并提交
  const blob = await createBlob(token, CONTENT_OWNER, CONTENT_REPO, base64, 'base64')
  await commitChanges(token, [{ path: filePath, mode: '100644', type: 'blob', sha: blob.sha }], `feat(upload): add image ${fileName}`)

  // 返回 raw URL
  const RAW_BASE = `https://raw.githubusercontent.com/${CONTENT_OWNER}/${CONTENT_REPO}/${CMS_CONFIG.CONTENT_BRANCH}/`
  return `${RAW_BASE}${filePath}`
}

// 获取 provider 目录路径
export function getProviderDir(module: string): string {
  const dirs: Record<string, string> = {
    comments: 'src/content/comments/provider',
    anime: 'src/content/anime/provider',
    analysis: 'src/content/analysis/provider',
  }
  return dirs[module] || ''
}

// 列出 provider 配置文件
export async function listProviderFiles(token: string, module: string): Promise<{ label: string; path: string }[]> {
  const { CONTENT_OWNER, CONTENT_REPO, CONTENT_BRANCH } = CMS_CONFIG
  const dir = getProviderDir(module)
  if (!dir) return []
  const files = await listRepoFilesRecursive(token, CONTENT_OWNER, CONTENT_REPO, dir, CONTENT_BRANCH)
  const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.html'))

  return yamlFiles.map((f) => {
    const fileName = f.split('/').pop()!.replace(/\.(yaml|head\.html|\.html)$/, '')
    const label = fileName.charAt(0).toUpperCase() + fileName.slice(1).replace(/-/g, ' ')
    return { label, path: f }
  })
}

// 创建 provider 配置文件
export async function createProviderConfig(
  token: string,
  module: string,
  name: string,
  initialData: Record<string, unknown> = {}
): Promise<string> {
  const { CONTENT_OWNER, CONTENT_REPO } = CMS_CONFIG
  const dir = getProviderDir(module)
  if (!dir) throw new Error(`Unknown module: ${module}`)
  const slug = name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  const filePath = `${dir}/${slug}.yaml`
  const content = yaml.dump(initialData, { lineWidth: -1 })
  const blob = await createBlob(token, CONTENT_OWNER, CONTENT_REPO, toBase64Utf8(content), 'base64')

  await commitChanges(token, [{ path: filePath, mode: '100644', type: 'blob', sha: blob.sha }], `feat(${module}): add provider "${name}"`)
  return filePath
}

// 删除 provider 配置文件
export async function deleteProviderConfig(
  token: string,
  module: string,
  filePath: string,
  name: string
): Promise<void> {
  await deleteFileFromTree(
    token,
    CMS_CONFIG.CONTENT_OWNER,
    CMS_CONFIG.CONTENT_REPO,
    filePath,
    `feat(${module}): delete provider "${name}"`,
    CMS_CONFIG.CONTENT_BRANCH
  )
}