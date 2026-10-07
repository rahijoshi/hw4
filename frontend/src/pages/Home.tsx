import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCategories, fetchProducts } from '../api'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'
import type { Product } from '../types'

const CATEGORY_ICONS: Record<string, string> = {
  'T-Shirts': '👕',
  Crewnecks: '🧶',
  Hoodies: '🎽',
  'Quarter-Zips': '🧷',
  Jackets: '🧥',
  Performance: '🏃',
}

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    // A small spread of hoodies and crewnecks for the front page.
    fetchProducts({ category: 'Hoodies' })
      .then((hoodies) => setFeatured(hoodies.slice(0, 4)))
      .catch(() => setFeatured([]))
    fetchCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  return (
    <>
      <section className="hero">
        <div className="stamp">
          EST.
          <br />
          1975
        </div>
        <div className="container">
          <p className="eyebrow">57 Broadway · New Haven</p>
          <h1>Yale gear, made a block from Old Campus.</h1>
          <p>
            We have been printing and stitching Bulldog blue since 1975 — same corner, same
            presses, same stubborn opinion that a sweatshirt should outlast the four years you
            bought it for.
          </p>
          <div className="hero-actions">
            <Link to="/products" className="btn btn-ghost-light">
              Shop the collection
            </Link>
            <Link to="/about" className="btn btn-ghost-light">
              Our story
            </Link>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="section">
          <div className="container">
            <Reveal>
              <p className="eyebrow">Shop by category</p>
              <h2 style={{ marginBottom: '1.6rem' }}>What are you after?</h2>
            </Reveal>
            <Reveal delay={80}>
              <div className="category-tiles">
                {categories.map((c) => (
                  <Link key={c} to={`/products?category=${encodeURIComponent(c)}`} className="category-tile">
                    <span className="category-tile-icon" aria-hidden="true">
                      {CATEGORY_ICONS[c] ?? '🏷️'}
                    </span>
                    {c}
                  </Link>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      <section className="section band">
        <div className="container">
          <Reveal>
            <div className="pillars">
              <div className="pillar">
                <h3>Printed in house</h3>
                <p>
                  Screens, embroidery machines and all. Nothing here was drop-shipped from a
                  warehouse that has never seen New Haven.
                </p>
              </div>
              <div className="pillar">
                <h3>Officially licensed</h3>
                <p>
                  Every wordmark, crest and bulldog on these racks is licensed by the University.
                  The real thing, not a lookalike.
                </p>
              </div>
              <div className="pillar">
                <h3>Your college, your team</h3>
                <p>
                  All fourteen residential colleges and the varsity teams, because "Yale" is
                  rarely the specific thing people actually want on their chest.
                </p>
              </div>
              <div className="pillar">
                <h3>Ships anywhere</h3>
                <p>
                  Families and alumni order from more than thirty countries. Graduation does not
                  end the subscription.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div>
                <p className="eyebrow">Always moving</p>
                <h2>Hoodies we keep restocking</h2>
              </div>
              <Link to="/products" className="btn btn-outline">
                See all 102 items
              </Link>
            </div>
          </Reveal>
          {featured.length > 0 ? (
            <Reveal delay={80}>
              <div className="product-grid">
                {featured.map((p) => (
                  <ProductCard key={p.product_id} product={p} />
                ))}
              </div>
            </Reveal>
          ) : (
            <p className="state">
              Catalogue is loading — if this stays empty, start the API with{' '}
              <code>uvicorn main:app --reload --port 8000</code>.
            </p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: '58ch' }}>
          <Reveal>
            <p className="eyebrow">Not sure what you want?</p>
            <h2>Ask the shop, not a search box.</h2>
            <p className="lede">
              The chat button in the corner is wired to our actual catalogue. It can tell you what
              a piece looks like, what it costs, and whether your size is genuinely on the shelf —
              and it will tell you plainly when it is not.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  )
}
