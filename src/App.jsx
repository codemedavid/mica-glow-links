import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import './App.css'
import './components/home/home.css'
import { fetchLinkOverrides, fetchLinkVisibility } from './data/settingsRepository'
import {
  adminLinks,
  applyAdminLinkOverrides,
  applyGroupOverrides,
  applyLinkOverride,
  contactAdminLink,
  groupBuyLink,
  linkGroups,
} from './data/homeLinks'
import { createSupabaseClient } from './lib/supabase'
import { OrderCalculator } from './components/order-calculator/OrderCalculator'
import { PeptideCalculator } from './components/peptide-calculator/PeptideCalculator'
import { Tutorials } from './components/tutorials/Tutorials'
import { Admin } from './components/admin/Admin'

// Full-page views rendered in place of the links list, keyed by URL hash.
const VIEW_BY_HASH = {
  '#order': 'order',
  '#reviews': 'reviews',
  '#peptide': 'peptide',
  '#tutorials': 'tutorials',
  '#admin': 'admin',
}

const allCustomerReviews = Array.from({ length: 63 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0')
  return {
    id: `review-${number}`,
    src: `/reviews/review-${number}.jpg`,
    tag: 'Customer review',
  }
})

function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const [isMemberInfoOpen, setIsMemberInfoOpen] = useState(false)
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false)
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false)
  const [accessCode, setAccessCode] = useState('')
  const [accessError, setAccessError] = useState('')
  const [view, setView] = useState('home')
  const [activeReview, setActiveReview] = useState(null)
  const [linkVisibility, setLinkVisibility] = useState({})
  const [linkOverrides, setLinkOverrides] = useState({})

  useEffect(() => {
    // Parallax effect for background glows
    const handleMouseMove = (e) => {
      const glows = document.querySelectorAll('.bg-glow')
      const x = (e.clientX / window.innerWidth - 0.5) * 20
      const y = (e.clientY / window.innerHeight - 0.5) * 20

      glows.forEach((glow, index) => {
        const factor = (index + 1) * 0.5
        glow.style.transform = `translate(${x * factor}px, ${y * factor}px)`
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    const syncView = () => {
      const hash = window.location.hash
      const nextView = VIEW_BY_HASH[hash] ?? 'home'
      setView(nextView)
    }
    syncView()
    window.addEventListener('hashchange', syncView)
    return () => window.removeEventListener('hashchange', syncView)
  }, [])

  useEffect(() => {
    let active = true

    const client = createSupabaseClient()

    Promise.all([
      fetchLinkVisibility({ client }),
      fetchLinkOverrides({ client }),
    ]).then(([visibilityResult, overridesResult]) => {
      if (!active) return

      if (Object.keys(visibilityResult.visibility).length > 0) {
        setLinkVisibility(visibilityResult.visibility)
      }

      if (Object.keys(overridesResult.overrides).length > 0) {
        setLinkOverrides(overridesResult.overrides)
      }
    })

    return () => {
      active = false
    }
  }, [])

  const isLinkVisible = (id) => linkVisibility[id] !== false
  const effectiveGroupBuy = applyLinkOverride(groupBuyLink, linkOverrides)
  const effectiveGroups = applyGroupOverrides(linkGroups, linkOverrides)
  const effectiveAdminLinks = applyAdminLinkOverrides(adminLinks, linkOverrides)
  const effectiveContactAdmin = applyLinkOverride(contactAdminLink, linkOverrides)
  const accessDocLink = effectiveGroups
    .flatMap((group) => group.links)
    .find((link) => link.id === 'access-doc')
  const visibleGroups = effectiveGroups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => isLinkVisible(link.id)),
    }))
    .filter((group) => group.links.length > 0)
  const visibleAdminLinks = effectiveAdminLinks.filter((admin) => isLinkVisible(admin.id))
  const showContactAdmin = isLinkVisible('contact-admin') && visibleAdminLinks.length > 0

  const handleRipple = (e) => {
    const button = e.currentTarget
    const ripple = document.createElement('span')
    ripple.classList.add('ripple')

    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2

    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple-effect 0.6s ease-out;
      pointer-events: none;
      z-index: 10;
    `

    button.appendChild(ripple)
    setTimeout(() => ripple.remove(), 600)
  }

  const handleProtectedLink = (e) => {
    handleRipple(e)
    e.preventDefault()
    setAccessCode('')
    setAccessError('')
    setIsCodeModalOpen(true)
  }

  const toggleAdmin = (e) => {
    handleRipple(e)
    setIsAdminOpen(!isAdminOpen)
  }

  // The admin shell is a fixed, full-viewport app with its own background and
  // bottom bar, so it replaces the links page rather than rendering inside it.
  if (view === 'admin') {
    return (
      <Admin
        onBack={() => {
          window.location.hash = ''
        }}
      />
    )
  }

  return (
    <div className="container">
      {/* Decorative Background Elements */}
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>
      <div className="bg-glow bg-glow-3"></div>

      {/* DNA Pattern Overlay */}
      <div className="dna-pattern">
        <svg viewBox="0 0 100 400" preserveAspectRatio="none" className="dna-helix dna-1">
          <path d="M50,0 Q80,50 50,100 Q20,150 50,200 Q80,250 50,300 Q20,350 50,400" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M50,0 Q20,50 50,100 Q80,150 50,200 Q20,250 50,300 Q80,350 50,400" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="50" r="3" fill="currentColor" /><circle cx="50" cy="150" r="3" fill="currentColor" />
          <circle cx="50" cy="250" r="3" fill="currentColor" /><circle cx="50" cy="350" r="3" fill="currentColor" />
        </svg>
        <svg viewBox="0 0 100 400" preserveAspectRatio="none" className="dna-helix dna-2">
          <path d="M50,0 Q80,50 50,100 Q20,150 50,200 Q80,250 50,300 Q20,350 50,400" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M50,0 Q20,50 50,100 Q80,150 50,200 Q20,250 50,300 Q80,350 50,400" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="50" r="3" fill="currentColor" /><circle cx="50" cy="150" r="3" fill="currentColor" />
          <circle cx="50" cy="250" r="3" fill="currentColor" /><circle cx="50" cy="350" r="3" fill="currentColor" />
        </svg>
        <svg viewBox="0 0 100 400" preserveAspectRatio="none" className="dna-helix dna-3">
          <path d="M50,0 Q80,50 50,100 Q20,150 50,200 Q80,250 50,300 Q20,350 50,400" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M50,0 Q20,50 50,100 Q80,150 50,200 Q20,250 50,300 Q80,350 50,400" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="50" r="3" fill="currentColor" /><circle cx="50" cy="150" r="3" fill="currentColor" />
          <circle cx="50" cy="250" r="3" fill="currentColor" /><circle cx="50" cy="350" r="3" fill="currentColor" />
        </svg>
        <svg viewBox="0 0 100 400" preserveAspectRatio="none" className="dna-helix dna-4">
          <path d="M50,0 Q80,50 50,100 Q20,150 50,200 Q80,250 50,300 Q20,350 50,400" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M50,0 Q20,50 50,100 Q80,150 50,200 Q20,250 50,300 Q80,350 50,400" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="50" r="3" fill="currentColor" /><circle cx="50" cy="150" r="3" fill="currentColor" />
          <circle cx="50" cy="250" r="3" fill="currentColor" /><circle cx="50" cy="350" r="3" fill="currentColor" />
        </svg>
        {/* Floating Logos */}
        <img src="/logo.png" alt="" className="floating-logo logo-1" aria-hidden="true" />
        <img src="/logo.png" alt="" className="floating-logo logo-2" aria-hidden="true" />
      </div>

      {/* Main Content */}
      <main className="content">
        {view === 'home' && (
          <div className="home">
            {/* Avatar/Logo */}
            <div className="avatar-container">
              <div className="avatar">
                <img src="/logo.png" alt="Mama Mica GLW Logo" className="avatar-logo" />
              </div>
              <div className="avatar-ring"></div>
            </div>

            {/* Brand text */}
            <header className="home-brand">
              <h1 className="home-title">Mica Glow</h1>
              <span className="home-eyebrow">Your trusted glow essentials</span>
              <p className="home-bio">Everything you need — prices, authenticity, community, and guides.</p>
            </header>

            {/* Group buy banner */}
            {isLinkVisible('group-buy') && (
              <a
                className="group-buy"
                href={effectiveGroupBuy.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleRipple}
              >
                <span className="group-buy-tag">
                  <span className="group-buy-dot" aria-hidden="true"></span>
                  GROUP BUY · NOW OPEN
                </span>
                <span className="group-buy-main">
                  <span className="group-buy-headline">{effectiveGroupBuy.title}</span>
                  <span className="group-buy-cta">Join now →</span>
                </span>
                <span className="group-buy-note">{effectiveGroupBuy.desc}</span>
              </a>
            )}

            {/* Grouped links */}
            <nav className="home-groups" aria-label="Quick Links">
              {visibleGroups.map((group) => (
                <div className="home-group" key={group.id}>
                  <span className="home-group-label">{group.label}</span>
                  {group.links.map((link) => (
                    <a
                      key={link.id}
                      id={link.id}
                      className={link.variant ? `home-link home-link-${link.variant}` : 'home-link'}
                      href={link.href}
                      target={link.kind === 'external' ? '_blank' : undefined}
                      rel={link.kind === 'external' ? 'noopener noreferrer' : undefined}
                      onClick={link.kind === 'protected' ? handleProtectedLink : handleRipple}
                    >
                      <span className="home-link-icon" aria-hidden="true">{link.icon}</span>
                      <span className="home-link-body">
                        <span className="home-link-title">{link.title}</span>
                        <span className="home-link-desc">{link.desc}</span>
                      </span>
                      <span className="home-link-chevron" aria-hidden="true">›</span>
                    </a>
                  ))}
                </div>
              ))}

              {/* Contact admin group */}
              {showContactAdmin && (
                <div className="home-group">
                  <span className="home-group-label">CONTACT</span>
                  <div className="admin-dropdown">
                    <button
                      type="button"
                      className="home-link home-admin-toggle"
                      onClick={toggleAdmin}
                      aria-expanded={isAdminOpen}
                    >
                      <span className="home-link-icon" aria-hidden="true">👩‍💼</span>
                      <span className="home-link-body">
                        <span className="home-link-title">{effectiveContactAdmin.title}</span>
                        <span className="home-link-desc">{effectiveContactAdmin.desc}</span>
                      </span>
                      <span className="home-link-chevron" aria-hidden="true">›</span>
                    </button>
                    <div className={`home-admin-menu ${isAdminOpen ? 'open' : ''}`}>
                      <div className="home-admin-menu-inner">
                        {visibleAdminLinks.map((admin) => (
                          <a
                            key={admin.id}
                            id={admin.id}
                            className="home-admin-link"
                            href={admin.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleRipple}
                          >
                            <span className="home-admin-icon" aria-hidden="true">📱</span>
                            <span className="home-admin-name">{admin.title}</span>
                            <span className="home-link-chevron" aria-hidden="true">›</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </nav>

            {/* Member Tag */}
            <div className="member-tag">
              <img src="/a4m-logo.png" alt="A4M Member" className="member-logo" />
              <div className="member-content">
                <span className="member-text">American Academy of Anti-Aging Medicine (A4M) Member</span>
                <span className="member-id">Membership #: 1718800</span>
                <button className="member-info-trigger" onClick={() => setIsMemberInfoOpen(true)}>
                  Why it matters?
                </button>
              </div>
            </div>

            {/* Member Info Modal */}
            {isMemberInfoOpen && (
              <div className="modal-overlay" onClick={() => setIsMemberInfoOpen(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <button className="modal-close" onClick={() => setIsMemberInfoOpen(false)}>×</button>
                  <h2 className="modal-title">Why Choose an A4M Member?</h2>

                  <div className="modal-body">
                    <div className="info-item">
                      <h3>🏆 Elite Expertise</h3>
                      <p>The American Academy of Anti-Aging Medicine (A4M) is the global leader in longevity medicine.</p>
                    </div>

                    <div className="info-item">
                      <h3>🔬 Cutting-Edge Care</h3>
                      <p>Members are trained in the latest metabolic and functional medicine protocols.</p>
                    </div>

                    <div className="info-item">
                      <h3>🛡️ Safety & Quality</h3>
                      <p>Ensures your provider is committed to the highest standards of clinical practice.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isAccessModalOpen && (
              <div className="modal-overlay" onClick={() => setIsAccessModalOpen(false)}>
                <div className="modal-content modal-access" onClick={(e) => e.stopPropagation()}>
                  <button className="modal-close" onClick={() => setIsAccessModalOpen(false)}>×</button>
                  <h2 className="modal-title">Hello 🤍</h2>
                  <div className="modal-body modal-message">
                    <p>
                      You can now access <em>Advanced Peptide Certification</em> (online) as a perk of being part of
                      our community 🤍
                    </p>
                    <p>
                      This is a free perk for being part of this space. No extra cost, just something we wanted to give
                      back and add more value for everyone who’s been here and supporting.
                    </p>
                    <p className="modal-highlight">
                      Quick reminder though, please keep this as private as possible. The materials are
                      <strong> exclusive to our community</strong> and have a watermark in place, so they can’t be
                      shared or distributed to other groups or communities. We really trust you guys on this, and it
                      helps us continue providing things like this moving forward.
                    </p>
                    <p>Thank you!</p>
                  </div>
                  <div className="modal-actions">
                    <a
                      className="modal-primary"
                      href={accessDocLink?.href ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Certification
                    </a>
                    <button className="modal-secondary" onClick={() => setIsAccessModalOpen(false)}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isCodeModalOpen && (
              <div className="modal-overlay" onClick={() => setIsCodeModalOpen(false)}>
                <div className="modal-content modal-code" onClick={(e) => e.stopPropagation()}>
                  <button className="modal-close" onClick={() => setIsCodeModalOpen(false)}>×</button>
                  <h2 className="modal-title">Enter Access Code</h2>
                  <p className="modal-subtitle">Use the community code to unlock the certification.</p>
                  <form
                    className="code-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!accessCode.trim()) {
                        setAccessError('Please enter the access code.')
                        return
                      }
                      if (accessCode.trim() === 'MMG082025') {
                        setIsCodeModalOpen(false)
                        setIsAccessModalOpen(true)
                        setAccessError('')
                        return
                      }
                      setAccessError('Incorrect access code.')
                    }}
                  >
                    <label className="code-label" htmlFor="access-code-input">Access Code</label>
                    <input
                      id="access-code-input"
                      className="code-input"
                      type="password"
                      placeholder="Enter code"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      autoFocus
                    />
                    {accessError && <div className="code-error">{accessError}</div>}
                    <div className="modal-actions">
                      <button className="modal-primary" type="submit">Unlock</button>
                      <button
                        className="modal-secondary"
                        type="button"
                        onClick={() => setIsCodeModalOpen(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'order' && (
          <OrderCalculator onBack={() => { window.location.hash = '' }} />
        )}

        {view === 'peptide' && (
          <PeptideCalculator onBack={() => { window.location.hash = '' }} />
        )}

        {view === 'tutorials' && (
          <Tutorials onBack={() => { window.location.hash = '' }} />
        )}

        {view === 'reviews' && (
          <section className="reviews-page" id="reviews">
            <button
              className="back-btn"
              onClick={() => { window.location.hash = '' }}
            >
              ← Back to Links
            </button>
            <div className="reviews-hero">
              <div>
                <p className="section-eyebrow">Customer Reviews</p>
                <h2 className="section-title">Community wins, real deliveries, and customer journeys</h2>
                <p className="section-subtitle">
                  Screenshots from the community showing raffle wins, delivery proofs, and customer journeys.
                </p>
              </div>
            </div>

            <div className="reviews-grid">
              {allCustomerReviews.map((review) => (
                <figure className="review-card" key={review.id}>
                  <button
                    className="review-media"
                    type="button"
                    onClick={() => setActiveReview(review)}
                    aria-label="Open review image"
                  >
                    <img src={review.src} alt="Customer review image" loading="lazy" />
                  </button>
                </figure>
              ))}
              {allCustomerReviews.length === 0 && (
                <div className="review-empty">No reviews for this filter yet.</div>
              )}
            </div>
          </section>
        )}

        {activeReview && (
          <div className="modal-overlay" onClick={() => setActiveReview(null)}>
            <div className="modal-content modal-review" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setActiveReview(null)}>×</button>
              <div className="review-lightbox">
                <img src={activeReview.src} alt="Customer review image" />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="footer">
          <p>&copy; 2026 Mica Glow</p>
        </footer>
      </main>

      <Analytics />
    </div>
  )
}

export default App
