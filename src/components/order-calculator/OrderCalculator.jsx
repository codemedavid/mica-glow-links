import { useMemo, useState } from 'react'
import { useProducts } from '../../hooks/useProducts'
import { useShippingFee } from '../../hooks/useShippingFee'
import './order-calculator.css'

const MAX_RESULTS = 60

const formatPhp = (value) =>
  `PHP ${value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

/**
 * @param {object} props
 * @param {() => void} props.onBack
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [props.supabaseClient]
 *   Injected by tests. Left undefined in production so useProducts builds its
 *   own client from the environment.
 */
export function OrderCalculator({ onBack, supabaseClient, shippingFee }) {
  const { products } = useProducts({ client: supabaseClient })
  const { amount: configuredShippingFee } = useShippingFee({ client: supabaseClient })
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  // Cart lines keyed by product code: { code, qty }
  const [cart, setCart] = useState([])
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)

  // By name then code — matches the design's initial sort.
  const sortedProducts = useMemo(
    () =>
      [...products].sort(
        (a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code)
      ),
    [products]
  )

  const addProduct = (code) => {
    setCart((prev) => {
      const existing = prev.find((line) => line.code === code)
      if (existing) {
        return prev.map((line) =>
          line.code === code ? { ...line, qty: line.qty + 1 } : line
        )
      }
      return [...prev, { code, qty: 1 }]
    })
    setQuery('')
    setIsFocused(false)
  }

  const setQty = (code, qty) => {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((line) => line.code !== code)
        : prev.map((line) => (line.code === code ? { ...line, qty } : line))
    )
  }

  const trimmedQuery = query.trim().toLowerCase()

  const results = useMemo(() => {
    if (!trimmedQuery) return sortedProducts.slice(0, MAX_RESULTS)
    return sortedProducts
      .filter(
        (p) =>
          p.name.toLowerCase().includes(trimmedQuery) ||
          p.code.toLowerCase().includes(trimmedQuery) ||
          (p.spec || '').toLowerCase().includes(trimmedQuery)
      )
      .slice(0, MAX_RESULTS)
  }, [trimmedQuery, sortedProducts])

  const showResults = isFocused || trimmedQuery.length > 0
  const noMatches = showResults && results.length === 0

  const items = cart.map((line) => {
    const product = products.find((p) => p.code === line.code) ?? {
      name: line.code,
      code: line.code,
      vial: 0,
    }
    return {
      ...product,
      qty: line.qty,
      lineTotal: product.vial * line.qty,
    }
  })

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const totalVials = items.reduce((sum, item) => sum + item.qty, 0)
  // ?? not ||, so an owner-set free-shipping promo of 0 is not read as "unset".
  const fee = shippingFee ?? configuredShippingFee
  const shipping = cart.length ? fee : 0
  const total = subtotal + shipping

  return (
    <section className="oc" aria-labelledby="oc-heading">
      <div className="oc-shell">
        {/* Top bar */}
        <div className="oc-topbar">
          <button type="button" className="oc-back" onClick={onBack}>
            ← Back to Links
          </button>
          <span className="oc-live-badge">LIVE ESTIMATE</span>
        </div>

        {/* Header */}
        <header className="oc-header">
          <h1 id="oc-heading" className="oc-title">
            Order Calculator
          </h1>
          <p className="oc-subtitle">
            Search a product, set vial quantities, and see your total instantly.
            Per-vial pricing in PHP.
          </p>
        </header>

        {/* Step 1 — Add products */}
        <div className="oc-card">
          <div className="oc-card-head">
            <div className="oc-step">
              <span className="oc-step-num">1</span>
              <span className="oc-step-title">Add products</span>
            </div>
            <span className="oc-muted">{products.length} products</span>
          </div>

          <input
            className="oc-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Search by name or code…"
            aria-label="Search products"
          />

          {showResults && (
            <div className="oc-results" role="listbox">
              {noMatches && (
                <div className="oc-results-empty">
                  No products match “{query.trim()}”. Try a shorter word or a
                  product code.
                </div>
              )}
              {results.map((product) => (
                <button
                  key={product.code}
                  type="button"
                  className="oc-result"
                  onClick={() => addProduct(product.code)}
                >
                  <span className="oc-result-info">
                    <span className="oc-result-name">{product.name}</span>
                    <span className="oc-result-meta">
                      <span className="oc-result-code">{product.code}</span>
                      {product.spec && <span>{product.spec}</span>}
                    </span>
                  </span>
                  <span className="oc-result-side">
                    <span className="oc-result-price">
                      {formatPhp(product.vial)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2 — Your order */}
        <div className="oc-card">
          <div className="oc-card-head oc-card-head--tight">
            <div className="oc-step">
              <span className="oc-step-num">2</span>
              <span className="oc-step-title">Your order</span>
            </div>
            {items.length > 0 && (
              <span className="oc-muted oc-order-count">
                {totalVials} {totalVials === 1 ? 'vial' : 'vials'}
              </span>
            )}
          </div>

          {items.length === 0 ? (
            <div className="oc-empty">
              <span className="oc-empty-icon" aria-hidden="true">
                🧴
              </span>
              <span className="oc-empty-title">No products yet</span>
              <span className="oc-empty-hint">
                Search above and tap a product to add it here.
              </span>
            </div>
          ) : (
            <div className="oc-items">
              {items.map((item) => (
                <div className="oc-item" key={item.code}>
                  <div className="oc-item-head">
                    <div className="oc-item-info">
                      <span className="oc-item-name">{item.name}</span>
                      <span className="oc-item-meta">
                        <span className="oc-item-code">{item.code}</span> ·{' '}
                        {formatPhp(item.vial)} / vial
                      </span>
                    </div>
                    <button
                      type="button"
                      className="oc-remove"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => setQty(item.code, 0)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="oc-item-controls">
                    <div className="oc-stepper">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => setQty(item.code, item.qty - 1)}
                      >
                        −
                      </button>
                      <span className="oc-qty">{item.qty}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => setQty(item.code, item.qty + 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="oc-line">
                      <span className="oc-line-label">LINE TOTAL</span>
                      <span className="oc-line-total">
                        {formatPhp(item.lineTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="oc-copyright">© 2026 Mica Glow</p>
      </div>

      {/* Sticky summary */}
      <div className="oc-summary">
        <div className="oc-summary-inner">
          {isSummaryOpen && (
            <div className="oc-summary-breakdown">
              <div className="oc-summary-row">
                <span>Subtotal</span>
                <span className="oc-summary-value">{formatPhp(subtotal)}</span>
              </div>
              <div className="oc-summary-row">
                <span>Shipping fee</span>
                <span className="oc-summary-value">{formatPhp(shipping)}</span>
              </div>
              <p className="oc-summary-note">
                Final total may change based on availability, shipping, and
                updates.
              </p>
            </div>
          )}
          <div className="oc-summary-main">
            <button
              type="button"
              className="oc-total-toggle"
              onClick={() => setIsSummaryOpen((open) => !open)}
              aria-expanded={isSummaryOpen}
            >
              <span className="oc-total-label">
                ESTIMATED TOTAL {isSummaryOpen ? '▾' : '▸'}
              </span>
              <span className="oc-total-value">{formatPhp(total)}</span>
            </button>
            <span className="oc-summary-hint">
              {cart.length ? 'Tap total for breakdown' : 'Add products to start'}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
