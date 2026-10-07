import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchCategories, fetchProducts } from '../api'
import ProductCard from '../components/ProductCard'
import { useFavorites } from '../favorites'
import type { Product } from '../types'

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc'

const SORT_LABELS: Record<SortOption, string> = {
  featured: 'Featured',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  'name-asc': 'Name: A to Z',
  'name-desc': 'Name: Z to A',
}

function sortProducts(products: Product[], sort: SortOption): Product[] {
  if (sort === 'featured') return products
  const sorted = [...products]
  switch (sort) {
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price)
    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price)
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'name-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name))
  }
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const category = searchParams.get('category') ?? 'All'
  const query = searchParams.get('q') ?? ''
  const sort = (searchParams.get('sort') as SortOption) ?? 'featured'
  const favoritesOnly = searchParams.get('favorites') === '1'

  const { favorites } = useFavorites()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState(query)

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    setDraft(query)
  }, [query])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchProducts({ category, q: query })
      .then((data) => {
        if (!cancelled) setProducts(data)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [category, query])

  // Favorites-only is a client-side narrowing of whatever the API already
  // returned — no reason to round-trip to the backend for a filter that
  // only exists in localStorage.
  const visible = useMemo(() => {
    const base = favoritesOnly ? products.filter((p) => favorites.has(p.product_id)) : products
    return sortProducts(base, sort)
  }, [products, sort, favoritesOnly, favorites])

  /** Writes the filter into the URL so a filtered view can be linked to. */
  function updateParams(next: { category?: string; q?: string; sort?: SortOption; favorites?: boolean }) {
    const params = new URLSearchParams(searchParams)
    const cat = next.category ?? category
    const q = next.q ?? query
    const nextSort = next.sort ?? sort
    const nextFavorites = next.favorites ?? favoritesOnly
    if (cat && cat !== 'All') params.set('category', cat)
    else params.delete('category')
    if (q) params.set('q', q)
    else params.delete('q')
    if (nextSort !== 'featured') params.set('sort', nextSort)
    else params.delete('sort')
    if (nextFavorites) params.set('favorites', '1')
    else params.delete('favorites')
    setSearchParams(params)
  }

  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">The collection</p>
        <h1>Products</h1>
        <p className="lede" style={{ marginBottom: '2.5rem' }}>
          Everything we currently print, stitch and keep on the shelf. Click any piece for sizes
          and stock.
        </p>

        <div className="toolbar">
          <div className="chips">
            {['All', ...categories].map((c) => (
              <button
                key={c}
                className={`chip ${c === category ? 'active' : ''}`}
                onClick={() => updateParams({ category: c })}
              >
                {c}
              </button>
            ))}
            <button
              className={`chip ${favoritesOnly ? 'active' : ''}`}
              onClick={() => updateParams({ favorites: !favoritesOnly })}
              title="Show only items you've saved"
            >
              {favoritesOnly ? '♥' : '♡'} Favorites{favorites.size > 0 ? ` (${favorites.size})` : ''}
            </button>
          </div>

          <div className="toolbar-controls">
            <select
              className="sort-select"
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value as SortOption })}
              aria-label="Sort products"
            >
              {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                <option key={opt} value={opt}>
                  Sort: {SORT_LABELS[opt]}
                </option>
              ))}
            </select>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                updateParams({ q: draft })
              }}
            >
              <input
                className="search-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Search by name, colour or tag…"
                aria-label="Search products"
              />
            </form>
          </div>
        </div>

        {loading && <p className="state">Loading the catalogue…</p>}

        {error && (
          <p className="state state-error">
            Could not reach the shop API ({error}).
            <br />
            Start it with <code>uvicorn main:app --reload --port 8000</code> from the{' '}
            <code>backend/</code> folder.
          </p>
        )}

        {!loading && !error && (
          <>
            <p className="result-count">
              {visible.length} {visible.length === 1 ? 'item' : 'items'}
              {category !== 'All' && ` in ${category}`}
              {query && ` matching “${query}”`}
              {favoritesOnly && ' in your favorites'}
            </p>
            {visible.length === 0 ? (
              <p className="state">
                {favoritesOnly
                  ? "You haven't saved anything yet — tap the ♡ on a product to add it here."
                  : 'Nothing matched that. Try a broader search, or ask the assistant in the corner.'}
              </p>
            ) : (
              <div className="product-grid">
                {visible.map((p) => (
                  <ProductCard key={p.product_id} product={p} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
