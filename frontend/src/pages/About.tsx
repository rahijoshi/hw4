import { Link } from 'react-router-dom'

export default function About() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '72ch' }}>
        <p className="eyebrow">About us</p>
        <h1>Fifty years on the same corner.</h1>

        <p className="lede">
          Campus Customs opened in 1975 directly across from the Yale campus, and we have not moved
          since. We are the oldest official Yale merchandise shop in New Haven, which mostly means
          we have had a very long time to work out what people actually want to wear.
        </p>

        <h2 style={{ marginTop: '2.5rem' }}>We make it here</h2>
        <p>
          The old York Square Cinema around the corner stopped showing films in 2005. It is now our
          production floor — screen printing on one side, embroidery machines on the other. When
          you order a crewneck with your residential college on it, that lettering is stitched a
          few hundred feet from where you are standing.
        </p>
        <p>
          That is the part worth knowing about this shop. We are not a catalogue with a New Haven
          address on it. The people who print the shirts are the people behind the counter, and if
          something comes out wrong they are the ones who fix it.
        </p>

        <h2 style={{ marginTop: '2.5rem' }}>What we carry</h2>
        <p>
          Tees, crewnecks, hoodies, quarter-zips and jackets, from thirty-two dollars for a
          heavyweight t-shirt up to ninety-eight for a fleece that will see you through a February
          in Connecticut. All fourteen residential colleges. The varsity teams. The Game, every
          November, whether we win it or not.
        </p>
        <p>
          Everything is officially licensed by the University. We keep real stock in real sizes,
          and when a size runs out we would rather say so than let you find out at checkout.
        </p>

        <h2 style={{ marginTop: '2.5rem' }}>Who buys from us</h2>
        <p>
          Freshmen in September who did not pack for the cold. Parents on move-in weekend buying
          something with YALE DAD on it before they can talk themselves out of it. Alumni ordering
          from abroad for a reunion. Graduate students who want the school, not the University.
          Everyone gets the same stock and the same answer about it.
        </p>

        <h2 style={{ marginTop: '2.5rem' }}>Come find us</h2>
        <p>
          57 Broadway, New Haven, Connecticut 06511. Open seven days a week. We ship to more than
          thirty countries, but the shop is better.
        </p>

        <p style={{ marginTop: '2rem' }}>
          <Link to="/products" className="btn">
            Browse the collection
          </Link>
        </p>
      </div>
    </section>
  )
}
