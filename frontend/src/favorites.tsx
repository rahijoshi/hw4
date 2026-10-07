import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

const STORAGE_KEY = 'campus-customs-favorites'

interface FavoritesContextValue {
  favorites: Set<string>
  isFavorite: (productId: string) => boolean
  toggleFavorite: (productId: string) => void
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

/**
 * Usability improvement (Problem 9): a shopper's saved items, kept in the
 * browser — no account needed, nothing sent to the backend. Browsing 102
 * products across several categories means comparing them later is the
 * actual hard part; this lets a shopper mark a few and come back to just
 * those instead of re-searching from scratch.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]))
  }, [favorites])

  function toggleFavorite(productId: string) {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  return (
    <FavoritesContext.Provider
      value={{ favorites, isFavorite: (id) => favorites.has(id), toggleFavorite }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used inside <FavoritesProvider>')
  return ctx
}
