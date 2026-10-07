const FACTS = [
  'EST. 1975',
  '57 BROADWAY, NEW HAVEN',
  'OFFICIALLY LICENSED YALE MERCHANDISE',
  'PRINTED & EMBROIDERED IN-HOUSE',
  'OPEN SEVEN DAYS A WEEK',
  'BOOLA BOOLA',
]

/**
 * A running shop-awning ticker, site-wide, right under the nav bar — the
 * kind of thing a real storefront window has painted across the glass.
 * Pure CSS keyframe loop (`.marquee-track` in index.css): the fact list is
 * rendered twice back to back and the track slides exactly -50%, so the
 * seam between the two copies is invisible and the loop never stutters or
 * needs JS to reset.
 */
export default function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {[...FACTS, ...FACTS].map((fact, i) => (
          <span key={i}>{fact}</span>
        ))}
      </div>
    </div>
  )
}
