import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface PageContextValue {
  /** The product_id of the product page currently open, if any. */
  productId: string | null
  setProductId: (id: string | null) => void
}

const PageContextCtx = createContext<PageContextValue | null>(null)

/**
 * What page the shopper is looking at, as far as the chat agent needs to
 * know — right now, just "which product page, if any" (see
 * ProductDetailPage.tsx, which sets this on mount and clears it on
 * unmount). ChatWidget.tsx reads it and sends it as `page_context` with
 * every message, so "do you have this in pink?" on a product page
 * resolves to that product server-side (backend/agent.py's dynamic
 * instructions) without the shopper having to name it.
 */
export function PageContextProvider({ children }: { children: ReactNode }) {
  const [productId, setProductId] = useState<string | null>(null)
  return (
    <PageContextCtx.Provider value={{ productId, setProductId }}>{children}</PageContextCtx.Provider>
  )
}

export function usePageContext() {
  const ctx = useContext(PageContextCtx)
  if (!ctx) throw new Error('usePageContext must be used inside <PageContextProvider>')
  return ctx
}
