import ProductCard from './ProductCard'
import { useChatResults } from '../chatResults'

/**
 * The product cards the chat assistant just matched, rendered on the page
 * itself — not only inside the floating chat panel. Lives between the nav
 * bar and whatever route is active (see App.tsx), so it shows up no matter
 * which page the conversation happened on, and persists across navigation
 * until the next match replaces it or the shopper dismisses it.
 *
 * Reuses the exact same <ProductCard> the Products page uses, so a card
 * the chat just produced behaves identically to one from browsing — same
 * image/name/price/description, same click-through to the single-item
 * page built in Problem 3.
 */
export default function MatchShelf() {
  const { results, clearResults } = useChatResults()
  if (!results || results.products.length === 0) return null

  return (
    <section className="match-shelf">
      <div className="container">
        <div className="match-shelf-head">
          <div>
            <p className="eyebrow">From your conversation</p>
            <h2 className="match-shelf-title">Results for “{results.query}”</h2>
          </div>
          <button className="match-shelf-close" onClick={clearResults} aria-label="Dismiss these results">
            ×
          </button>
        </div>
        <div className="product-grid">
          {results.products.map((p) => (
            <ProductCard key={p.product_id} product={p} />
          ))}
        </div>
      </div>
    </section>
  )
}
