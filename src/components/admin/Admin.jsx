import { useEffect, useId, useRef, useState } from 'react'
import { useAdminSession } from '../../hooks/useAdminSession'
import { createAdminSupabaseClient } from '../../lib/supabase'
import {
  DEFAULT_SHIPPING_FEE,
  fetchShippingFee,
  updateShippingFee,
} from '../../data/settingsRepository'
import { LinksCard } from './LinksCard'
import { ProductsCard } from './ProductsCard'
import { VideosCard } from './VideosCard'
import './admin.css'

/**
 * Admin page, ported from "Admin.dc.html" in the Mama Mica GLW design project.
 *
 * The design's five tabs are Prices, Links, Videos, Notice and Stats. Prices is
 * fully wired — shipping fee and the product catalogue, both against the same
 * Supabase tables the order calculator reads. Videos edits the tutorial
 * library the Tutorials page reads (see VideosCard). The remaining tabs render an
 * explicit "not built yet" panel rather than a convincing shell that silently
 * does nothing.
 */

const TOAST_MS = 2200

/** The design's bottom bar. Order and glyphs match Admin.dc.html. */
const TABS = [
  { key: 'prices', icon: '₱', label: 'Prices' },
  { key: 'links', icon: '⛓', label: 'Links' },
  { key: 'videos', icon: '▶', label: 'Videos' },
  { key: 'banner', icon: '✦', label: 'Notice' },
  { key: 'stats', icon: '◧', label: 'Stats' },
]

const PENDING_TAB_COPY = {
  banner: 'The announcement banner has not been built yet.',
  stats: 'Visitor stats need event tracking on the bio page before they can be real.',
}

/**
 * @param {{ onSubmit: (email: string, password: string) => Promise<{ok: boolean, error: string|null}>, notice?: string|null }} props
 */
function AdminLogin({ onSubmit, notice = null }) {
  const emailId = useId()
  const passwordId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }

    setIsBusy(true)
    const result = await onSubmit(email.trim(), password)
    setIsBusy(false)

    if (!result.ok) setError(result.error ?? 'Could not sign you in.')
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <span className="admin-logo admin-logo--lg">
          <img src="/logo.png" alt="Mama Mica GLW logo" width="72" height="72" />
        </span>
        <span className="admin-login-eyebrow">Mama Mica GLW</span>
        <h1 className="admin-login-title">Admin sign in</h1>

        <label className="admin-field" htmlFor={emailId}>
          <span className="admin-field-label">Email</span>
          <input
            id={emailId}
            className="admin-input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="admin-field" htmlFor={passwordId}>
          <span className="admin-field-label">Password</span>
          <input
            id={passwordId}
            className="admin-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {(error || notice) && (
          <p className="admin-error" role="alert">
            {error || notice}
          </p>
        )}

        <button className="admin-primary" type="submit" disabled={isBusy}>
          {isBusy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

/**
 * @param {{ client: import('@supabase/supabase-js').SupabaseClient|null, onSaved: (message: string) => void }} props
 */
function ShippingFeeCard({ client, onSaved }) {
  const feeId = useId()
  const [fee, setFee] = useState(String(DEFAULT_SHIPPING_FEE))
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    let active = true

    fetchShippingFee({ client }).then((result) => {
      if (active) setFee(String(result.amount))
    })

    return () => {
      active = false
    }
  }, [client])

  const handleSave = async () => {
    setError('')
    setIsBusy(true)
    const result = await updateShippingFee(fee, { client })
    setIsBusy(false)

    if (!result.ok) {
      setError(result.error ?? 'Could not save the shipping fee.')
      return
    }

    onSaved('Shipping fee saved')
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <h2 className="admin-panel-title">Shipping fee</h2>
        <p className="admin-panel-sub">Charged once per order in the order calculator.</p>
      </div>

      <label className="admin-field" htmlFor={feeId}>
        <span className="admin-field-label">Shipping fee (₱)</span>
        <input
          id={feeId}
          className="admin-input"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={fee}
          onChange={(event) => setFee(event.target.value)}
        />
      </label>

      <p className="admin-hint">Set it to 0 to run free shipping.</p>

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      <button className="admin-primary" type="button" onClick={handleSave} disabled={isBusy}>
        {isBusy ? 'Saving…' : 'Save shipping fee'}
      </button>
    </section>
  )
}

