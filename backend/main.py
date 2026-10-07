"""Campus Customs API.

Problem 3 added the catalogue and product photos. Problem 4 added accounts.
Problem 5 adds the chat agent (agent.py / tools.py / models.py / prompts/)
behind POST /api/chat — this file keeps growing, it doesn't get replaced.

Run from the backend/ folder:
    uvicorn main:app --reload --port 8000

(This dev machine had port 8000 already held by another session throughout
this project, so testing used `--port 8001` instead — see README.md. By
Problem 12, something on this same shared machine was also holding 8001 in
a way neither Stop-Process nor the harness's own task tracker could see or
kill, so this session's instance finally moved to `--port 8002`. None of
this affects a normal checkout: the documented default above is what a
fresh clone should actually run. The frontend's Vite proxy target is
overridable via VITE_API_TARGET for exactly this kind of port conflict.)
"""

from __future__ import annotations

import logging
import sqlite3
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic_ai.messages import ModelMessage, ModelRequest, ModelResponse, TextPart, UserPromptPart
from pydantic_ai.usage import UsageLimits

import agent as shop_agent
import auth
import db
from models import (
    ChatReply,
    ChatRequest,
    ChatResponse,
    ChatTurn,
    LoginRequest,
    Product,
    ProductDetail,
    SignupRequest,
    StoredChatMessage,
    UserPublic,
)
from tools import Deps

logger = logging.getLogger("campus_customs")

app = FastAPI(
    title="Campus Customs API",
    description="Catalogue, inventory and (soon) the Bulldog Blue chat agent.",
    version="0.1.0",
)

# The Vite dev server proxies /api and /images, so this is only needed when
# the API is hit directly from a browser on another port.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Built once at import time and reused for every /api/chat call. If the API
# key is missing or bad, the whole app still starts — only /api/chat 503s —
# so a broken agent config can't take the storefront down with it.
try:
    _chat_agent = shop_agent.build_agent()
    _chat_agent_error: str | None = None
except Exception as exc:  # e.g. PORTKEY_API_KEY not set
    _chat_agent = None
    _chat_agent_error = str(exc)
    logger.warning("Chat agent did not load: %s", exc)


@app.get("/api/health")
def health() -> dict:
    """Quick check that the database is actually reachable."""
    with db.connect() as con:
        count = con.execute("SELECT COUNT(*) FROM catalogue").fetchone()[0]
    return {"status": "ok", "products": count}


@app.get("/api/products", response_model=list[Product])
def get_products(category: str | None = None, q: str | None = None) -> list[Product]:
    """The catalogue. Optionally narrowed by category or a text query.

    Same `db.search_products` the chat agent's tool calls — see backend/tools.py.
    """
    return db.search_products(category=category, q=q)


@app.get("/api/categories", response_model=list[str])
def get_categories() -> list[str]:
    """Category names that actually have products behind them, in shop order."""
    present = {p.category for p in db.list_products()}
    return [c for c in db.CATEGORY_ORDER if c in present]


@app.get("/api/products/{product_id}", response_model=ProductDetail)
def get_product(product_id: str) -> ProductDetail:
    """One product, with per-size stock for the single-item page."""
    product = db.get_product(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail=f"No product with id '{product_id}'")
    return product


@app.post("/api/auth/signup", response_model=UserPublic, status_code=201)
def signup(body: SignupRequest) -> UserPublic:
    """Create an account. Writes into the same `users` table the seed data lives in."""
    if body.password != body.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    password_hash = auth.hash_password(body.password)
    try:
        return db.create_user(body.first_name, body.last_name, body.email, password_hash)
    except sqlite3.IntegrityError:
        # users.email has a UNIQUE constraint — this is what fires.
        raise HTTPException(status_code=409, detail="An account with that email already exists.")


@app.post("/api/auth/login", response_model=UserPublic)
def login(body: LoginRequest) -> UserPublic:
    """Verify an email/password pair against the users table.

    Deliberately returns the same error for 'no such email' and 'wrong
    password' — telling the two apart lets an attacker enumerate accounts.
    """
    row = db.get_user_row_by_email(body.email)
    if row is None or not auth.verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return db.row_to_user_public(row)


def _to_message_history(history: list[ChatTurn]) -> list[ModelMessage]:
    """Rebuild PydanticAI's message history from the front end's transcript.

    There is no server-side chat session — ChatWidget.tsx resends the whole
    conversation with every message (see src/components/ChatWidget.tsx) —
    so this is what gives the agent real multi-turn memory across what are,
    underneath, separate stateless HTTP requests.

    Capped to the most recent MAX_HISTORY_MESSAGES (Problem 9 usability
    improvement — see agent.py): Problem 8's persistence means a returning
    shopper's `history` can keep growing across every visit for as long as
    they shop here, and the front end resends all of it. Without this cap,
    the token cost of every single future turn grows forever along with it.
    """
    recent = history[-shop_agent.MAX_HISTORY_MESSAGES :]
    messages: list[ModelMessage] = []
    for turn in recent:
        if turn.role == "user":
            messages.append(ModelRequest(parts=[UserPromptPart(content=turn.content)]))
        else:
            messages.append(ModelResponse(parts=[TextPart(content=turn.content)]))
    return messages


