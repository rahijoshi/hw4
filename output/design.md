# Campus Customs — Design Notes (Problem 10)

Design concept: lean into what Campus Customs actually *is* — a screen-printing and embroidery
shop, not a generic storefront — and make that texture visible instead of hiding behind a flat
corporate template. Everything below is a real change in the running app, not a mockup.

## What changed, and why it should help

**Halftone texture (hero, chat header, footer).** A CSS dot-grid pattern — the literal texture
ink makes on cotton through a screen — layered under the navy backgrounds, not a flat gradient.
It's the one visual detail that says "we actually print this stuff" before a shopper reads a
word of copy. A storefront that looks handmade reads as more trustworthy about quality than one
that looks like a template.

**Fraunces display serif for every headline.** Replaced the system-serif fallback with a real,
characterful display font (Google Fonts, falls back gracefully if it can't load) at heavy weight
for `h1`. Collegiate shops live or die on feeling established and specific, not generic — a
distinctive headline face does more of that work per pixel than almost anything else on the page.

**"EST. 1975" stamp badge + patch-style category tags.** A rotated, dashed-border circle in the
hero, and every product card's category label is now a dashed-border pill instead of plain text —
both read as "stamped / stitched onto the item," reinforcing the in-house-printing story from the
About page everywhere a shopper looks, not just on one page they might skip.

**Shop-window ticker (site-wide marquee).** A scrolling strip of real shop facts (est. 1975,
officially licensed, printed in-house, open seven days) under the nav bar on every page — the
digital version of the painted banner in a real shop's window. It fills the first three seconds
of a visit with proof-of-legitimacy before a shopper has decided whether to trust the site at all.

**Scroll-reveal on Home's sections.** Each section fades and lifts into place the first time it
scrolls into view instead of all dumping onto the screen at once. A page that reveals itself in
beats feels paced and intentional, which keeps a scrolling shopper reading instead of skimming
past a wall of identical content.

**Color swatches on every product card.** Small dots (real colors from the catalogue, not
decoration) next to the description, so a shopper can tell "comes in navy and white" at a glance
across a whole grid instead of clicking into every card to find out. Faster browsing is more
browsing, and more browsing is more purchases.

**Product image zoom + lift on hover, favorite heart "pop."** Small, cheap motion that makes the
grid feel responsive to touch rather than static — the kind of tactile feedback a shopper expects
from a real retail site and notices by its absence when it's missing.

**Chat redesign — "a person is actually there."** A green online dot and "Online now"-style
header, real speech-bubble tails on every message, a gold top accent on the panel, and —
new — a one-time nudge bubble ("👋 Looking for something? I know the whole shop.") that appears
a few seconds after a shopper lands, the way a clerk greets someone browsing in a real store. A
chat widget that only ever sits there silently gets ignored; one that greets you gets used, and a
chatbot that gets used is the one feature on this entire site that can close a sale by itself.

**"Shop by category" icon tiles on Home.** A real navigational shortcut (pulled from the live
`/api/categories`, not hardcoded) added above the fold, so a shopper who already knows "I want a
hoodie" doesn't have to scroll to the Products page and operate the filter UI to get there.

## Why this should help a shopper stick around and buy

Every change above targets one of two things: **trust** (texture, stamp, ticker, patches — "this
is a real, established shop") or **friction** (swatches, category tiles, reveal pacing, a chat
that greets first — "finding and deciding is easy here"). Collegiate apparel shoppers are buying
into an identity as much as a garment; a site that visibly has one of its own, and that gets out
of the way fast once they're ready to look, is the version of this shop more likely to end in a
cart instead of a closed tab.
