import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { Product } from './types'

export interface ChatResults {
  /** The shopper's message that produced these matches, for the shelf's heading. */
  query: string
  products: Product[]
}

interface ChatResultsContextValue {
  results: ChatResults | null
  showResults: (query: string, products: Product[]) => void
  clearResults: () => void
}

const ChatResultsContext = createContext<ChatResultsContextValue | null>(null)

/**
 * Carries the chat agent's latest product matches to wherever on the site
 * they should actually be shown (see MatchShelf) — the front-end half of
 * the API contract described in backend/models.py:ChatReply. The agent
 * decides which products match and returns their ids; the backend hydrates
 * those into real rows; this context is how that list reaches the page,
 * regardless of which route happens to be open — the chat panel floats
 * over every page, so its results have to be able to land on every page.
 */
export function ChatResultsProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<ChatResults | null>(null)

  return (
    <ChatResultsContext.Provider
      value={{
        results,
        showResults: (query, products) => setResults({ query, products }),
        clearResults: () => setResults(null),
      }}
    >
      {children}
    </ChatResultsContext.Provider>
  )
}

export function useChatResults() {
  const ctx = useContext(ChatResultsContext)
  if (!ctx) throw new Error('useChatResults must be used inside <ChatResultsProvider>')
  return ctx
}
