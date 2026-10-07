# Campus Customs — shop + chatbot

A customer-facing website for Campus Customs (Yale Bulldog Blue), built for MGT 409 HW 4.
React + Vite + TypeScript front end, FastAPI back end, SQLite catalogue, PydanticAI shop agent.

## What is here

```
backend/
  main.py           FastAPI app — all routes. Run this with uvicorn.
  db.py             all SQLite reads/writes (products, inventory, accounts, chat
                    history) — one copy, shared by the HTTP routes and the agent's tools
  auth.py           password hashing (PBKDF2-HMAC-SHA256)
  models.py         Pydantic types shared by the API and the agent, and why each
                    field was chosen (see output/harness.md for the full table)
  agent.py          the agent's entry point — loads the model, the system prompt,
                    dynamic per-request instructions, and the audit-trail logic
  tools.py          the agent's tools (search_products, get_product_info,
                    check_size_stock, get_current_user)
  prompts/prompt.md the agent's system prompt — voice, abilities, and safety rules
                    live here, in plain text, not buried in code
frontend/           React + Vite + TypeScript — pages, components, and small
                    per-feature contexts (auth, favorites, chat results, page context)
output/
  harness.md        the full system writeup — database schema, every tool and model
                    field (and why), safety rules, specs, how to run everything
  usability.md      four usability improvements (two front-end, two agent/backend)
  design.md         the visual design pass and why it should help a shopper buy
  app_check.html    screenshotted proof the live site works — open directly in a
                    browser, no server needed
  audit_trail.json  append-only log of every agent-loop iteration (tool calls,
                    args, results, stop reason) — never wiped between runs
AI_prompts.md       the prompt log for this assignment, one section per problem
.env.example        copy to .env and fill in your own Portkey API key
```

`data/` is **not** in this repo — see Setup below.

## Setup

### 1. Get the code

```bash
git clone git@github.com:rahijoshi/hw4.git
cd hw4
```

(Or, over HTTPS: `git clone https://github.com/rahijoshi/hw4.git`.)

### 2. Place the data pack

This repo does not include the database or product photos (by design — see
`.gitignore`). You need a `data/` folder, at the repo root, shaped like this:

```
data/
  campus_customs.db   SQLite database — catalogue, inventory, users, chat_messages
  products/            product photos referenced by the catalogue's image paths
```

Unzip the data pack you were given for this assignment directly into the repo root
so that `data/campus_customs.db` and `data/products/` end up exactly there, next to
`backend/` and `frontend/`.

### 3. Set up the backend (Python 3.13)

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r backend/requirements.txt    # Windows
# source .venv/bin/activate && pip install -r backend/requirements.txt   # macOS/Linux
```

### 4. Add your API key

```bash
cp .env.example .env
```

Open `.env` and fill in a real `PORTKEY_API_KEY`. Without it, the site still runs —
every route works except `POST /api/chat`, which returns a `503` instead of crashing
the whole app.

### 5. Set up the frontend (Node 18+)

```bash
npm install --prefix frontend
```

## Running

Two processes, both from the repo root.

**Backend:**

```bash
cd backend
../.venv/Scripts/python -m uvicorn main:app --reload --port 8000    # Windows
# ../.venv/bin/python -m uvicorn main:app --reload --port 8000          # macOS/Linux
```

**Frontend** (in a second terminal, from the repo root):

```bash
npm run dev --prefix frontend
```

Open the URL Vite prints (typically `http://localhost:5173`). The dev server proxies
`/api` and `/images` to the backend on port 8000, so the browser only ever makes
same-origin requests — no CORS setup needed.

If port 8000 or 5173 is already in use on your machine, set `VITE_API_TARGET`
(e.g. `VITE_API_TARGET=http://127.0.0.1:8001`) before starting the backend on that
port instead, and/or `PORT` to run Vite on a different port.

## API

| Route | Purpose |
| --- | --- |
| `GET /api/health` | Confirms the database is reachable |
| `GET /api/products` | All products; `?category=` and `?q=` narrow it |
| `GET /api/categories` | Category names that have products behind them |
| `GET /api/products/{id}` | One product with per-size stock |
| `GET /images/{file}` | Product photos from `data/products/` |
| `POST /api/auth/signup` | Create an account — `201`, or `409` if the email is taken |
| `POST /api/auth/login` | `200` with the user, or `401` (same message either way — no account enumeration) |
| `POST /api/chat` | Ask the shop assistant something; returns `{ reply, products }` |
| `GET /api/chat/history` | A logged-in shopper's saved conversation, reloaded on return |

## Status

All twelve problems for this assignment are done — database analysis, the website,
accounts, a real PydanticAI chat agent grounded in the catalogue, product-info/stock
tools, dynamic search-result cards, persisted customer memory, four usability
improvements, a full visual design pass, a screenshotted live-site check, and an
append-only agent audit trail with additional safety rules.

See `output/harness.md` for the complete system writeup (schema, every tool and model
field with reasoning, safety rules, specs), `output/usability.md` and `output/design.md`
for the usability/design passes, `output/app_check.html` for screenshotted proof the
live site works, and `AI_prompts.md` for the full prompt-by-problem log.
