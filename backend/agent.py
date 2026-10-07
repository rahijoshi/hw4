"""Campus Customs shop chatbot — PydanticAI agent entry point.

Built once by main.py at import time and reused for every /api/chat request.
Each request gets its own Deps (who, if anyone, is logged in) and its own
reconstructed conversation history — see main.py — so nothing about one
shopper's chat ever leaks into another's.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from pydantic_ai import Agent, RunContext
from pydantic_ai.messages import ModelMessage
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

from models import AuditEntry, ChatReply
from tools import Deps, register_tools

ROOT = Path(__file__).parent
PROMPT_PATH = ROOT / "prompts" / "prompt.md"
AUDIT_PATH = ROOT.parent / "output" / "audit_trail.json"

# A chat turn's happy path is shortlist -> detail -> answer (3 model
# requests). 8 leaves room for a follow-up lookup without letting one turn
# of a website chat run away on cost.
MAX_MODEL_REQUESTS = 8

# Usability improvement (Problem 9, backend #2 — cheaper/faster): Problem 8
# persists a shopper's history forever and the front end resends it in full
# every turn. Uncapped, a long-time customer's prompt — and bill — grows
# without bound on every single message for the rest of their life. Capped
# here, not on the front end, so it's enforced no matter what a client sends.
MAX_HISTORY_MESSAGES = 20  # ~10 user/assistant exchanges of real context

DEFAULT_MODEL = "gpt-5.6-luna"

# Usability improvement (Problem 9, backend #1 — more accurate/safer): the
# only tools allowed to put a product in front of a shopper's eyes.
PRODUCT_SURFACING_TOOLS = {"search_products", "get_product_info", "check_size_stock"}


def extract_surfaced_product_ids(messages: list[ModelMessage]) -> set[str]:
    """Every product_id that actually came back from a product-surfacing
    tool call during this run.

    The system prompt's grounding rule already tells the model never to
    state a product_id it didn't get from a tool. This is that rule
    enforced in code instead of only requested in words: main.py uses this
    set to drop any id in the model's own `product_ids` output that isn't
    in it, even if that id happens to be a real product somewhere in the
    catalogue. A real-but-unrelated id slipping through would still have
    passed the existing "does this product exist?" check — this is the
    narrower, stricter "did we actually look at this one just now?" check.
    """
    surfaced: set[str] = set()
    for message in messages:
        if message.kind != "request":
            continue
        for part in message.parts:
            if part.part_kind != "tool-return" or part.tool_name not in PRODUCT_SURFACING_TOOLS:
                continue
            try:
                payload = json.loads(part.content) if isinstance(part.content, str) else part.content
            except (json.JSONDecodeError, TypeError):
                continue
            if not isinstance(payload, dict):
                continue
            product_id = payload.get("product_id")
            if isinstance(product_id, str):
                surfaced.add(product_id)  # get_product_info / check_size_stock
            for item in payload.get("products", []):  # search_products
                if isinstance(item, dict) and isinstance(item.get("product_id"), str):
                    surfaced.add(item["product_id"])
    return surfaced


# ---------- Audit trail (Problem 12) ----------

# PydanticAI's internal tool name for delivering structured output when the
# model doesn't natively support JSON-schema output — marks which iteration
# actually ended the run, same convention used for HW3's audit trail.
FINAL_RESULT_TOOL_NAME = "final_result"


def _summarize(value: object, limit: int = 300) -> str:
    """Truncate anything bound for the audit trail — short args/result, not
    a full dump. An entry you can't read at a glance isn't auditable."""
    text = value if isinstance(value, str) else json.dumps(value, default=str)
    text = text.strip()
    return text if len(text) <= limit else text[: limit - 1] + "…"


def build_audit_entries(
    run_id: str,
    user_id: int | None,
    message: str,
    messages: list[ModelMessage],
) -> list[AuditEntry]:
    """Turn one /api/chat run's message history into one AuditEntry per
    agent-loop iteration — called from main.py after every successful run.

    An "iteration" is either a tool call the model made (one entry per call)
    or, if the model answered with no tool call at all, the plain response
    itself. Mirrors HW3's audit-trail construction, adapted for a chat agent
    that has one ability (answer a message) instead of several.
    """
    short_message = _summarize(message, 160)

    tool_results: dict[str, str] = {}
    for request_message in messages:
        if request_message.kind == "request":
            for part in request_message.parts:
                if part.part_kind == "tool-return":
                    tool_results[part.tool_call_id] = _summarize(part.content)

    entries: list[AuditEntry] = []
    iteration = 0
    for response_message in messages:
        if response_message.kind != "response":
            continue
        thoughts = " ".join(
            part.content
            for part in response_message.parts
            if part.part_kind in ("text", "thinking") and part.content
        ).strip()
        tool_calls = [part for part in response_message.parts if part.part_kind == "tool-call"]
        timestamp = response_message.timestamp.isoformat()

        if not tool_calls:
            iteration += 1
            entries.append(
                AuditEntry(
                    run_id=run_id,
                    timestamp=timestamp,
                    user_id=user_id,
                    message=short_message,
                    iteration=iteration,
                    thoughts=thoughts,
                    stop_reason="completed",
                )
            )
            continue

        for call in tool_calls:
            iteration += 1
            is_final = call.tool_name == FINAL_RESULT_TOOL_NAME
            entries.append(
                AuditEntry(
                    run_id=run_id,
                    timestamp=timestamp,
                    user_id=user_id,
                    message=short_message,
                    iteration=iteration,
                    thoughts=thoughts,
                    tool_name=call.tool_name,
                    tool_args=call.args_as_dict(),
                    tool_result_summary=tool_results.get(call.tool_call_id, ""),
                    stop_reason="completed" if is_final else None,
                )
            )
    return entries


def append_audit_entries(entries: list[AuditEntry]) -> None:
    """Append to output/audit_trail.json without wiping prior runs' entries.

    Read-modify-write rather than a true append-only file format: at the
    volume one chat demo generates this is instant, and it keeps the file a
    single valid JSON array a reviewer can open directly, instead of
    newline-delimited JSON that needs a special reader.
    """
    existing: list[dict] = []
    if AUDIT_PATH.is_file():
        try:
            loaded = json.loads(AUDIT_PATH.read_text(encoding="utf-8"))
            existing = loaded if isinstance(loaded, list) else [loaded]
        except json.JSONDecodeError:
            existing = []
    existing.extend(entry.model_dump() for entry in entries)
    AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    AUDIT_PATH.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")


def append_audit_failure(run_id: str, user_id: int | None, message: str, error: Exception) -> None:
    """Logged when `agent.run()` itself raises — a bad model response, a hit
    usage limit, a network error — so a failed run still leaves a trace
    instead of silently vanishing from the audit trail."""
    append_audit_entries(
        [
            AuditEntry(
                run_id=run_id,
                timestamp=datetime.now(timezone.utc).isoformat(),
                user_id=user_id,
                message=_summarize(message, 160),
                iteration=0,
                stop_reason=f"failed: {error}",
            )
        ]
    )


def load_model() -> OpenAIChatModel:
    """OpenAI-compatible model served through Portkey.

    Tries, in order: backend/.env, then the repo root's .env (next to
    README.md and frontend/ — see .env.example). Each call is a harmless
    no-op if that file doesn't exist; PORTKEY_API_KEY can also just be a
    real environment variable instead, which `os.environ.get` below finds
    either way.
    """
    load_dotenv(ROOT / ".env")
    load_dotenv(ROOT.parent / ".env")
    key = os.environ.get("PORTKEY_API_KEY")
    if not key:
        raise RuntimeError("PORTKEY_API_KEY is not set — copy .env.example to .env and fill it in.")
    model_name = os.environ.get("MODEL_NAME", DEFAULT_MODEL)
    return OpenAIChatModel(model_name, provider=OpenAIProvider(base_url="https://api.portkey.ai/v1", api_key=key))


def build_agent() -> Agent[Deps, ChatReply]:
    """Load the system prompt from prompts/prompt.md and wire up the tools.

    Reading the prompt from disk (rather than inlining it as a string) is
    what makes "grow this same file later" in later problems a one-file
    edit — no code change needed to add a new safety rule or ability.
    """
    system_prompt = PROMPT_PATH.read_text(encoding="utf-8")
    agent = Agent(
        load_model(),
        deps_type=Deps,
        output_type=ChatReply,
        system_prompt=system_prompt,
        retries=2,
    )
    register_tools(agent)

    @agent.instructions
    def conversation_context(ctx: RunContext[Deps]) -> str:
        """Problem 8: who's chatting, and what page they're on — added fresh
        to every model request from that request's own `Deps`, not left for
        the model to remember to ask about via a tool.

        This is "code in the agent's context" in the literal sense: it runs
        on every call, always true for *this* request, and never stale
        across a multi-turn conversation the way a fact stated once early on
        and then carried forward in message history could become.
        """
        lines = []

        if ctx.deps.user is not None:
            lines.append(
                f"The shopper chatting right now is logged in as {ctx.deps.user.name} "
                f"({ctx.deps.user.email})."
            )
        else:
            lines.append("No one is logged in for this conversation.")

        if ctx.deps.page_product is not None:
            lines.append(
                f'The shopper is currently on the product page for "{ctx.deps.page_product.name}" '
                f"(product_id={ctx.deps.page_product.product_id}). If they say \"this\", \"it\", or "
                "don't name a product at all, assume they mean this one unless they clearly ask about "
                "something else. Still call get_product_info or check_size_stock with this product_id "
                "before stating its price, color, or stock — never state one from this note alone, it "
                "is only here to tell you WHICH product, not what is currently true about it."
            )
        else:
            lines.append("The shopper is not currently on a specific product page.")

        return "\n".join(lines)

    return agent
