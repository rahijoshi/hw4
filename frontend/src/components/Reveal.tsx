import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Fades + lifts its children into place the first time they scroll into
 * view, then leaves them alone — a storefront should feel like it's
 * greeting you section by section, not dumping the whole page at once.
 * Pure CSS transition (see `.reveal` in index.css); this just toggles the
 * class at the right moment via IntersectionObserver.
 */
export default function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'visible' : ''} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
