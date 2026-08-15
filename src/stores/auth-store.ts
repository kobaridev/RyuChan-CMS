import { create } from 'zustand'
import { getStoredToken, storeToken, clearToken } from '@/lib/oauth'
import { getCurrentUser } from '@/lib/github-client'
import type { GitHubUser } from '@/types'

interface AuthStore {
  isAuth: boolean
  token: string | null
  user: GitHubUser | null
  isLoading: boolean

  setToken: (token: string) => void
  logout: () => void
  checkAuth: () => Promise<boolean>
  fetchUser: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuth: false,
  token: null,
  user: null,
  isLoading: true,

  setToken: (token: string) => {
    storeToken(token)
    set({ token, isAuth: true })
    get().fetchUser()
  },

  logout: () => {
    clearToken()
    set({ isAuth: false, token: null, user: null })
  },

  checkAuth: async () => {
    const token = getStoredToken()
    if (token) {
      set({ token, isAuth: true, isLoading: false })
      return true
    }
    set({ isLoading: false })
    return false
  },

  fetchUser: async () => {
    const { token } = get()
    if (!token) return
    try {
      const user = await getCurrentUser(token)
      set({ user })
    } catch {
      // 获取用户失败，可能 token 过期
      get().logout()
    }
  },
}))