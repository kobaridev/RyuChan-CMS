import { useState, useEffect, useRef, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { Search, X } from 'lucide-react'

interface IconifySearchResult {
  prefix: string
  name: string
  icons: string[]
  total: number
}

interface IconPickerProps {
  value: string
  onChange: (icon: string) => void
  placeholder?: string
  className?: string
}

/**
 * 图标选择器 - 支持 Iconify 搜索
 * 使用 Iconify API 搜索图标，通过关键字选择
 */
export function IconPicker({ value, onChange, placeholder = '搜索图标...', className = '' }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [recentIcons, setRecentIcons] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('iconpicker_recent') || '[]') }
    catch { return [] }
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // 搜索图标
  const searchIcons = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(recentIcons.length > 0 ? recentIcons : getDefaultIcons())
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=30`)
      const data: IconifySearchResult = await res.json()
      const icons = data.icons?.slice(0, 30) || []
      setResults(icons.length > 0 ? icons : recentIcons)
    } catch {
      setResults(recentIcons)
    } finally {
      setLoading(false)
    }
  }, [recentIcons])

  // 防抖搜索
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim()) {
      debounceRef.current = setTimeout(() => searchIcons(query), 300)
    } else {
      setResults(recentIcons.length > 0 ? recentIcons : getDefaultIcons())
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, searchIcons, recentIcons])

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 打开时聚焦
  useEffect(() => {
    if (open) {
      setResults(recentIcons.length > 0 ? recentIcons : getDefaultIcons())
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, recentIcons])

  const selectIcon = (icon: string) => {
    onChange(icon)
    const updated = [icon, ...recentIcons.filter(i => i !== icon)].slice(0, 20)
    setRecentIcons(updated)
    localStorage.setItem('iconpicker_recent', JSON.stringify(updated))
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 当前选中图标 */}
      <button
        type="button"
        className="flex items-center gap-2 w-full input input-bordered input-sm bg-base-100 cursor-pointer hover:border-primary transition-colors"
        onClick={() => setOpen(!open)}
      >
        {value ? (
          <Icon icon={value} className="w-5 h-5 shrink-0" />
        ) : (
          <span className="w-5 h-5 shrink-0 bg-base-300 rounded" />
        )}
        <span className="text-xs truncate flex-1 text-left">{value || placeholder}</span>
        <X
          className="w-3 h-3 opacity-30 hover:opacity-100 shrink-0"
          onClick={(e) => { e.stopPropagation(); onChange('') }}
        />
      </button>

      {/* 下拉面板 */}
      {open && (
        <div className="absolute z-50 mt-1 w-72 bg-base-100 border border-base-300 rounded-xl shadow-2xl overflow-hidden">
          {/* 搜索栏 */}
          <div className="p-2 border-b border-base-200">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/40" />
              <input
                ref={inputRef}
                className="input input-bordered input-xs w-full pl-7"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* 图标列表 */}
          <div className="max-h-48 overflow-y-auto p-2">
            {loading ? (
              <div className="flex justify-center py-4">
                <span className="loading loading-spinner loading-sm" />
              </div>
            ) : results.length === 0 ? (
              <p className="text-xs text-center text-base-content/40 py-4">无结果</p>
            ) : (
              <div className="grid grid-cols-6 gap-1">
                {results.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={`w-10 h-10 rounded-lg flex items-center justify-center hover:bg-primary/10 transition-colors ${
                      value === icon ? 'bg-primary/20 ring-1 ring-primary' : ''
                    }`}
                    onClick={() => selectIcon(icon)}
                    title={icon}
                  >
                    <Icon icon={icon} className="w-5 h-5" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 底部提示 */}
          <div className="px-2 py-1.5 border-t border-base-200 text-[10px] text-base-content/40 text-center">
            输入关键字搜索图标
          </div>
        </div>
      )}
    </div>
  )
}

/** 默认常用图标 */
function getDefaultIcons(): string[] {
  return [
    'ri:github-line', 'ri:bilibili-line', 'ri:twitter-line', 'ri:mail-line',
    'ri:weibo-fill', 'ri:wechat-fill', 'ri:qq-line', 'ri:discord-line',
    'ri:telegram-line', 'ri:youtube-line', 'ri:instagram-line', 'ri:steam-line',
    'ri:netease-cloud-music-line', 'ri:spotify-line', 'ri:reddit-line',
    'ri:linkedin-box-line', 'ri:zhihu-line', 'ri:douban-line',
    'ri:tiktok-line', 'ri:facebook-line', 'ri:twitch-line', 'ri:rss-fill',
    'ri:mastodon-line', 'ri:gitlab-line', 'simple-icons:pixiv',
    'lucide:code', 'lucide:globe', 'lucide:star', 'lucide:heart',
    'lucide:thumbs-up', 'lucide:image', 'lucide:film', 'lucide:music',
  ]
}