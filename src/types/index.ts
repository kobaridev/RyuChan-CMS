// ============ 博客 ============
export interface BlogPost {
  slug: string
  title: string
  description: string
  pubDate: string
  updated?: string
  image?: string
  badge?: string
  draft?: boolean
  categories?: string[]
  tags?: string[]
  content: string
  fileFormat: 'md' | 'mdx'
  filePath: string
}

export interface BlogConfig {
  title: string
  pageSize: number
  subtitle: string
  typewriterTexts: string[]
}

// ============ 友链 ============
export interface Friend {
  name: string
  avatar?: string
  description?: string
  url: string
  badge?: string
  _filePath?: string
}

// ============ 项目 ============
export interface Project {
  name: string
  avatar?: string
  description?: string
  url: string
  badge?: string
  _filePath?: string
}

// ============ 导航 ============
export interface NavigationItem {
  name: string
  avatar?: string
  description?: string
  url: string
  category: string
  id?: string
  badge?: string
  badgeIcon?: string
  badgeColor?: string
}

export interface NavigationCategory {
  category: string
  icon?: string
  navigations: NavigationItem[]
  _filePath?: string
}

// ============ 相册 ============
export interface Photo {
  src: string
  variant: '1x1' | '4x5' | '4x3' | '9x16'
  title?: string
  description?: string
}

export interface Album {
  id?: string
  date: string
  event?: string
  title: string
  description?: string
  icon?: string
  photos: Photo[]
  _filePath?: string
}

// ============ 音乐 ============
export interface MusicSong {
  index: string
  provider: string
  // 自定义歌单字段
  customTitle?: string
  customArtist?: string
  customCover?: string
  customUrl?: string
}

export interface MusicPlaylist {
  name: string
  songs: MusicSong[]
  _filePath?: string
}

// ============ 站点配置 ============
export interface SiteConfig {
  site: {
    tab: string
    title: string
    title_type: string
    title_image: string
    description: string
    language: string
    favicon: string
    theme: {
      light: string
      dark: string
      code: string
    }
    date_format: string
    banner: {
      enableRandom: boolean
      randomUrl: string
      randomCount: number
      height: string
      images: string[]
    }
    menu: MenuItem[]
  }
  user: {
    name: string
    description: string
    site: string
    avatar: string
    qr_wechat: string
    qr_alipay: string
    sidebar: {
      social: SocialLink[]
    }
  }
}

export interface MenuItem {
  id: string
  text: string
  href: string
  svg: string
  target: string
}

export interface SocialLink {
  href: string
  ariaLabel: string
  title: string
  svg: string
}

// ============ 通用模块配置 ============
export interface ModuleConfig {
  title?: string
  subtitle?: string
  pageSize?: number
  typewriterTexts?: string[]
  enable?: boolean
  provider?: string | string[]
  api?: string
  [key: string]: unknown
}

// ============ 关于页面 ============
export interface AboutConfig {
  page: { title: string; subtitle: string }
  name: string
  displayName?: string
  title: string
  description: string[]
  avatar: string
  githubAvatar: string
  githubUsername: string
  githubRepo: string
  links: SocialLink[]
  techStack: TechStackItem[]
}

export interface TechStackItem {
  name: string
  icon: string
  color: string
}

// ============ 通用 ============
export interface GitHubUser {
  login: string
  avatar_url: string
  name: string
}

export type ContentType = 'blog' | 'friends' | 'projects' | 'navigation' | 'album' | 'music' | 'siteConfig' | 'about' | 'moduleConfig'

export interface RepoInfo {
  owner: string
  repo: string
  branch: string
  defaultBranch: string
  description: string
}

// ============ 模块标题 ============
export interface ModuleTitle {
  key: string          // 模块标识: blog, friends, project, navigation, album, music
  label: string        // 显示名称
  title: string
  subtitle: string
  configPath: string   // 对应的 YAML 文件路径
}

// ============ Provider 配置 ============
export interface ProviderConfig {
  name: string
  type: string
  enabled: boolean
  config: Record<string, unknown>
  configPath: string
}

// ============ 社交平台预设 ============
export interface SocialPreset {
  label: string
  value: string        // iconify 图标名
}