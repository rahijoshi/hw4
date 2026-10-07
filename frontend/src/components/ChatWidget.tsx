import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchChatHistory, formatPrice } from '../api'
import { useAuth } from '../auth'
import { useChatResults } from '../chatResults'
import { usePageContext } from '../pageContext'
import type { ChatMessage, Product } from '../types'

const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    "Hi! I'm the Bulldog Blue shop assistant. Ask me about any Yale gear we carry — what it looks like, what it costs, or whether it's in your size.",
}

const SUGGESTIONS = [
  'What hoodies do you have?',
  'Do you have anything in red?',
  'Is the Big Yale hoodie in stock in large?',
]

/**
 * Talks to the PydanticAI agent behind POST /api/chat (backend/agent.py).
 *
 * `history` is resent in full with every message — there is no server-side
 * chat session, so this is what the backend turns back into real multi-turn
 * memory (see main.py:_to_message_history). Only `role`/`content` go over
 * the wire, not the `products` cards already rendered for past turns, and
 * the 'system' divider from a reloaded history (see below) is filtered out
 * entirely — the backend's ChatTurn type only knows 'user'/'assistant'.
 *
 * `pageProductId` is the product page the shopper is currently on, if any
 * (Problem 8) — lets "do you have this in pink?" resolve without naming
 * the product. See pageContext.tsx and backend/agent.py's dynamic
 * instructions.
 */
async function sendToAgent(
  message: string,
  history: ChatMessage[],
  userId: number | undefined,
  pageProductId: string | null,
): Promise<{ reply: string; products: Product[] }> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history: history
        .filter((m): m is ChatMessage & { role: 'user' | 'assistant' } => m.role !== 'system')
        .map(({ role, content }) => ({ role, content })),
      user_id: userId ?? null,
      page_context: pageProductId ? { product_id: pageProductId } : null,
    }),
  })
  if (!res.ok) throw new Error(`Chat backend returned ${res.status}`)
  const data = await res.json()
  return { reply: data.reply ?? '', products: data.products ?? [] }
}

export default function ChatWidget() {
  const { user } = useAuth()
  const { showResults } = useChatResults()
  const { productId } = usePageContext()
  const [open, setOpen] = useState(false)
  const [nudgeVisible, setNudgeVisible] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  // A one-time, dismissible nudge — a real shop clerk says hello before you
  // ask; a silent launcher icon in the corner doesn't. Shows once per page
  // load if the shopper hasn't opened the panel yet, then gets out of the way.
  useEffect(() => {
    const showTimer = setTimeout(() => setNudgeVisible(true), 2600)
    const hideTimer = setTimeout(() => setNudgeVisible(false), 11000)
    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  // Reload a logged-in shopper's saved conversation when they arrive (or
  // just logged in), and reset to a clean slate on logout — a shared
  // browser must never show one account's chat history to whoever uses it
  // next. Guests (user is null) always just get the static greeting, since
  // nothing is ever persisted for them (see backend's save_chat_message).
  useEffect(() => {
    let cancelled = false
    if (!user) {
      setMessages([GREETING])
      return
    }
    fetchChatHistory(user.id)
      .then((history) => {
        if (cancelled) return
        if (history.length === 0) {
          setMessages([GREETING])
          return
        }
        setMessages([
          { role: 'system', content: '— continuing from your last visit —' },
          ...history.map((h): ChatMessage => ({ role: h.role, content: h.content, products: h.products })),
        ])
      })
      .catch(() => {
        if (!cancelled) setMessages([GREETING])
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking, open])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || thinking) return

    const history = messages
    setMessages([...history, { role: 'user', content: trimmed }])
    setDraft('')
    setThinking(true)

    try {
      const { reply, products } = await sendToAgent(trimmed, history, user?.id, productId)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, products }])
      // The agent's matches reach the page itself, not just this panel —
      // see MatchShelf and chatResults.tsx. A reply with no matches (a
      // greeting, a declined question) leaves whatever shelf is already
      // showing alone rather than clearing it.
      if (products.length > 0) showResults(trimmed, products)
    } catch {
      // The agent didn't load (e.g. missing API key) or the backend is down.
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "Sorry, I'm having trouble reaching the shop's brain right now. In the meantime, the Products page has all 102 items with prices and sizes.",
        },
      ])
    } finally {
      setThinking(false)
    }
  }

  if (!open) {
    return (
      <div className="chat-launcher-wrap">
        {nudgeVisible && (
          <div className="chat-nudge">👋 Looking for something? I know the whole shop.</div>
        )}
        <button
          className="chat-launcher"
          onClick={() => {
            setOpen(true)
            setNudgeVisible(false)
          }}
        >
          <span aria-hidden>💬</span> Ask us anything
        </button>
      </div>
    )
  }

  return (
    <div className="chat-panel" role="dialog" aria-label="Campus Customs shop assistant">
      <div className="chat-header">
        <div>
          <div className="chat-title">
            <span className="chat-online-dot" aria-hidden="true" />
            Bulldog Blue Assistant
          </div>
          <div className="chat-sub">Prices and stock straight from the shop</div>
        </div>
        <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">
          ×
        </button>
      </div>

      <div className="chat-log" ref={logRef}>
        {messages.map((m, i) => (
          <Fragment key={i}>
            {m.role === 'system' ? (
              <div className="chat-divider">{m.content}</div>
            ) : (
              <div className={`bubble ${m.role}`}>{m.content}</div>
            )}
            {m.products && m.products.length > 0 && (
              <div className="chat-products">
                {m.products.map((p) => (
                  <Link
                    key={p.product_id}
                    to={`/products/${p.product_id}`}
                    className="chat-product"
                    onClick={() => setOpen(false)}
                  >
                    <img src={p.image_url} alt={p.name} />
                    <div>
                      <div className="chat-product-name">{p.name}</div>
                      <div className="chat-product-price">{formatPrice(p.price)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Fragment>
        ))}

        {thinking && (
          <div className="chat-typing" aria-label="Assistant is typing">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="chat-suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="chat-suggestion" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="chat-input-row"
        onSubmit={(e) => {
          e.preventDefault()
          send(draft)
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about sizes, colors, price…"
          aria-label="Message"
        />
        <button className="chat-send" type="submit" disabled={!draft.trim() || thinking}>
          Send
        </button>
      </form>
    </div>
  )
}
