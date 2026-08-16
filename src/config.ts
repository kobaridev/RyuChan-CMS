// CMS 配置常量
export const CMS_CONFIG = {
  // GitHub OAuth
  GITHUB_CLIENT_ID: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
  OAUTH_PROXY_URL: import.meta.env.VITE_OAUTH_PROXY_URL || 'http://localhost:8787',

  // 内容仓库
  CONTENT_OWNER: 'kobaridev',
  CONTENT_REPO: 'RyuChan-Content',
  CONTENT_BRANCH: 'main',

  // 允许的 GitHub 用户（owner）
  ALLOWED_USER: 'kobaridev',
} as const

// 内容仓库根路径
export const CONTENT_PATHS = {
  blog: 'src/content/blog/src',
  blogConfig: 'src/content/blog/config.yaml',
  friends: 'src/content/friends/list',
  friendsConfig: 'src/content/friends/config.yaml',
  projects: 'src/content/project/src',
  projectsConfig: 'src/content/project/config.yaml',
  navigation: 'src/content/navigation/categories',
  navigationConfig: 'src/content/navigation/config.yaml',
  album: 'src/content/album/categories',
  albumConfig: 'src/content/album/config.yaml',
  music: 'src/content/music/list',
  musicCustom: 'src/content/music/custom',
  musicConfig: 'src/content/music/config.yaml',
  siteConfig: 'src/content/site/config.yaml',
  aboutConfig: 'src/content/about/config.yaml',
  aboutSrc: 'src/content/about/src/index.md',
  animeConfig: 'src/content/anime/config.yaml',
  animeBilibili: 'src/content/anime/provider/bilibili.yaml',
  animeTmdb: 'src/content/anime/provider/tmdb.yaml',
  commentsConfig: 'src/content/comments/config.yaml',
  commentsGiscus: 'src/content/comments/provider/giscus.yaml',
  commentsTwikoo: 'src/content/comments/provider/twikoo.yaml',
  commentsWaline: 'src/content/comments/provider/waline.yaml',
  analysisConfig: 'src/content/analysis/config.yaml',
  analysisUmami: 'src/content/analysis/provider/umami-head.yaml',
  analysisClarity: 'src/content/analysis/provider/claity.head.html',
  analysisUmamiHtml: 'src/content/analysis/provider/umami.head.html',
  footerConfig: 'src/content/footer/config.yaml',
} as const