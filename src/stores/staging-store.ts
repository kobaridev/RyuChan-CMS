import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StagedChange } from '@/types'

interface StagingStore {
  changes: StagedChange[]
  addChange: (change: Omit<StagedChange, 'id' | 'timestamp'>) => void
  removeChange: (id: string) => void
  clearAll: () => void
}

export const useStagingStore = create<StagingStore>()(
  persist(
    (set) => ({
      changes: [],
      addChange: (change) =>
        set((state) => ({
          changes: [
            ...state.changes,
            { ...change, id: crypto.randomUUID(), timestamp: Date.now() },
          ],
        })),
      removeChange: (id) =>
        set((state) => ({
          changes: state.changes.filter((c) => c.id !== id),
        })),
      clearAll: () => set({ changes: [] }),
    }),
    { name: 'ryuchan-staged-changes' }
  )
)