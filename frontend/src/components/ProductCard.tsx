import { Link } from 'react-router-dom'
import { formatPrice } from '../api'
import { swatchColor } from '../colorSwatches'
import { useFavorites } from '../favorites'
import type { Product } from '../types'

export default function ProductCard({ product }: { product: Product }) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const favorited = isFavorite(product.product_id)

  return (
    <Link to={`/products/${product.product_id}`} className="product-card">
      <div className="product-thumb">
        <img src={product.image_url} alt={product.name} loading="lazy" />
        <button
          className={`favorite-btn ${favorited ? 'active' : ''}`}
          aria-label={favorited ? `Remove ${product.name} from favorites` : `Save ${product.name} to favorites`}
          aria-pressed={favorited}
          onClick={(e) => {
            e.preventDefault() // don't follow the card's own link
            e.stopPropagation()
            toggleFavorite(product.product_id)
          }}
        >
          {favorited ? '♥' : '♡'}
        </button>
      </div>
      <div className="product-body">
        <span className="product-cat">{product.category}</span>
        <span className="product-name">{product.name}</span>
        <span className="product-blurb">{product.description}</span>
        {product.colors.length > 0 && (
          <div className="product-swatches" aria-hidden="true">
            {product.colors.slice(0, 5).map((c) => (
              <span
                key={c}
                className="product-swatch"
                style={{ background: swatchColor(c) }}
                title={c}
              />
            ))}
          </div>
        )}
        <span className="product-price">{formatPrice(product.price)}</span>
      </div>
    </Link>
  )
}