/**
 * @param {{ client?: import('@supabase/supabase-js').SupabaseClient|null, onBack?: () => void }} props
 */
export function Admin({ client = createAdminSupabaseClient(), onBack }) {
  const { session, isLoading, accessError, signIn, signOut } = useAdminSession({ client })
  const [tab, setTab] = useState('prices')
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const showToast = (message) => {
    clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(''), TOAST_MS)
  }

  if (isLoading) {
    return (
      <div className="admin">
        <p className="admin-loading">Checking your session…</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="admin">
        <AdminLogin onSubmit={signIn} notice={accessError} />
      </div>
    )
  }

  const email = session.user?.email ?? ''
  const initials = (email[0] ?? '?').toUpperCase()

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="admin-brand">
          <span className="admin-logo">
            <img src="/logo.png" alt="Mama Mica GLW logo" width="44" height="44" />
          </span>
          <span className="admin-brand-text">
            <span className="admin-brand-name">Mama Mica GLW</span>
            <span className="admin-brand-eyebrow">Admin</span>
          </span>
        </div>

        <button className="admin-account" type="button" onClick={signOut}>
          <span className="admin-account-initials" aria-hidden="true">
            {initials}
          </span>
          <span className="admin-account-text">
            <span className="admin-account-email">{email}</span>
            <span className="admin-account-action">Sign out</span>
          </span>
        </button>
      </header>

      <nav className="admin-tabs" aria-label="Admin sections">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={tab === item.key ? 'admin-tab admin-tab--active' : 'admin-tab'}
            aria-current={tab === item.key ? 'page' : undefined}
            onClick={() => setTab(item.key)}
          >
            <span className="admin-tab-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="admin-tab-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <main className="admin-body">
        {tab === 'prices' ? (
          <>
            <div className="admin-head">
              <h1 className="admin-title">Price list</h1>
              <p className="admin-sub">
                Shipping and every product price. The order calculator reads them live.
              </p>
            </div>

            <div className="admin-grid">
              <ShippingFeeCard client={client} onSaved={showToast} />
              <ProductsCard client={client} onSaved={showToast} />
            </div>
          </>
        ) : tab === 'links' ? (
          <>
            <div className="admin-head">
              <h1 className="admin-title">Links</h1>
              <p className="admin-sub">
                Add, edit, hide or show the buttons customers see on the public links page.
              </p>
            </div>
            <div className="admin-grid admin-grid--single">
              <LinksCard client={client} onSaved={showToast} />
            </div>
          </>
        ) : tab === 'videos' ? (
          <>
            <div className="admin-head">
              <h1 className="admin-title">Videos</h1>
              <p className="admin-sub">
                The tutorials customers watch on the Tutorials page.
              </p>
            </div>
            <div className="admin-grid admin-grid--single">
              <VideosCard client={client} onSaved={showToast} />
            </div>
          </>
        ) : (
          <>
            <div className="admin-head">
              <h1 className="admin-title">{TABS.find((item) => item.key === tab)?.label}</h1>
            </div>
            <div className="admin-grid">
              <section className="admin-panel admin-panel--pending">
                <p className="admin-pending">{PENDING_TAB_COPY[tab]}</p>
              </section>
            </div>
          </>
        )}

        {onBack && (
          <button className="admin-back" type="button" onClick={onBack}>
            ← Back to the links page
          </button>
        )}
      </main>

      {toast && (
        <p className="admin-toast" role="status">
          {toast}
        </p>
      )}
    </div>
  )
}
