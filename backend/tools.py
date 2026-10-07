"""Tools for the Campus Customs shop chatbot.

All of these read through db.py — the same functions the FastAPI routes
use — so the agent never has its own, possibly-diverging, view of the
catalogue.
"""

from __future__ import annotations

import json
from dataclasses import dataclass

from pydantic_ai import Agent, RunContext

import db
from models import SIZE_ORDER, Product, ProductDetail, ProductLookup, SizeAvailability, UserPublic

MAX_SEARCH_RESULTS = 10


@dataclass
class Deps:
    """Per-request context the tools — and the dynamic instructions in
    agent.py — need.

    Built fresh in main.py for every /api/chat call — nothing here persists
    or is shared between requests, so one shopper's identity (or the page
    they happen to be looking at) can never leak into another shopper's
    conversation.
    """

    user: UserPublic | None = None
    # The product the shopper is currently looking at, if any — resolved
    # server-side from ChatRequest.page_context in main.py (never trusted
    # from the client as a ready-made Product). See agent.py's dynamic
    # instructions for how this reaches the model.
    page_product: Product | None = None


def _search_summary(product) -> dict:
    """A compact view of one product for search results.

    Deliberately leaves out price and stock — giving the model a number here
    would tempt it to answer from this instead of calling get_product_info
    for the authoritative figure.
    """
    return {
        "product_id": product.product_id,
        "name": product.name,
        "category": product.category,
        "colors": product.colors,
    }


def _to_product_lookup(detail: ProductDetail) -> ProductLookup:
    """Narrow the website's full ProductDetail down to what get_product_info
    hands the agent — see ProductLookup's docstring in models.py for why."""
    return ProductLookup(
        product_id=detail.product_id,
        name=detail.name,
        description=detail.description,
        price=detail.price,
        colors=detail.colors,
        sizes=detail.sizes,
        sizes_in_stock=detail.sizes_in_stock,
        sizes_out_of_stock=detail.sizes_out_of_stock,
        total_quantity=detail.total_quantity,
    )


def register_tools(agent: Agent) -> None:
    """Attach the shop's tools. Called once from agent.py after the Agent is built."""

    @agent.tool
    def search_products(ctx: RunContext[Deps], query: str | None = None, category: str | None = None) -> str:
        """Find candidate products by free-text query and/or category.

        Categories in use: T-Shirts, Crewnecks, Hoodies, Quarter-Zips,
        Jackets, Performance. `query` matches against name, description,
        colors and search tags. Returns up to 10 matches with product_id,
        name, category and colors only — call get_product_info on a
        specific product_id to get its real price and per-size stock before
        telling a shopper either number.
        """
        matches = db.search_products(category=category, q=query)
        capped = matches[:MAX_SEARCH_RESULTS]
        return json.dumps(
            {
                "total_matches": len(matches),
                "shown": len(capped),
                "products": [_search_summary(p) for p in capped],
            }
        )

    @agent.tool
    def get_product_info(ctx: RunContext[Deps], product_id: str) -> str:
        """The authoritative description, price, and full per-size stock for one product.

        Always call this before stating a price, a description, or whether a
        product is in stock at all — never answer from memory, and never
        from search_products' summary alone. product_id should be one
        search_products returned. If the shopper named one specific size,
        call check_size_stock instead — it gives a more direct answer than
        picking that size out of this tool's `sizes` list yourself.
        """
        detail = db.get_product(product_id)
        if detail is None:
            return json.dumps({"error": f"No product with id '{product_id}'. Try search_products first."})
        return _to_product_lookup(detail).model_dump_json()

    @agent.tool
    def check_size_stock(ctx: RunContext[Deps], product_id: str, size: str) -> str:
        """How many units of one specific size are in stock for one product.

        Use this whenever the shopper names a size directly (e.g. "do you
        have a medium?", "is this in stock in XL?") — it is more reliable
        than reading the size out of get_product_info's full list yourself.
        size must be one of XS, S, M, L, XL, XXL (case-insensitive and
        space-trimmed; anything else comes back with valid_size=false, so
        you can tell the shopper that size doesn't exist for this product
        instead of guessing). quantity=0 with valid_size=true is a genuine
        out-of-stock size — state that plainly, do not soften it.
        """
        detail = db.get_product(product_id)
        if detail is None:
            return json.dumps({"error": f"No product with id '{product_id}'. Try search_products first."})

        normalized = size.strip().upper()
        quantities = {s.size: s.quantity for s in detail.sizes}
        if normalized not in SIZE_ORDER or normalized not in quantities:
            return SizeAvailability(product_id=product_id, size=size, valid_size=False).model_dump_json()

        quantity = quantities[normalized]
        return SizeAvailability(
            product_id=product_id,
            size=normalized,
            valid_size=True,
            quantity=quantity,
            in_stock=quantity > 0,
        ).model_dump_json()

    @agent.tool
    def get_current_user(ctx: RunContext[Deps]) -> str:
        """Who, if anyone, is logged in for this conversation.

        Use this instead of guessing — if a name comes back you may greet
        them by first name; if none comes back, the shopper isn't signed in,
        so don't claim to recognize them.
        """
        if ctx.deps.user is None:
            return "No one is logged in for this conversation."
        return f"Logged in as {ctx.deps.user.name} ({ctx.deps.user.email})."
