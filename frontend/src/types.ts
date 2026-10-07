// Mirrors the Pydantic models in backend/models.py.

export interface Product {
  product_id: string
  name: string
  garment_type: string
  category: string
  description: string
  colors: string[]
  search_tags: string[]
  price: number
  image_url: string
}

export interface SizeStock {
  size: string
  quantity: number
}

export interface ProductDetail extends Product {
  sizes: SizeStock[]
  total_quantity: number
  sizes_in_stock: string[]
  sizes_out_of_stock: string[]
}

export interface ChatMessage {
  /** 'system' is a front-end-only divider (e.g. "continuing from your last
   *  visit") — never sent to the backend, see ChatWidget.tsx's sendToAgent. */
  role: 'user' | 'assistant' | 'system'
  content: string
  /** Products the agent matched, shown as cards under the reply (Problem 5). */
  products?: Product[]
}

/** One row of `chat_messages`, as GET /api/chat/history returns it (Problem 8). */
export interface StoredChatMessage {
  role: 'user' | 'assistant'
  content: string
  products: Product[]
  created_at: string
}

/** What the backend returns for a logged-in user — never a password or its hash. */
export interface User {
  id: number
  first_name: string
  last_name: string
  name: string
  email: string
  created_at: string
}
