# Campus Customs — Usability Improvements (Problem 9)

Two front-end improvements and two agent/backend improvements, built on top of the working shop from Problems 1–8. Each section says what was added and why it helps a shopper or the business, then how it was verified in the actual running app.

---

## Front end #1 — Sort control on the Products page

**What was added:** A sort dropdown next to the search box on `/products` — *Featured* (the default), *Price: Low to High*, *Price: High to Low*, *Name: A to Z*, *Name: Z to A*. It sorts whatever the current category/search filter already returned, client-side (`src/pages/Products.tsx:sortProducts`), and — consistent with how category and search already work — the chosen sort is written into the URL (`?sort=price-asc`), so a sorted view is linkable and survives a refresh.

**Why it helps:** A shopper browsing 102 products with a fixed budget ("I want a hoodie under $70") previously had to scan every card in whatever order the catalogue happened to return. Sorting by price lets them go straight to what's affordable, or straight to the most premium pieces; sorting by name helps someone who already knows roughly what they're looking for ("the Berkeley one") find it fast. For the business, faster price comparison is one less reason to bounce off the page before finding something to buy.

**Where to see it:** `/products` → the "Sort:" dropdown in the toolbar, next to the category chips.

---

## Front end #2 — Favorites (a wishlist with no account required)

**What was added:** A heart toggle (♡ / ♥) on every product card, and a "♡ Favorites (N)" filter chip on the Products page that narrows the grid to just the saved items. Saved ids live in `localStorage` (`src/favorites.tsx`), not the database — no login needed, and nothing round-trips to the backend for it. Because every product card in the app — Home's featured row, the Products grid, and Problem 7's chat-triggered match shelf — all render through the same `<ProductCard>` component, the heart appears everywhere a product card does, for free.

**Why it helps:** Comparison shopping across a catalogue this size (six garment families, several color options each) usually means a shopper either keeps a dozen browser tabs open or just gives up and buys the first thing they liked. A quick, no-signup way to mark a handful of items and pull up just those later removes that friction — and because it's independent of login, it works for someone who hasn't created an account yet, which is the majority of first-time visitors. For the business, a lower-friction way to shortlist items is a lower-friction path to an eventual purchase, and the saved set gives a natural "come back and finish deciding" hook for a return visit.

**Where to see it:** The ♡ on the top-right corner of any product card (Home, Products, or the chat's match shelf); the "Favorites" chip on `/products`.

---

## Agent/backend #1 — Grounding verification on the agent's own output (more accurate, safer)

**What was added:** The system prompt has said, since Problem 5, that the agent must never state a `product_id` it didn't get from a tool call. Until now that was enforced exactly once — in `main.py`, where a `product_id` was dropped if it didn't match a real row in the catalogue. That check does **not** catch a real product the agent never actually looked up this turn, only cites from memory or confusion with an earlier turn.

`agent.py:extract_surfaced_product_ids` reads `result.all_messages()` after every run and collects every `product_id` that actually came back from `search_products`, `get_product_info`, or `check_size_stock` *this run*. `main.py`'s chat route now intersects the agent's own `product_ids` output against that set before hydrating anything — a real-but-unrelated id is now caught and dropped, not just a nonexistent one. This is the existing grounding rule enforced in code, a stricter check layered on top of the existing one, not a replacement for it.

**Why it helps:** A shopper asking about hoodies shouldn't ever see a jacket's card attached to the reply because the model free-associated a product it saw three turns ago and never re-checked. That's a subtle trust problem for a shop chatbot specifically — the whole pitch of this feature (Problems 5–8) is that prices and stock come from the database, not the model's memory; this closes the one remaining gap where a *real* product could still show up *ungrounded*. For the business, it's one more guardrail against the agent ever looking unreliable in front of a customer.

**Verified:** Unit-tested `extract_surfaced_product_ids` directly against constructed tool-return messages — confirmed it collects ids from `search_products`'/`get_product_info`'s own JSON payloads and ignores unrelated tool output (e.g. `get_current_user`'s plain-text return, which contains no product data). Then confirmed, against the live `/api/chat` route, that an ordinary browsing question ("What hoodies do you have?") still comes back with all 10 real, correctly-grounded product cards — proving the stricter check doesn't drop legitimate results, only ungrounded ones.

---

## Agent/backend #2 — Bounded conversation history (cheaper, faster)

**What was added:** `agent.py:MAX_HISTORY_MESSAGES = 20`. `main.py:_to_message_history` now takes only the most recent 20 messages (~10 user/assistant exchanges) of whatever history the front end sends, before handing it to the model — the rest is dropped, oldest first.

**Why it helps:** Problem 8 made chat history persist in the database and reload on every visit, and the front end resends the full transcript with every single message so the agent has real memory. Put those two together and a loyal, long-time shopper's history only ever grows — every visit adds more messages on top of everything from every prior visit, forever. Without a cap, that shopper's *every future message* — for as long as they keep shopping here — would carry a little more dead weight than the last, with every turn re-paying for a conversation that happened months ago. The cap means the model only ever reasons over (and the shop only ever pays for) a bounded, recent slice of context, regardless of how long someone's been a customer — a direct, ongoing cost and latency saving introduced specifically because Problem 8 made conversations long-lived. It's enforced server-side, not left to the client, so it holds regardless of what the front end sends.

**Verified:** Directly unit-tested `_to_message_history` with 60 constructed turns — confirmed exactly 20 come out, and that they're the **most recent** 20 (`msg 40`–`msg 59`), not an arbitrary slice. Then sent a live `/api/chat` request with 60 history messages attached and confirmed it still answers correctly and quickly rather than erroring or stalling under the larger payload.

---

## Summary

| # | Layer | Improvement | Where to see it |
| --- | --- | --- | --- |
| 1 | Front end | Sort control (price ↑/↓, name A–Z/Z–A) | `/products` toolbar |
| 2 | Front end | Favorites / wishlist, no account needed | ♡ on any product card; "Favorites" chip on `/products` |
| 3 | Agent/backend | Grounding verification on `product_ids` | Every `/api/chat` reply — enforced silently, confirmed by test |
| 4 | Agent/backend | Bounded conversation history (`MAX_HISTORY_MESSAGES=20`) | Every `/api/chat` call — enforced silently, confirmed by test |
