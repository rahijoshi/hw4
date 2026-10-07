"""Pydantic types shared by the API (and, from Problem 5, the agent's tools).

Everything the shop shows a customer flows through one of these, so the
structure stays the same whether a human clicked a link or the agent
looked something up.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

# The only sizes the inventory table uses, in the order a shopper expects.
SIZE_ORDER: list[str] = ["XS", "S", "M", "L", "XL", "XXL"]


class SizeStock(BaseModel):
    """Stock for one size of one product."""

    size: str = Field(description="XS, S, M, L, XL or XXL")
    quantity: int = Field(description="Units on hand; 0 means out of stock in this size")

    @property
    def in_stock(self) -> bool:
        return self.quantity > 0


class Product(BaseModel):
    """A catalogue row, cleaned up for display.

    `colors` and `search_tags` are stored in SQLite as JSON-encoded strings;
    they are parsed into real lists here so no caller has to remember to.
    """

    product_id: str
    name: str
    garment_type: str = Field(description="Raw free-text type from the catalogue")
    category: str = Field(description="Normalised family, e.g. Hoodies — see db.normalise_category")
    description: str
    colors: list[str]
    search_tags: list[str]
    price: float
    image_url: str = Field(description="Path the browser can load the product photo from")


class ProductDetail(Product):
    """A product plus its per-size stock, for the single-item page."""

    sizes: list[SizeStock]
    total_quantity: int
    sizes_in_stock: list[str]
    sizes_out_of_stock: list[str]


# ---------- Accounts ----------


class UserPublic(BaseModel):
    """Everything about a user that is safe to send to the browser.

    No `password_hash` field exists here on purpose — this is the type every
    auth route returns, so there is no code path that can accidentally leak
    a hash to the front end.
    """

    id: int
    first_name: str
    last_name: str
    name: str
    email: str
    created_at: str


class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    confirm_password: str

    @field_validator("first_name", "last_name")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("required")
        return v

    @field_validator("email")
    @classmethod
    def looks_like_email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or v.startswith("@") or v.endswith("@"):
            raise ValueError("enter a valid email address")
        return v

    @field_validator("password")
    @classmethod
    def long_enough(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalise_email(cls, v: str) -> str:
        return v.strip().lower()


# ---------- Chat ----------


class ChatTurn(BaseModel):
    """One earlier turn of the conversation, as the front end remembers it.

    The widget keeps its own running transcript (see ChatWidget.tsx) and
    resends it with every message, since there is no server-side chat
    session — this is how the agent gets real multi-turn memory across
    separate HTTP requests.
    """

    role: Literal["user", "assistant"]
    content: str


class PageContext(BaseModel):
    """What page the shopper is on, as far as the agent needs to know.

    Just a `product_id` for now — the minimum needed so "do you have this
    in pink?" on a product page resolves to that product (see
    agent.py's dynamic instructions). Its own type rather than a bare
    string so a second kind of page (a category listing, say) can add a
    field here later without changing `ChatRequest`'s shape.
    """

    product_id: str | None = None


class ChatRequest(BaseModel):
    message: str
    history: list[ChatTurn] = Field(default_factory=list)
    user_id: int | None = Field(
        default=None, description="The logged-in shopper's id, if any — lets the agent greet them by name."
    )
    page_context: PageContext | None = Field(
        default=None, description="Which product page (if any) the shopper is currently looking at."
    )


class ChatReply(BaseModel):
    """The agent's own structured output (`agent.run(..., output_type=ChatReply)`).

    Deliberately holds `product_ids`, not full `Product` records — the agent
    should only ever echo back ids it actually saw come out of a tool call.
    The route hydrates those ids into real `Product` rows from the database
    before they reach the browser, so a price or image path the model might
    get wrong is never what the shopper sees; only looked-up data is.
    """

    reply: str
    product_ids: list[str] = Field(default_factory=list)


class ChatResponse(BaseModel):
    """What `POST /api/chat` sends to the browser — matches the shape
    ChatWidget.tsx already expects: `{ reply, products }`."""

    reply: str
    products: list[Product] = Field(default_factory=list)


class StoredChatMessage(BaseModel):
    """One row of `chat_messages`, as `GET /api/chat/history` returns it.

    Shaped like `ChatTurn` plus the products attached to that turn, so the
    front end can drop these straight into the same message list it already
    renders — a reloaded past message and a live one look identical to the
    widget. `products` is re-hydrated from the database at read time (see
    db.get_chat_history), not deserialized verbatim from the stored JSON, so
    a reloaded card always shows today's price and stock, not the day it was
    chatted about.
    """

    role: Literal["user", "assistant"]
    content: str
    products: list[Product] = Field(default_factory=list)
    created_at: str


# ---------- Product lookup tools (Problem 6) ----------


class ProductLookup(BaseModel):
    """What `get_product_info` returns — the agent's tool, not the website's.

    Deliberately leaner than `ProductDetail`: no `image_url`, `garment_type`,
    `category`, or `search_tags`. None of those help answer a description,
    price, or stock question — carrying them anyway would just cost tokens
    on every tool call and give the model more surface area to misquote
    (e.g. reading `garment_type` as if it were a stock figure). The fields
    kept here are exactly the three things Problem 6 asks the agent to look
    up: description, price, and stock — both overall and broken out by size,
    since "in stock" alone doesn't answer the question a shopper usually has.
    """

    product_id: str
    name: str
    description: str
    price: float
    colors: list[str]
    sizes: list[SizeStock]
    sizes_in_stock: list[str]
    sizes_out_of_stock: list[str]
    total_quantity: int


class SizeAvailability(BaseModel):
    """What `check_size_stock` returns for one specific size.

    A direct, unambiguous answer to "how many of size X do you have" —
    deliberately its own type rather than making the model pick one entry
    out of `ProductLookup.sizes` itself. `valid_size` is the field that
    makes a nonsense size (a customer typing "XXXL" or "9") a clean,
    honest "that's not a real size for this product" instead of the model
    guessing or silently treating it as out of stock. `quantity=0` with
    `valid_size=True` is the genuine out-of-stock case the agent must state
    plainly, not hedge about.
    """

    product_id: str
    size: str
    valid_size: bool
    quantity: int = 0
    in_stock: bool = False


# ---------- Audit trail (Problem 12) ----------


class AuditEntry(BaseModel):
    """One step of one `/api/chat` run, appended to `output/audit_trail.json`
    — never overwritten in place, so the file is a running history of every
    agent-loop iteration across every run, not just the most recent one.

    Shaped around what a reviewer would actually want to check later: not
    just what the agent *said*, but what it *did* to get there. Fields
    chosen deliberately narrow:

    - `run_id` / `iteration` — which run, and which step within it, since
      one chat turn is usually 2-3 model requests, not one.
    - `user_id` only, never a name or email — enough to tell one shopper's
      runs apart from another's without putting a customer's identity in a
      plain JSON log file on disk.
    - `message`, `tool_args`, and `tool_result_summary` are all truncated
      (see agent.py's `_summarize`) — an audit trail you can't actually read
      because one entry is a 4,000-token tool dump isn't auditable, it's
      just another file to ignore.
    - `stop_reason` is only set on the iteration that actually ended the
      run (`"completed"` or `"failed: ..."`), so grepping for it finds
      exactly one line per run, not every line.
    """

    run_id: str
    timestamp: str
    user_id: int | None = Field(default=None, description="None for a guest; never a name or email")
    message: str = Field(description="The shopper's message this run is answering, truncated")
    iteration: int
    thoughts: str = ""
    tool_name: str | None = None
    tool_args: dict | None = None
    tool_result_summary: str = ""
    stop_reason: str | None = None
