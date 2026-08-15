import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface CacheEntry<T = unknown> {
  data: T
  timestamp: number
}

interface CacheStore {
  /** 缓存数据: module → CacheEntry */
  caches: Record<string, CacheEntry>
  /** 设置缓存 */
  setCache: <T>(module: string, data: T) => void
  /** 获取缓存数据 */
  getCache: <T>(module: string) => T | null
  /** 清除指定模块缓存 */
  invalidate: (module: string) => void
  /** 清除所有缓存 */
  invalidateAll: () => void
}

export const useCacheStore = create<CacheStore>()(
  persist(
    (set, get) => ({
      caches: {},
      setCache: (module, data) =>
        set((state) => ({
          caches: {
            ...state.caches,
            [module]: { data, timestamp: Date.now() },
          },
        })),
      getCache: (module) => {
        const entry = get().caches[module]
        if (!entry) return null
        // 5 分钟过期
        if (Date.now() - entry.timestamp > 5 * 60 * 1000) {
          // 异步清除（不在 getter 中 set）
          setTimeout(() => {
            get().invalidate(module)
          }, 0)
          return null
        }
        return entry.data as unknown
      },
      invalidate: (module) =>
        set((state) => {
          const next = { ...state.caches }
          delete next[module]
          return { caches: next }
        }),
      invalidateAll: () => set({ caches: {} }),
    }),
    {
      name: 'ryuchan-data-cache',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ caches: state.caches }),
    }
  )
)

/**
 * 带缓存的加载器：先查缓存，未命中则调用 fetcher 并缓存结果
 * 返回 { data, loading } 供各页面使用
 */
export async function loadWithCache<T>(
  module: string,
  token: string,
  fetcher: (token: string) => Promise<T>,
  options?: { forceRefresh?: boolean }
): Promise<T> {
  const cache = useCacheStore.getState()

  if (!options?.forceRefresh) {
    const cached = cache.getCache<T>(module)
    if (cached) {
      // 缓存命中，但静默更新（后台刷新）
      fetcher(token).then((fresh) => {
        cache.setCache(module, fresh)
      }).catch(() => {})
      return cached
    }
  }

  // 缓存未命中或强制刷新
  const data = await fetcher(token)
  cache.setCache(module, data)
  return data
}