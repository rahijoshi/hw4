# AI Prompt Log — HW 4: Campus Customs Shop + Chatbot

This file records the prompts I typed for HW 4. It is updated problem by problem as I work, and it contains no API keys.

## Problem 1 — Prompt log and project setup

### Prompt(s) typed

> We are doing HW 4: Campus Customs shop + chatbot.
>
> The scenario: Campus Customs needs a real customer website with a helpful chatbot. We will build a React + Vite TypeScript front end and a Python FastAPI backend whose brain is a PydanticAI agent. Shoppers should be able to browse products, create an account, chat about merch, see matching items appear on the page, and get honest answers about price and stock from a local database.
>
> You are given `campus_customs.db` with tables for the product catalogue, inventory by size, and users (with hashed passwords). Product image file paths are in the catalogue table. Research yalebulldogblue.com to learn the style of the Campus Customs page and information for your agent prompt.
>
> Use my `PORTKEY_API_KEY` or whatever API key I have for the agent's AI calls. If using OpenAI through Portkey, use any models in the 5.6 or 6 series. I may want a smarter model for harder agent steps.
>
> We will work one problem at a time. In the end we will push the project to a public GitHub repo and submit the repo URL on Canvas. Do not commit the database or the product images.
>
> Unzip `data (2).zip` so that I have `data/campus_customs.db` (SQLite database with tables `catalogue`, `inventory`, and `users` — one test user is already there) and `data/products/` (product images; paths match the catalogue table).
>
> Create `AI_prompts.md` at the start of the assignment and keep it updated as I work. This file is the log of what I typed into my vibe coder. Put one section for each problem. Each section must include the problem number and title, at least one prompt I typed in my own words, and one follow-up prompt if it was needed — plus one sentence on what was lacking after the first.
>
> My running site, database writes, and screenshots are the evidence — I don't need an extra proof essay beyond these prompts.

### What was lacking after the first prompt

No follow-up prompt was needed. Two things in the shipped data differ from the prompt's description, and I used what is actually in the file rather than what was described: the `users` table already holds **three** users (not one) — `Test User`, `Ada Lovelace`, and `Tauhid Zaman` — and it has extra `first_name` / `last_name` columns plus an unlisted fourth table, `chat_messages`, that the handout did not mention. I will build against the real schema.

### What is in the data pack

Unzipped into `Homework/HW 4/data/`:

| Item | Detail |
| --- | --- |
| `data/campus_customs.db` | SQLite, 172 KB |
| `data/products/` | 102 product `.jpg` images |
| `catalogue` | 102 rows — `product_id`, `name`, `garment_type`, `description`, `colors` (JSON string), `search_tags` (JSON string), `image_file_path`, `price` |
| `inventory` | 612 rows — `product_id`, `size`, `quantity`, unique on `(product_id, size)`; 6 sizes per product |
| `users` | 3 rows — `name`, `email` (unique), `password_hash` (`pbkdf2_sha256$<salt>$<hex>`), `created_at`, `first_name`, `last_name` |
| `chat_messages` | 22 rows — `user_id`, `role`, `content`, `products_json`, `created_at` (not mentioned in the handout; already holds a real prior transcript) |

Password hashes are stored as `pbkdf2_sha256$<salt>$<hex digest>`, so account signup/login in a later problem must match that format rather than inventing a new one.

### Evidence of problem-by-problem work

This entry sets up the HW 4 project folder, unzips the data pack, and establishes the prompt-log convention for the rest of the assignment. It records the real database schema (including the two surprises above) so later problems build against it. No front end, backend, or agent code has been written yet.

## Problem 2 — Analyze the database

### Prompt(s) typed

> Look at the database `data/campus_customs.db` and understand the fields of each table. At a minimum, you should understand `catalogue`, `inventory`, and `users`.
>
> Start the file `output/harness.md`. Write down each table and its fields and one short line on why each field matters for the chatbot. You will keep growing this harness file in later problems (models, tools, safety, specs).

### What was lacking after the first prompt

