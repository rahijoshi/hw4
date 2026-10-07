import type { Product, ProductDetail, StoredChatMessage, User } from './types'

// Relative URLs — Vite proxies /api and /images to the FastAPI backend in
// dev, and in a real deployment they'd sit behind the same origin anyway.

/** Thrown for a non-2xx response; carries the backend's `detail` message
 *  (e.g. "Invalid email or password.") so forms can show it directly. */
export class ApiError extends Error {}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} — ${url}`)
  }
  return (await res.json()) as T
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const detail = data?.detail
    const message = Array.isArray(detail)
      ? detail.map((d: { msg?: string }) => d.msg).join(' ')
      : (detail ?? `${res.status} ${res.statusText}`)
    throw new ApiError(message)
  }
  return data as T
}

export function fetchProducts(params: { category?: string; q?: string } = {}) {
  const search = new URLSearchParams()
  if (params.category && params.category !== 'All') search.set('category', params.category)
  if (params.q) search.set('q', params.q)
  const qs = search.toString()
  return getJSON<Product[]>(`/api/products${qs ? `?${qs}` : ''}`)
}

export function fetchProduct(productId: string) {
  return getJSON<ProductDetail>(`/api/products/${encodeURIComponent(productId)}`)
}

export function fetchCategories() {
  return getJSON<string[]>('/api/categories')
}

export const formatPrice = (price: number) => `$${price.toFixed(2)}`

export function signup(data: {
  first_name: string
  last_name: string
  email: string
  password: string
  confirm_password: string
}) {
  return postJSON<User>('/api/auth/signup', data)
}

export function login(data: { email: string; password: string }) {
  return postJSON<User>('/api/auth/login', data)
}

/** A logged-in shopper's saved conversation (Problem 8) — empty for a guest
 *  or a user with no history yet, never an error either way. */
export function fetchChatHistory(userId: number) {
  return getJSON<StoredChatMessage[]>(`/api/chat/history?user_id=${userId}`)
}
