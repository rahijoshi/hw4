import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProduct, formatPrice } from '../api'
import { usePageContext } from '../pageContext'
import type { ProductDetail } from '../types'

/** Stock wording that stays honest about what "available" means. */
function stockLine(p: ProductDetail) {
  if (p.sizes_in_stock.length === 0) return 'Sold out in every size right now.'
  if (p.sizes_out_of_stock.length === 0) return 'In stock in all six sizes.'
  return `In stock in ${p.sizes_in_stock.join(', ')} — out of ${p.sizes_out_of_stock.join(', ')}.`
}

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>()
  const { setProductId } = usePageContext()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Tells the chat agent which product this page is for (see
  // backend/agent.py's dynamic instructions) — so "do you have this in
  // pink?" resolves without the shopper naming the product. Cleared on
  // unmount so leaving the page stops the agent assuming this product.
  useEffect(() => {
    setProductId(productId ?? null)
    return () => setProductId(null)
  }, [productId, setProductId])

  useEffect(() => {
    if (!productId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchProduct(productId)
      .then((data) => {
        if (!cancelled) setProduct(data)
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
  }, [productId])

  if (loading) return <p className="state">Loading…</p>
  if (error || !product) {
    return (
      <div className="state state-error">
        <p>We could not find that product.</p>
        <Link to="/products" className="btn btn-outline">
          Back to all products
        </Link>
      </div>
    )
  }

  return (
    <section className="section">
      <div className="container">
        <p className="breadcrumb">
          <Link to="/products">Products</Link>
          {' · '}
          <Link to={`/products?category=${encodeURIComponent(product.category)}`}>
            {product.category}
          </Link>
          {' · '}
          {product.name}
        </p>

        <div className="detail">
          <div className="detail-image">
            <img src={product.image_url} alt={product.name} />
          </div>

          <div>
            <p className="eyebrow">{product.category}</p>
            <h1 style={{ fontSize: '2.1rem' }}>{product.name}</h1>
            <p className="detail-price">{formatPrice(product.price)}</p>

            <p className="detail-desc">{product.description}</p>

            <h3 style={{ marginTop: '2rem', marginBottom: '0.2rem' }}>Sizes &amp; stock</h3>
            <div className="size-grid">
              {product.sizes.map((s) => {
                const low = s.quantity > 0 && s.quantity <= 3
                return (
                  <div
                    key={s.size}
                    className={`size-box ${s.quantity === 0 ? 'out' : ''} ${low ? 'low' : ''}`}
                  >
                    <span className="sz">{s.size}</span>
                    <span className="qty">
                      {s.quantity === 0
                        ? 'Out'
                        : low
                          ? `Only ${s.quantity} left`
                          : `${s.quantity} in stock`}
                    </span>
                  </div>
                )
              })}
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 0 }}>
              {stockLine(product)}
            </p>

            <dl style={{ marginTop: '2rem' }}>
              <div className="spec">
                <dt>Garment</dt>
                <dd>{product.garment_type}</dd>
              </div>
              <div className="spec">
                <dt>Colours</dt>
                <dd>
                  {product.colors.length > 0
                    ? product.colors.join(', ')
                    : 'See photo — colours not listed for this item'}
                </dd>
              </div>
              <div className="spec">
                <dt>Total on hand</dt>
                <dd>{product.total_quantity} units across all sizes</dd>
              </div>
              <div className="spec">
                <dt>Item code</dt>
                <dd>{product.product_id}</dd>
              </div>
            </dl>

            {product.search_tags.length > 0 && (
              <div className="tag-row">
                {product.search_tags.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </div>
            )}

            <p style={{ marginTop: '2rem' }}>
              <Link to="/products" className="btn btn-outline">
                Back to all products
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
