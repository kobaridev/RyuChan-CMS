// 社交平台预设（来自 RyuChan ConfigPage.tsx）
export const SOCIAL_PRESETS = [
  { label: 'Baidutieba', value: 'ri:baidu-line' },
  { label: 'Bilibili', value: 'ri:bilibili-line' },
  { label: 'CloudMusic', value: 'ri:netease-cloud-music-line' },
  { label: 'Discord', value: 'ri:discord-line' },
  { label: 'Douban', value: 'ri:douban-line' },
  { label: 'Douyin', value: 'ri:tiktok-line' },
  { label: 'Email', value: 'ri:mail-line' },
  { label: 'Facebook', value: 'ri:facebook-line' },
  { label: 'Github', value: 'ri:github-line' },
  { label: 'GitLab', value: 'ri:gitlab-line' },
  { label: 'Instagram', value: 'ri:instagram-line' },
  { label: 'LinkedIn', value: 'ri:linkedin-box-line' },
  { label: 'Mastodon', value: 'ri:mastodon-line' },
  { label: 'Other', value: 'ri:link' },
  { label: 'Pixiv', value: 'simple-icons:pixiv' },
  { label: 'QQ', value: 'ri:qq-line' },
  { label: 'Reddit', value: 'ri:reddit-line' },
  { label: 'Rednote', value: 'simple-icons:xiaohongshu' },
  { label: 'RSS', value: 'ri:rss-fill' },
  { label: 'Spotify', value: 'ri:spotify-line' },
  { label: 'Steam', value: 'ri:steam-line' },
  { label: 'Telegram', value: 'ri:telegram-line' },
  { label: 'Twitch', value: 'ri:twitch-line' },
  { label: 'Twitter (X)', value: 'ri:twitter-line' },
  { label: 'WeChat', value: 'ri:wechat-fill' },
  { label: 'Weibo', value: 'ri:weibo-fill' },
  { label: 'Xianyu', value: 'ri:shopping-bag-line' },
  { label: 'YouTube', value: 'ri:youtube-line' },
  { label: 'Zhihu', value: 'ri:zhihu-line' },
]

// 评论提供商选项
export const COMMENT_PROVIDERS = [
  { value: 'giscus', label: 'Giscus' },
  { value: 'waline', label: 'Waline' },
  { value: 'twikoo', label: 'Twikoo' },
]

// 模块标题映射
export const MODULE_TITLE_MAP: { key: string; label: string; configPath: string; icon: string }[] = [
  { key: 'blog', label: '博客', configPath: 'src/content/blog/config.yaml', icon: 'FileText' },
  { key: 'friends', label: '友链', configPath: 'src/content/friends/config.yaml', icon: 'Link' },
  { key: 'project', label: '项目', configPath: 'src/content/project/config.yaml', icon: 'FolderGit2' },
  { key: 'navigation', label: '导航', configPath: 'src/content/navigation/config.yaml', icon: 'Compass' },
  { key: 'album', label: '相册', configPath: 'src/content/album/config.yaml', icon: 'Images' },
  { key: 'music', label: '音乐', configPath: 'src/content/music/config.yaml', icon: 'Music' },
]