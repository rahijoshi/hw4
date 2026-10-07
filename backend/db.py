"""Read access to data/campus_customs.db.

Kept separate from the API layer so the agent's tools can import the same
functions in Problem 5 and get exactly the same numbers the website shows.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from models import SIZE_ORDER, Product, ProductDetail, SizeStock, StoredChatMessage, UserPublic

# backend/db.py -> HW 4/ -> HW 4/data
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DATA_DIR / "campus_customs.db"
PRODUCTS_DIR = DATA_DIR / "products"


def connect() -> sqlite3.Connection:
    if not DB_PATH.exists():
        raise FileNotFoundError(
            f"Database not found at {DB_PATH}. The .db file is deliberately not in git — "
            "unzip the data pack into HW 4/data/ first."
        )
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def normalise_category(garment_type: str) -> str:
    """Collapse the catalogue's 22 free-text garment types into 6 real families.

    The raw column is messy — 'hoodie', 'pullover hoodie', 'hooded sweatshirt'
    and 'hooded pullover sweatshirt' are all the same thing to a shopper, and
    't-shirt' appears in both cases. Order matters below: 't-shirt' is checked
    before 'crew' so 'short-sleeve crew-neck t-shirt' lands in T-Shirts.
    """
    g = garment_type.lower()
    if "jacket" in g or "bomber" in g:
        return "Jackets"
    if "quarter-zip" in g or "1/4" in g or "1 4 zip" in g:
        return "Quarter-Zips"
    if "hood" in g:
        return "Hoodies"
    if "t-shirt" in g or "tee" in g:
        return "T-Shirts"
    if "performance" in g:
        return "Performance"
    if "crew" in g or "mock" in g or "sweatshirt" in g:
        return "Crewnecks"
    return "Other"


CATEGORY_ORDER = [
    "T-Shirts",
    "Crewnecks",
    "Hoodies",
    "Quarter-Zips",
    "Jackets",
    "Performance",
    "Other",
]


def _parse_json_list(raw: str) -> list[str]:
    """colors and search_tags are JSON *strings* in SQLite, not arrays."""
    try:
        value = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return []
    return [str(v) for v in value] if isinstance(value, list) else []


def _row_to_product(row: sqlite3.Row) -> Product:
    # image_file_path is always 'products/<id>.jpg'; the API serves that
    # folder at /images, so we only need the file name.
    file_name = row["image_file_path"].split("/")[-1]
    return Product(
        product_id=row["product_id"],
        name=row["name"],
        garment_type=row["garment_type"],
        category=normalise_category(row["garment_type"]),
        description=row["description"],
        colors=_parse_json_list(row["colors"]),
        search_tags=_parse_json_list(row["search_tags"]),
        price=row["price"],
        image_url=f"/images/{file_name}",
    )


def list_products() -> list[Product]:
    """Every product in the catalogue, alphabetical by name."""
    with connect() as con:
        rows = con.execute("SELECT * FROM catalogue ORDER BY name").fetchall()
    return [_row_to_product(r) for r in rows]


def search_products(category: str | None = None, q: str | None = None) -> list[Product]:
    """The catalogue, optionally narrowed by category or a text query.

    One shared implementation for the `/api/products` route and the agent's
    `search_products` tool, so a shopper browsing the page and a shopper
    asking the chatbot the same thing see the same results.

    Filtering happens in Python rather than SQL because `colors` and
    `search_tags` are JSON strings in the database — they have to be parsed
    before they can be searched. At 102 rows a full scan is instant.
    """
    products = list_products()

    if category and category.lower() != "all":
        products = [p for p in products if p.category.lower() == category.lower()]

    if q:
        needle = q.lower().strip()
        products = [
            p
            for p in products
            if needle in p.name.lower()
            or needle in p.description.lower()
            or needle in p.garment_type.lower()
            or any(needle in c.lower() for c in p.colors)
            or any(needle in t.lower() for t in p.search_tags)
        ]

    return products


def get_product(product_id: str) -> ProductDetail | None:
    """One product with its six size rows attached, or None if the id is unknown."""
    with connect() as con:
        row = con.execute(
            "SELECT * FROM catalogue WHERE product_id = ?", (product_id,)
        ).fetchone()
        if row is None:
            return None
        stock_rows = con.execute(
            "SELECT size, quantity FROM inventory WHERE product_id = ?", (product_id,)
        ).fetchall()

    by_size = {r["size"]: r["quantity"] for r in stock_rows}
    sizes = [SizeStock(size=s, quantity=by_size.get(s, 0)) for s in SIZE_ORDER]

    product = _row_to_product(row)
    return ProductDetail(
        **product.model_dump(),
        sizes=sizes,
        total_quantity=sum(s.quantity for s in sizes),
        sizes_in_stock=[s.size for s in sizes if s.quantity > 0],
        sizes_out_of_stock=[s.size for s in sizes if s.quantity == 0],
    )


def get_product_summary(product_id: str) -> Product | None:
    """A product as the chat widget's product cards show it — name, price,
    image, description — with the per-size stock breakdown left out.

    Used to hydrate the agent's `product_ids` output into real catalogue
    rows (see models.ChatReply): explicitly re-validated as the plain
    `Product` shape here rather than relying on Pydantic's duck-typed
    serialization of a `ProductDetail` to drop the extra fields on its own.
    """
    detail = get_product(product_id)
    return Product.model_validate(detail.model_dump()) if detail else None


# ---------- Accounts ----------


def row_to_user_public(row: sqlite3.Row) -> UserPublic:
    return UserPublic(
        id=row["id"],
        first_name=row["first_name"] or "",
        last_name=row["last_name"] or "",
        name=row["name"],
        email=row["email"],
        created_at=row["created_at"],
    )


def get_user_row_by_email(email: str) -> sqlite3.Row | None:
    """Raw row, password_hash included — only for use inside the login route."""
    with connect() as con:
        return con.execute(
            "SELECT * FROM users WHERE email = ?", (email,)
        ).fetchone()


def get_user_by_id(user_id: int) -> UserPublic | None:
    """Looked up by the chat route when the front end says who is logged in."""
    with connect() as con:
        row = con.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return row_to_user_public(row) if row else None


def create_user(first_name: str, last_name: str, email: str, password_hash: str) -> UserPublic:
    """Insert a new account. Raises sqlite3.IntegrityError if the email is taken
    (the `users.email` column is UNIQUE) — the route turns that into a 409."""
    name = f"{first_name} {last_name}".strip()
    with connect() as con:
        cur = con.execute(
            "INSERT INTO users (name, email, password_hash, first_name, last_name) "
            "VALUES (?, ?, ?, ?, ?)",
            (name, email, password_hash, first_name, last_name),
        )
        con.commit()
        row = con.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    return row_to_user_public(row)


# ---------- Chat history (Problem 8) ----------


def save_chat_message(user_id: int, role: str, content: str, products: list[Product] | None = None) -> None:
    """Append one turn to `chat_messages`. Only called for logged-in shoppers
    — guests chat without a `user_id`, so there is nothing to key a row on
    and nothing gets written (see main.py's chat route).

    Appends, never overwrites — the full history for a user accumulates
    across every visit, the same append-only pattern as HW3's audit trail.
    """
    products_json = json.dumps([p.model_dump() for p in products]) if products else None
    with connect() as con:
        con.execute(
            "INSERT INTO chat_messages (user_id, role, content, products_json) VALUES (?, ?, ?, ?)",
            (user_id, role, content, products_json),
        )
        con.commit()


def get_chat_history(user_id: int) -> list[StoredChatMessage]:
    """Everything stored for one user, oldest first — what the front end
    reloads into the chat widget when a shopper returns.

    `products_json` is only ever used for the `product_id`s it contains;
    every other field in it is ignored and the product is re-looked-up
    fresh via `get_product_summary`. Three reasons: it tolerates whatever
    shape an older row's JSON happens to be in (the seed data's sample rows
    predate this schema and don't look exactly like `Product.model_dump()`);
    a reloaded card always shows today's price and stock, never a stale
    snapshot from whenever the message was first sent; and an unknown or
    since-removed product_id is silently dropped rather than crashing the
    whole history load.
    """
    with connect() as con:
        rows = con.execute(
            "SELECT role, content, products_json, created_at FROM chat_messages "
            "WHERE user_id = ? ORDER BY id ASC",
            (user_id,),
        ).fetchall()

    history: list[StoredChatMessage] = []
    for row in rows:
        products: list[Product] = []
        if row["products_json"]:
            try:
                raw = json.loads(row["products_json"])
            except (json.JSONDecodeError, TypeError):
                raw = []
            for item in raw if isinstance(raw, list) else []:
                product_id = item.get("product_id") if isinstance(item, dict) else None
                summary = get_product_summary(product_id) if product_id else None
                if summary is not None:
                    products.append(summary)

        history.append(
            StoredChatMessage(
                role=row["role"] if row["role"] in ("user", "assistant") else "assistant",
                content=row["content"],
                products=products,
                created_at=row["created_at"],
            )
        )
    return history