@app.post("/api/chat", response_model=ChatResponse)
async def chat(body: ChatRequest) -> ChatResponse:
    """The shop chatbot. See agent.py / tools.py / prompts/prompt.md for how it thinks."""
    if _chat_agent is None:
        raise HTTPException(status_code=503, detail=f"Chat agent is not configured: {_chat_agent_error}")

    user = db.get_user_by_id(body.user_id) if body.user_id else None

    # The client says which product_id the shopper is looking at, but the
    # actual Product the agent sees is always a fresh database lookup, not
    # whatever the client claims — same trust boundary as everywhere else
    # in this app. A stale/unknown id just means no page context, not an error.
    page_product = (
        db.get_product_summary(body.page_context.product_id)
        if body.page_context and body.page_context.product_id
        else None
    )
    deps = Deps(user=user, page_product=page_product)

    # Problem 12: every run gets a run_id up front so a failure can still be
    # traced in the audit trail even though there's no result to build
    # entries from yet.
    run_id = str(uuid.uuid4())
    try:
        result = await _chat_agent.run(
            body.message,
            deps=deps,
            message_history=_to_message_history(body.history),
            usage_limits=UsageLimits(request_limit=shop_agent.MAX_MODEL_REQUESTS),
        )
    except Exception as exc:
        # Caught here, not left to become a raw 500: a message the model
        # provider itself rejects (e.g. its own content filter tripping on
        # something that reads like a prompt-injection attempt) is still
        # logged to the audit trail as a failure, but the shopper gets a
        # plain, in-character decline instead of a server error — found by
        # testing the new prompt-injection safety rule, not hypothetical.
        shop_agent.append_audit_failure(run_id, body.user_id, body.message, exc)
        logger.warning("Chat run %s failed: %s", run_id, exc)
        return ChatResponse(
            reply="Sorry, I couldn't process that one. Try asking about Yale merch — what we carry, "
            "what it costs, or whether it's in your size.",
            products=[],
        )
    reply: ChatReply = result.output

    # Append-only audit trail (Problem 12) — one entry per agent-loop
    # iteration this run took (tool calls and the final answer), written
    # after every successful run, never wiped. See agent.py for the fields.
    shop_agent.append_audit_entries(
        shop_agent.build_audit_entries(run_id, body.user_id, body.message, result.all_messages())
    )

    # Usability improvement (Problem 9, backend #1 — more accurate/safer):
    # don't just check that each product_id exists somewhere in the
    # catalogue — check that it actually came out of a tool call this run.
    # See agent.py:extract_surfaced_product_ids for why this is a stricter,
    # code-enforced version of the system prompt's grounding rule, not a
    # duplicate of it.
    surfaced = shop_agent.extract_surfaced_product_ids(result.all_messages())

    # Hydrate product_ids into real catalogue rows here, not in the agent's
    # own output — a price or image path the model might get wrong is never
    # what reaches the browser; only looked-up data is. Unknown ids, and now
    # also ids that were never actually surfaced by a tool this turn, are
    # silently dropped rather than surfaced as an error to the shopper.
    products = [
        p for pid in reply.product_ids if pid in surfaced and (p := db.get_product_summary(pid)) is not None
    ]

    # Persisted only for logged-in shoppers (see db.save_chat_message) —
    # guests chat without this ever touching the database. Both halves of
    # the turn are saved together, only after a successful run, so a failed
    # agent call never leaves a user message with no reply beside it.
    if user is not None:
        db.save_chat_message(user.id, "user", body.message)
        db.save_chat_message(user.id, "assistant", reply.reply, products)

    return ChatResponse(reply=reply.reply, products=products)


@app.get("/api/chat/history", response_model=list[StoredChatMessage])
def chat_history(user_id: int) -> list[StoredChatMessage]:
    """What ChatWidget.tsx reloads when a logged-in shopper returns.

    Empty for a guest or an unknown id, rather than an error — the front
    end doesn't need to special-case "not logged in" vs. "no history yet,"
    both just mean an empty transcript.
    """
    return db.get_chat_history(user_id)


# Product photos. The catalogue stores 'products/<id>.jpg', so mounting the
# products folder at /images makes every image_url resolve directly.
if db.PRODUCTS_DIR.exists():
    app.mount("/images", StaticFiles(directory=db.PRODUCTS_DIR), name="images")