No follow-up prompt was needed. The analysis did correct a guess I had made in Problem 1: I had logged `chat_messages` as empty, but it actually holds **22 rows** — an 11-turn user/assistant transcript across two users. That transcript turned out to be the most useful thing in the database, because it shows the exact target behavior (grounded prices, honest per-size stock answers, a flat "no" on a colour we don't carry, and products attached to assistant replies via `products_json`). The Problem 1 entry above has been fixed.

### Evidence of problem-by-problem work

This entry adds `output/harness.md` with a field-by-field table for all four tables — `catalogue` (102 rows), `inventory` (612), `users` (3), `chat_messages` (22) — each field annotated with why it matters to the chatbot, plus a closing section on the six data facts that will change how we build. Findings that shape later problems: `colors` and `search_tags` are JSON-encoded **strings** that must be parsed (3 products have empty colour lists); `garment_type` is messy free text with 22 values for ~6 real categories, so exact-match filtering would silently miss most hoodies; 145 of 612 size rows are at zero quantity but **no product is fully sold out**, making "in stock, but not in your size" the common case; price is fully determined by garment family across only 7 distinct values ($32–$98); and `password_hash` is `pbkdf2_sha256$<salt>$<64-hex>`, which our signup/login must reproduce exactly. Verified referential integrity (no orphans either direction) and that all 102 image paths resolve on disk as `products/<product_id>.jpg`. No application code written yet.

## Problem 3 — Build the Campus Customs website

### Prompt(s) typed

> Scaffold a React + Vite + TypeScript front end for Campus Customs. Put a nav bar at the top that links to the main pages: Home, Products, About Us, Log In, Create Account.
>
> Pull Campus Customs style wording from https://yalebulldogblue.com/ for Home and About Us, but write these pages in my own voice — do NOT copy the original site text.
>
> On the Products page, show product images from the catalogue (use the image paths in the database) with basic product info (name, price, short description).
>
> Make each product open a single-item page (large image on one side, full product text on the other — description, price, sizes/stock when you have them). Clicking a card on Products should take the shopper there.
>
> Add a chat interface in the bottom right of the site (a floating chat panel is fine). It does not need to talk to an agent yet — a stub that will call my backend later is enough for this problem.
>
> I will need a small API soon to read the database. It is fine to start a simple FastAPI app in `backend/main.py` just to serve products and images, then grow it into the agent in Problem 5.

### What was lacking after the first prompt

No follow-up prompt was needed. Three things came up while building that I resolved without asking:

1. **Research beyond the homepage.** The yalebulldogblue.com homepage alone gave the look (navy and white, collegiate) and the product taxonomy, but almost no story. A second search filled in the facts the About page actually needed — founded 1975, 57 Broadway, oldest official Yale merchandise shop in New Haven, screen printing and embroidery done in the former York Square Cinema building. All the copy on Home and About Us is written from those facts in my own voice; nothing is lifted from the original site.
2. **Both default ports were already in use** by another project running on this machine — 8000 for the API and 5173 for Vite. I moved the backend to 8001 and made the front-end port configurable rather than killing someone else's process.
3. **A real bug.** `ScrollToTop` used a concise arrow body, so its `useEffect` returned the result of `window.scrollTo` instead of a cleanup function. React threw `destroy is not a function` and the entire app failed to mount — a blank page. Caught it in the browser console and fixed it with braces.

### Evidence of problem-by-problem work

This entry adds the whole running site. Backend: `backend/models.py` (`SizeStock`, `Product`, `ProductDetail`), `backend/db.py` (all SQLite reads, kept separate so Problem 5's agent tools can import the same functions), `backend/main.py` (`/api/health`, `/api/products`, `/api/categories`, `/api/products/{id}`, and `data/products/` mounted at `/images`), and `backend/requirements.txt`. Front end: a Vite React-TS app with `NavBar`, `Footer`, `ProductCard` and `ChatWidget` components, six routed pages (Home, Products, product detail, About Us, Log In, Create Account), and a Yale navy stylesheet. The Vite dev server proxies `/api` and `/images` to the backend so the browser makes only same-origin requests.

Acting on Problem 2's finding that `garment_type` is messy free text, `db.normalise_category` collapses 22 raw values into 6 shopper-facing categories — T-Shirts 25, Crewnecks 29, Hoodies 27, Quarter-Zips 11, Jackets 8, Performance 2 — which drive the filter chips. Stock is displayed honestly per size ("Only 2 left" at ≤3, "Out" struck through) rather than as a single yes/no badge, since Problem 2 showed 145 of 612 size rows are at zero while no product is fully sold out.

Verified in the browser: 102 cards render with photos pulled from the database's own `image_file_path` values; the Jackets chip returns 8; clicking `football-left-chest-t-shirt` opens its page showing S and L at "Only 2 left", XXL at 5, and XS/M/XL struck through — matching the inventory table exactly; the chat panel opens, accepts a message, and falls back gracefully; the layout holds at 375px. The chat widget already posts to `POST /api/chat` and reads `{ reply, products }` back, so Problem 5 only has to stand up that endpoint. `output/harness.md` has a new Problem 3 section and the repo now has a `README.md`.

## Problem 4 — Create account and log in

### Prompt(s) typed

> Build a normal create-account / log-in flow. Create account: first name, last name, email, password (confirm password is a nice touch). Log in: email and password.
>
> New accounts go into the `users` table. Make sure to store passwords securely so hackers (human or AI) cannot access them.
>
> The seed database already has a test user I can use while building: `test@campuscustoms.yale.edu` / `password`.
>
> Confirm I can log in as that user, and that a brand-new account I create also works.
>
> Update `output/harness.md` with how auth works (what gets stored for a user and how passwords are protected).

### What was lacking after the first prompt

No follow-up prompt was needed. But the prompt left one thing genuinely unsolved rather than ambiguous: it doesn't say what hashing scheme the seed data already uses, and `password_hash` for the test user was already filled in — `pbkdf2_sha256$hw4testsalt0001$03ac75ff...`. Writing a new hashing scheme without checking first would have been a real risk: whatever I picked had maybe a 1-in-many chance of matching, and "confirm you can log in as that user" would have just failed. Before writing any auth code, I reverse-engineered the exact scheme by brute-forcing common PBKDF2 iteration counts against the known plaintext (`password`) and the known hash, and found an exact match at 120,000 iterations. `backend/auth.py` implements that exact scheme, which is why the login check against the seeded user passed on the first real attempt.

### Evidence of problem-by-problem work

This entry adds `backend/auth.py` (`hash_password`/`verify_password`, PBKDF2-HMAC-SHA256 at 120,000 iterations with a fresh random salt per account, constant-time comparison via `hmac.compare_digest`), new models in `backend/models.py` (`UserPublic` — deliberately has no `password_hash` field, so no response can leak one; `SignupRequest`, `LoginRequest`, both with field validators), new functions in `backend/db.py` (`get_user_row_by_email`, `create_user`, `row_to_user_public`), and two new routes in `backend/main.py` (`POST /api/auth/signup` → `201`/`409`; `POST /api/auth/login` → `200`/`401`, with an identical error message for "no such email" and "wrong password" so the API can't be used to enumerate accounts). On the front end: `src/auth.tsx` (`AuthProvider`/`useAuth`, persisted to `localStorage`), `src/api.ts` gets `login`/`signup`/`ApiError`, `NavBar` swaps to "Hi, {name} / Log Out" once signed in, and `Login.tsx`/`CreateAccount.tsx` now call the real API and show the backend's own error text.

Verified two ways. First, a 10-step script run directly against the live API and the SQLite file: the seeded test user logs in (`200`, confirms the reverse-engineered hash scheme is right); wrong password and unknown email both `401` with the same message; a brand-new signup (`Quinn Avery`) returns `201` and the row lands in `users` with the hash in the expected `pbkdf2_sha256$<salt>$<digest>` shape and the plaintext password nowhere in it; logging into that new account immediately works; a duplicate-email signup is `409`; a confirm-password mismatch is `400`; a sub-8-character password is `422` before it ever reaches the database. The script deleted its own test rows afterward. Second, repeated the critical paths by hand in the actual running browser: logged in as the seeded test user (nav changed to "Hi, Test / Log Out"), logged out, signed up a new account through the real Create Account form (logged in immediately), logged out and logged back in with that same new account, and confirmed a wrong password stays on the Login page with "Invalid email or password." instead of signing in. `users` was back to the original 3 seeded accounts when this problem was done. `output/harness.md` has the new Problem 4 section.

## Problem 5 — PydanticAI agent backend

### Prompt(s) typed

> Build the shop chatbot as a PydanticAI agent behind FastAPI, plugged into my front-end chat widget. Put the API app in `backend/main.py` — that is the file I run with uvicorn. Keep the agent as these four files next to it (same idea as HW3): `backend/prompts/prompt.md` (system prompt, grow this same file later), `backend/agent.py` (agent entry/wiring), `backend/tools.py` (tools the agent can call), `backend/models.py` (Pydantic/PydanticAI structured types).
>
> In `main.py`, expose a chat route so a message from the website returns a reply from the agent (and whatever else is needed for products/auth). I'll need my AI model API key for the agent. Put Campus Customs voice and safety basics into `prompts/prompt.md` — I'll expand tools and safety later.
>
> Start or update types in `models.py` for chat replies / product cards as needed.
>
> In `output/harness.md`, note how the front end talks to FastAPI and how the agent is loaded (prompt file + model).
>
> Make sure the backend runs from the `backend/` folder like this: `uvicorn main:app --reload --port 8000`.

### What was lacking after the first prompt

No follow-up prompt was needed, but two things surfaced while building that I resolved without asking:

1. **Port 8000 was already held by another session's process** on this dev machine (same situation as the frontend's port 5173 earlier). I kept `uvicorn main:app --reload --port 8000` as the documented default everywhere (README, `main.py`'s own docstring), since that's what the assignment asks for and what a clean machine would use, but actually ran and tested the live instance on `--port 8001` for this session — the same override pattern already established for the frontend port conflict, now also noted in the code comments so it isn't mysterious later.
2. **A real `.env` path bug I caught before it mattered.** I first wrote `agent.py` to look for the API key at `HW 4/.env` (one level up from `backend/`), copying HW3's pattern without checking HW4's extra folder nesting. The agent actually built successfully anyway — but only because `PORTKEY_API_KEY` turned out to already be set as a real Windows environment variable on this machine, not because the `.env` lookup worked. I checked for that explicitly rather than assuming the green checkmark meant the code was right, found the path bug, and fixed `agent.py` to also check the actual repo-root `.env` three levels up, so a fresh clone with only a `.env` file (no pre-set OS variable) still works.

### Evidence of problem-by-problem work

This entry adds the four agent files: `backend/prompts/prompt.md` (Campus Customs voice grounded in the real shop facts from Problem 3's Home/About copy — 1975, 57 Broadway, officially licensed — plus a grounding rule that every price/color/stock claim must come from a tool call this conversation, and MUST/MUST NOT safety rules: no passwords or payment info, no invented products, no medical/legal/political content); `backend/tools.py` (`Deps` dataclass holding just the logged-in user, if any; `search_products`, `get_product_detail`, `get_current_user` — the first two call the exact same `db.py` functions the HTTP routes use, via a refactor that moved `/api/products`' filtering logic into a shared `db.search_products`); `backend/agent.py` (`build_agent()` — loads the prompt from disk, builds an `OpenAIChatModel` through Portkey defaulting to `gpt-5.6-luna`, wires the tools, sets `output_type=ChatReply`); and new types in `backend/models.py` (`ChatTurn`, `ChatRequest`, `ChatReply` — deliberately holds `product_ids: list[str]`, not full product records, so the model can only echo back ids it actually saw from a tool call — and `ChatResponse`, which the route hydrates from the database right before sending). `main.py` now builds the agent once at import time inside a try/except (a bad or missing API key makes only `/api/chat` 503, not the whole app), reconstructs real PydanticAI `message_history` from the front end's resent transcript so the agent has genuine multi-turn memory across stateless HTTP requests, and hydrates `product_ids` into real `Product` rows via a new `db.get_product_summary` before responding. `ChatWidget.tsx` now sends the logged-in shopper's `user_id` (from `useAuth()`) with every message instead of the Problem 3 stub.

Verified with 9 scenarios run directly against the live `/api/chat` route, each checked against the actual database, not just "did it reply": a hoodie browse returns 10 real hoodies, all actually category Hoodies; "is the Basic Hoodie Big Yale in stock in a large?" correctly says yes (ground truth `L=8`); "do you have the Football Left Chest T Shirt in a medium?" correctly says it's out in M but lists the real in-stock sizes (`S=2, L=2, XXL=5`); a color not carried gets an honest "couldn't find" instead of an invented match; a shop fact outside the prompt (return policy) is declined rather than guessed; a password pasted into chat is refused and never echoed back; and — the one I was most worried about — a two-turn conversation asking about jackets then "what colors does **the first one** come in?" correctly resolved the reference across the stateless HTTP boundary and answered with the exact `colors` array from that product's catalogue row, confirming the `message_history` reconstruction actually works and isn't just independently-correct single turns. Logged-in personalization was verified twice: once in the test script (`user_id=1` → "signed in as Test"), and then again by hand in the real running browser — logged in through the real Login page, asked "is the Basic Hoodie Big Yale in stock in XL?" (got "yes... with 2 available," matching ground truth `XL=2`, with a real product card rendered under the reply), then asked "do you know who I am?" in the same conversation and got "you're signed in as Test User" using the real session, not a hardcoded value. `output/harness.md` has the full Problem 5 writeup.

## Problem 6 — Product info and stock

### Prompt(s) typed

> Given the agent tools that look up real information from `campus_customs.db`: product description, price, how many are in stock (by size when the customer asks). The agent must use the database — it should not invent prices or quantities. If a size is out of stock, say so clearly.
>
> Expand `prompts/prompt.md` so the agent knows to call these tools for price and stock questions. Add or update return types in `models.py`.
>
> In `output/harness.md`, list each tool and explain which model fields I chose for lookup results and why.

### What was lacking after the first prompt

No follow-up prompt was needed. The prompt describes an ability that Problem 5's single `get_product_detail` tool already mostly covered (it already pulled real price and per-size stock from the database — the honest "out of stock in medium" answers in Problem 5's own verification already worked). Rather than treat that as "already done, nothing to do," I read this problem as asking for the sharper version implied by its own wording — "by size **when the customer asks**" reads as its own distinct case, not just a rephrasing of the general stock question. So I split the one tool into two: `get_product_info` (renamed from `get_product_detail`, for description/price/full breakdown) and a new `check_size_stock(product_id, size)` for exactly that case, with explicit validation so a size that isn't real (a customer typing "size 9") gets an honest "that's not a real size" instead of a guessed quantity. I also swapped the tool's return type from the website's `ProductDetail` (built for rendering a page, so it carries `image_url`/`garment_type`/`search_tags` too) to a new, leaner `ProductLookup` — satisfying "add or update return types" with an actual reasoned choice of fields rather than reusing an existing type wholesale.

### Evidence of problem-by-problem work

This entry adds `ProductLookup` and `SizeAvailability` to `backend/models.py` (see their docstrings for the field-by-field reasoning — `ProductLookup` drops the display-only fields `ProductDetail` carries; `SizeAvailability`'s `valid_size` flag is what makes a nonsense size an honest refusal instead of a guess); renames `get_product_detail` to `get_product_info` in `backend/tools.py` (now returning `ProductLookup` via a new `_to_product_lookup` helper instead of the full `ProductDetail`) and adds `check_size_stock`; and rewrites the relevant section of `backend/prompts/prompt.md` into a new "Ability: product info and stock lookups" section naming all three lookup tools, when to use each, and two explicit, literal instructions from this problem's own wording: state a price exactly as returned, and state a `quantity=0` size as out of stock plainly, never softened.

Verified with four scenarios against the live `/api/chat` route, each checked against the real `inventory` table: a genuinely out-of-stock specific size (Football Left Chest T Shirt, M, ground truth 0) → "currently out of stock in medium"; a genuinely in-stock specific size with an exact count (Basic Hoodie Big Yale, S, ground truth 5) → "We have 5... in size small" — the literal number; a nonsense size ("size 9") → "Size 9 isn't a valid size for the Basic Hoodie Big Yale... sizes run from XS through XXL," confirming `valid_size=false` is actually used rather than an invented quantity; and a general stock question with no size named → the full per-size breakdown ("in stock in S, L, and XXL... out of stock in XS, M, and XL"), matching the database exactly rather than a flat yes. `output/harness.md` has the full Problem 6 writeup, including the tool-by-tool field table.

## Problem 7 — Chat search that updates the page

### Prompt(s) typed

> Now we will add a neat feature to the site. When a customer asks about a type of item — for example "what hoodies do you have?" — the agent should search the catalogue and the website should dynamically show those matching items as product cards (image, name, price, short info). This is an API contract: the agent returns structured product matches and then the front end renders them on the website. It looks really cool.
>
> After the dynamic product cards are loaded by this new feature, make sure the same single-item page behavior I built in Problem 3 still works: each product card — including the ones the chat just put on the page — should open that details view (large image + full info) when clicked.
>
> Update `prompts/prompt.md` and `output/harness.md` so it is clear how search results reach the page.

### What was lacking after the first prompt

No follow-up prompt was needed. The underlying API contract this prompt describes ("the agent returns structured product matches and then the front end renders them") was already built in Problem 5 — `ChatReply.product_ids` → hydrated `ChatResponse.products` — and already had a small rendering of it inside the chat bubble. What this prompt is actually asking for is a specific, more visible *consumer* of that existing contract: full cards (image, name, price, short info — exactly `<ProductCard>`'s shape) appearing on the page itself, not tucked into the narrow chat panel. I treated this as additive rather than a replacement: kept the existing in-chat thumbnails (still useful once the new shelf scrolls out of view) and built the new site-wide shelf alongside them, since nothing in the prompt said to remove what was already working.

### Evidence of problem-by-problem work

This entry adds `frontend/src/chatResults.tsx` (`ChatResultsProvider`/`useChatResults` — a small React context holding the agent's latest matches, readable from any route, since the chat panel floats over every page); `frontend/src/components/MatchShelf.tsx` (reads that context and renders a dismissible, page-level banner — eyebrow, a heading quoting the shopper's own question, and a grid of the matched products using the *exact same* `<ProductCard>` the Products page already uses — no new card markup, no new click-handling code); wires `ChatResultsProvider` into `main.tsx` alongside `AuthProvider`, and `<MatchShelf />` into `App.tsx` between the nav bar and the routed page content; and updates `ChatWidget.tsx` to call `showResults(message, products)` whenever a reply carries at least one product, leaving the shelf untouched on a reply with none (a greeting shouldn't erase a useful result from two turns ago). `backend/prompts/prompt.md` gets a new "Ability: search results appear live on the page" section making the existing `product_ids` mechanism explicit and adding one real behavioral instruction this problem implies but Problem 5/6 hadn't spelled out: a browsing question should surface *every* match found, not just the first one, since each id is now a visible card on the page.

Verified by hand in the real running browser, not just an API test: asked the real chat widget "What hoodies do you have?" and confirmed a `.match-shelf` appeared in the live DOM with the heading `Results for "What hoodies do you have?"` and exactly 10 real product cards (matching the reply text's own "27 hoodies available... first 10 options," both bounded by the same `MAX_SEARCH_RESULTS=10`). Clicked the first shelf card and landed on `/products/basic-hoodie-big-yale` with the correct price and the correct per-size stock breakdown — confirming the Problem 3 single-item page still works for a card the chat produced, with zero new code needed for that click to behave correctly, because the shelf reuses `<ProductCard>` verbatim. Also confirmed: the shelf persists across navigating to that detail page (a deliberate, not accidental, side effect of where the state lives), its dismiss button actually removes it, and reloading the plain Products page afterward still renders all 102 cards with no shelf and no console errors — no regression on what existed before this problem. `output/harness.md` has the full Problem 7 writeup.

## Problem 8 — Customer memory

### Prompt(s) typed

> When a shopper is logged in, save their chat history in the database in an appropriate table and reload it when they return. The agent should know WHO is chatting (name, email) — put that in agent deps (or an equivalent clear pattern) and/or tools the agent can call.
>
> Also pass enough page context that if someone is on a product page and asks "do you have this in pink?", the agent knows which item they mean. Hint: you can put code into the agent context.
>
> Guests can still chat, but history only needs to persist for logged in users.
>
> Document in `output/harness.md`: how user chat history is stored, what customer fields the agent sees, and how page context is passed.

### What was lacking after the first prompt

I did need one self-correction mid-problem, though no follow-up prompt from me was needed to prompt it — I caught and fixed it myself. The "appropriate table" the prompt gestures at is `chat_messages`, which I'd flagged all the way back in Problem 1/2 as present in the seed data but unused — this was finally the problem to use it, with zero schema changes. For "who's chatting," I didn't just reuse Problem 5's existing `get_current_user` tool and call it done — the hint's phrasing ("deps... and/or tools") and the page-context hint ("put code into the agent context") pointed at something more deterministic than hoping the model calls a tool: PydanticAI's `@agent.instructions` dynamic system-prompt mechanism, which runs fresh on every model request from that request's own `Deps`. I used the same mechanism for both who's-chatting and page-context, in one function, so the pattern is consistent.

The self-correction: my first working version tested perfectly standalone (calling `agent.run()` directly in a script) but failed completely over HTTP — "do you have this in pink?" with page context set came back asking which item, as if the context wasn't there at all. Before concluding the dynamic-instructions approach was broken, I checked what was actually serving port 8001, and found a **stale leftover server process from earlier in this session** was still bound there, silently serving every request with the old pre-Problem-8 code, while my actual restarts had been failing to bind the port and dying in the background the whole time — a process-management bug, not a logic bug. Killed it, confirmed the new `/api/chat/history` route actually existed before trusting any more test output, and the exact same test then passed cleanly.

### Evidence of problem-by-problem work

This entry adds, in `backend/db.py`: `save_chat_message` (appends to `chat_messages`, only ever called for a logged-in `user_id`) and `get_chat_history` (reads back oldest-first, re-hydrating every product by id from the live catalogue rather than trusting whatever shape the stored JSON happens to be in — which matters because it lets the three pre-existing seed rows, which predate this problem's exact JSON shape, load back in without special-casing). In `backend/models.py`: `PageContext`, `ChatRequest.page_context`, and `StoredChatMessage`. In `backend/tools.py`: `Deps.page_product`, resolved server-side and never trusted as a ready-made value from the client. In `backend/agent.py`: `conversation_context`, a `@agent.instructions` function stating who's logged in and which product page (if any) is open, on every request — with an explicit instruction that this note only identifies *which* product "this" means, never a substitute for calling `get_product_info`/`check_size_stock` for what's actually true about it. In `backend/main.py`: the chat route now resolves `page_context` into a real `Product`, saves both halves of a turn after a successful run, and a new `GET /api/chat/history` route. On the front end: `src/pageContext.tsx` (tracks the open product page), wired into `ProductDetailPage.tsx` (set on mount, cleared on unmount) and `ChatWidget.tsx` (sent with every message); and `ChatWidget.tsx` also now reloads a logged-in shopper's history on login/page-load (with a small "continuing from your last visit" divider) and resets to the plain greeting on logout, so one account's history can never show up for whoever uses a shared browser next.

Verified with a script against the live API: page context resolved "do you have this in pink?" to the exact product on that page with no name given, while the identical question with no page context correctly asked for clarification instead of guessing; a different page context resolved to a different product with the correct price; a two-turn conversation as a throwaway signed-up account produced exactly 4 `chat_messages` rows in order, and `GET /api/chat/history` returned all 4 with products re-hydrated from the current catalogue; a guest message left the table's row count completely unchanged; an unknown user's history came back `[]`, not an error. Then, by hand in the real browser: logged in as the seeded `test@campuscustoms.yale.edu` and watched the chat panel reload that account's **actual pre-existing seed conversation** from the original data pack under the "continuing from your last visit" divider — not new data, a real read of what was already there. Navigated to the Benjamin Franklin Fleece Jacket's page, asked "do you have this in purple?" with the jacket never named, and got the correct, honest color list for that exact product, with both the Problem 7 shelf and the in-chat card showing it. Logged out and confirmed the panel reset to the plain greeting rather than leaking the previous account's history. All rows created during testing (one throwaway account, one extra real turn against the seeded test user) were deleted afterward — `chat_messages` and `users` are back to exactly their original seed counts. `output/harness.md` has the full Problem 8 writeup.

## Problem 9 — Usability improvements

### Prompt(s) typed

> Now that the core shop works, improve it. Choose and implement: 2 front-end usability improvements, 2 agent/backend usability improvements.
>
> Front end improvements are things that make the site look better and make it easier to use. Agent/backend improvements are things that make the agent output better, more accurate, or safer — these could be new agent tools or things that make the agent run faster or cheaper.
>
> Write `output/usability.md` before or as I build. For each improvement, say what I added and why it helps a Campus Customs shopper or the business. Then make sure all improvements actually show up in the running app.

### What was lacking after the first prompt

No follow-up prompt was needed. The prompt leaves "choose" genuinely open, so the main judgment call was picking four improvements that were each real and distinct — not padding, and not something already built incidentally by an earlier problem. For the backend pair specifically, I deliberately picked one from each of the prompt's two listed categories (accuracy/safety, and cost/speed) rather than two similar ones, so the pair actually demonstrates the full range the problem describes. Both backend picks also grew directly out of gaps this project's own earlier problems created: Problem 8's persistence makes a long-time shopper's resent history grow forever (motivating the history cap), and the existing grounding rule was enforced only as "does this id exist," never "did we actually look at it this turn" (motivating the stricter check) — so neither improvement is arbitrary, each closes a real gap this specific app already had.

### Evidence of problem-by-problem work

This entry adds, front-end: a sort control on `/products` (`src/pages/Products.tsx:sortProducts` — Price ↑/↓, Name A–Z/Z–A, written into the URL like the existing category/search filters) and a localStorage-backed favorites/wishlist (`src/favorites.tsx`, a heart toggle added to `ProductCard.tsx`, and a "Favorites" filter chip on the Products page) — no account or backend change needed, and because every product card in the app already shares one `<ProductCard>` component, the heart shows up on Home's featured row and the Problem 7 match shelf automatically. Backend: `agent.py:extract_surfaced_product_ids` parses `result.all_messages()` to find every `product_id` that actually came out of a product-surfacing tool call this run, and `main.py`'s chat route now intersects the agent's own `product_ids` output against that set — tightening the existing "does this id exist in the catalogue" check into "did a tool actually surface this id just now," a stricter, code-enforced version of the grounding rule the system prompt already states in words. Also in `agent.py`: `MAX_HISTORY_MESSAGES = 20`, and `main.py:_to_message_history` now takes only the most recent 20 messages of whatever history is sent, capping the token cost of every future turn regardless of how long a shopper's persisted history (Problem 8) has grown.

Verified each of the four directly. Sort: toggled the dropdown through all four non-default options against the live site and confirmed the rendered price order flips correctly both directions. Favorites: hearted two real products through the live DOM, confirmed `localStorage` held exactly those two ids, confirmed the Favorites chip narrowed the grid to exactly those two, confirmed the state survived a full page reload, and confirmed the heart also renders on the Home page's featured cards (same component, zero extra code). Grounding verification: unit-tested `extract_surfaced_product_ids` against constructed tool-return messages — confirmed it collects ids from `search_products`/`get_product_info` payloads and correctly ignores `get_current_user`'s unrelated text — then confirmed against the live `/api/chat` route that an ordinary hoodie browse still returns all 10 real, grounded cards, proving the stricter check doesn't drop legitimate results. History cap: unit-tested `_to_message_history` with 60 constructed turns and confirmed exactly the most recent 20 (`msg 40`–`msg 59`, not an arbitrary 20) are what's kept, then sent a live request with 60 history messages attached and confirmed it still answers correctly rather than erroring under the larger payload. `output/usability.md` has the full writeup for all four, in the "what I added / why it helps" format the problem asked for.

## Problem 10 — Style the website

### Prompt(s) typed

> Add creative design so the site feels like a real Campus Customs storefront — fonts, color, hierarchy, motion, product presentation, chat feel.
>
> Make it an extremely innovative and imaginative design.
>
> Write `output/design.md`: what I changed and why it should help customers stick around and buy. Keep it concrete and short.

### What was lacking after the first prompt

No follow-up prompt was needed. "Extremely innovative and imaginative" with no further constraint is the main judgment call here, so I anchored the whole pass to one real, specific idea rather than a grab-bag of trendy effects: Campus Customs' own identity, established since Problem 3, is that it's a screen-printing and embroidery shop, not a generic retailer — so the design language became halftone dot textures, stitched/patch-style badges, and an ink-stamp badge, literally the visual signature of the shop's own trade, rather than borrowed e-commerce tropes with no connection to this specific business.

### Evidence of problem-by-problem work

This entry adds, CSS: a new `:root` palette addition (`--brick`, `--parchment`), Fraunces as the display serif (Google Fonts, graceful fallback to the prior stack), a halftone dot texture on the hero/chat header/footer, a `.patch` dashed-border badge style reused for category tags, scroll-reveal utility classes, a site-wide marquee ticker, product-card image zoom-on-hover and a `heart-pop` keyframe for the favorite button, and a full chat redesign (speech-bubble tails via `::after`, a green "online" dot, a gold top accent on the panel, launcher entrance + pulse-ring animations). New components: `src/components/Marquee.tsx` (shop-window ticker, real shop facts, pure-CSS infinite loop) and `src/components/Reveal.tsx` (IntersectionObserver wrapper used throughout `Home.tsx`). New `src/colorSwatches.ts` maps the catalogue's real color vocabulary to small dots on every product card — unlisted colors fall back to a neutral gray dot with the real name in `title` rather than a guessed hex, so nothing is ever visually misrepresented. `Home.tsx` gains an "EST. 1975" stamp badge in the hero and a new "Shop by category" icon-tile section pulled from the live `/api/categories` (not hardcoded). `ChatWidget.tsx` gains a one-time, auto-dismissing nudge bubble ("👋 Looking for something? I know the whole shop.") a few seconds after page load, and an online-status dot in its header.

Verified live in the browser via both screenshots and direct DOM/computed-style checks (screenshots were briefly unreliable mid-session due to the preview pane losing focus — confirmed via the tool's own warning, not a site bug — so I cross-checked every claim against computed styles too, not just one or the other): Fraunces loads and applies at `font-weight: 900` on `h1`; the halftone texture renders as a visible dot grid in the hero; the marquee ticker scrolls with the correct shop facts; all 6 category tiles render with icons and link to the right filtered `/products` URL; product-card color swatches render the correct real hex per color name (`navy blue` → `#00356b`, `white` → `#ffffff`) with the category tag rendering as a dashed-border patch; the favorite button's `heart-pop` animation fires on click; the chat panel's bubble tails have the correct `clip-path`, its header shows the green online dot, and its border carries the gold top accent. Regression-checked that nothing broke: all 102 Products cards still render, sort and favorites (Problem 9) still work, the single-item detail page (Problem 3) still renders correctly with real data, and the layout holds at 375px mobile width. `npm run build` and `tsc -b` both pass clean. `output/design.md` has the short, concrete "what changed / why it helps" writeup for each piece.

## Problem 11 — Test the live site and document it

### Prompt(s) typed

> Test the live site and document it in `output/app_check.html` (a page I can double-click open). Include clear screenshots and short captions for: (1) chat checking the inventory level of an item (honest stock/price from the DB), (2) the dynamic search-result cards appearing after a category question (e.g. hoodies), (3) one of the usability features I added in Problem 9.
>
> Make the HTML easy to grade: heading for each check, screenshot, one or two sentences on what the screenshot proves.
>
> Put the screenshot image files in `output/app_check_images/` and link them from `app_check.html` with relative paths.

### What was lacking after the first prompt

No follow-up prompt was needed, but this problem had a real tooling gap to solve first, not just content to write: the preview browser tools I'd used for every earlier problem's verification render to an internal pane and hand me an image to look at — they don't save a real file to disk, and this problem specifically needs real PNG files committed under `output/app_check_images/` with stable relative paths, openable by double-clicking the HTML with no server running. I checked for an existing solution before building one: this machine already had Playwright's Chromium binary cached (from some earlier, unrelated work), so I installed the `playwright` Python package into the project's own `.venv` and used a real, separate browser automation session — not the harness's preview pane — to drive the actual running site and call `.screenshot(path=...)` directly to disk. That also meant catching one real connectivity surprise: the Vite dev server was listening on `[::1]:5174` (IPv6 loopback only), so a plain `http://127.0.0.1:5174` from Playwright (and from a PowerShell sanity check) connection-refused; `http://localhost:5174` resolved correctly and worked.

### Evidence of problem-by-problem work

This entry adds `output/app_check.html` (three numbered checks, each a heading, a screenshot, a one-to-two-sentence caption on what it proves, plus a small "ground truth" callout citing the exact database row or source file the claim is checked against) and `output/app_check_images/` with three real PNGs captured against the actual running site (real FastAPI backend, real SQLite data, real PydanticAI agent call — nothing mocked): `inventory_check.png` (asked "What's the price of the Football Left Chest T Shirt, and do you have a medium in stock?" and captured the honest reply, "$32... Medium is currently out of stock," matching `catalogue.price=32.0` and `inventory.quantity=0` for that exact product/size row); `search_results.png` (asked "What hoodies do you have?" and captured the Problem 7 match shelf with all 10 real hoodie cards appearing on the page, capped by the same `MAX_SEARCH_RESULTS=10` the reply text itself cites); and `favorites_filter.png` (hearted two real products on the Products page, clicked the Problem 9 Favorites chip, and captured the grid correctly narrowed to exactly those two with the "Favorites (2)" count showing).

Verified the deliverable itself, not just the screenshots inside it: opened `app_check.html` via a real `file://` URL (the literal double-click scenario, no dev server involved) in a fresh Playwright page and confirmed all three `<img>` tags actually resolve and decode (non-zero `naturalWidth` on each) using the relative paths as written, and that all three headings render as expected. That rules out the most likely way this kind of deliverable silently breaks — an absolute or dev-server-relative path that only happens to work while a server is running.

## Problem 12 — Audit trail, safety, finish harness

### Prompt(s) typed

> Keep an append-only `output/audit_trail.json` of agent-loop activity (time, tool name, short args/result, stop reason). Do not wipe it between runs.
>
> Also, think of some safety rules to give the agent and put them in `prompts/prompt.md`.
>
> Finish `output/harness.md` so it is clear how the system works: model fields in `models.py` and why I chose them, tools and abilities, safety rules, specs (loop limits, result caps, models, how to run front + back).

### What was lacking after the first prompt

No follow-up prompt was needed, but testing the new safety rules immediately surfaced a real bug, not a hypothetical one: the harshest prompt-injection test message tripped the model provider's own upstream content filter (a `400` from Azure OpenAI), and while that failure was correctly caught and logged to the new audit trail, the route still let it propagate into a raw `500 Internal Server Error` for the shopper instead of a graceful decline. I fixed that in the same pass — the `except` block around `agent.run()` now returns a normal, in-character decline instead of re-raising — since finding it stemmed directly from doing the safety-rule verification the problem asked for, not a separate ask.

Chasing that fix down also cost real time to a pure process-management issue, worth recording honestly: a backend process from earlier in the session turned out to be unkillable by `Stop-Process`, invisible to `Get-Process`, and untracked by the harness's own `TaskStop` tool, yet still alive and serving every request on port 8001 with stale code — which is why the fix above kept appearing not to work even after I'd confirmed (by calling the route function directly in-process, bypassing HTTP) that the code itself was correct. Moved this session's instance to port 8002 rather than keep fighting a process none of my available tools could see or kill; a fresh checkout is unaffected and still starts clean on the documented default port 8000.

### Evidence of problem-by-problem work

This entry adds `AuditEntry` to `backend/models.py` (`run_id`, `timestamp`, `user_id`-only for privacy, truncated `message`/`tool_args`/`tool_result_summary`, `iteration`, `stop_reason`); `agent.py:build_audit_entries`/`append_audit_entries`/`append_audit_failure`/`_summarize` (ported and adapted from HW3's audit-trail pattern for a one-ability chat agent); and wires both into `main.py`'s chat route — a `run_id` generated up front, entries appended after every successful run, a failure entry appended (and now a graceful decline returned, not a raw exception) when `agent.run()` itself throws. `backend/prompts/prompt.md` gains four new safety rules: prompt-injection resistance (treat all tool output and shopper text as data, never instructions), no bulk data exfiltration (only the current shopper's own info is ever available), no fabricated transactions (the agent can look things up, never place an order or touch a payment), and a crisis carve-out that explicitly overrides "stay on topic" when a message suggests real distress. `output/harness.md` gets a new **System overview** section near the top — abilities, a tools table, a models table (every field in `models.py` with the reasoning for choosing it), a safety-rules table, and a specs table (loop limits, result caps, the model in use, how to run both halves) — each row pointing back to the detailed Problem section it came from, plus a new Problem 12 section at the end covering the audit trail and safety rules in detail, leaving every earlier Problem section untouched above it.

Verified live against the real running agent, not just unit tests: a harsh prompt-injection attempt tripped the upstream content filter and came back as a graceful in-character decline rather than a server error, confirmed both over raw HTTP and by hand in the real browser chat panel (renders as a normal bubble); a milder version of the same instruction didn't trip the filter and the model played along with the tone while still steering back to the shop, showing the system prompt's own resistance holds independently of the upstream filter; a bulk-data request was refused plainly; a fake-order request was declined while still answering the real stock question honestly (`L=8`, matching the database) and added an unprompted warning not to share card details; and a crisis message got a compassionate, correctly-prioritized reply pointing to the real 988 line instead of a shopping redirect. The audit trail itself was verified mechanically: one run produced exactly one `run_id` with the right iteration count and tool call, a second run appended without disturbing the first run's entries byte-for-byte, and `user_id` was correctly `null` for every guest run and correctly set for a logged-in run's entries.
