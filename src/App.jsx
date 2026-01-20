import { useEffect, useState } from 'react'
import './App.css'

const links = [
  { id: 'price-list', icon: '💜', text: 'Price List', href: 'https://docs.google.com/spreadsheets/d/1Akr_wwyNCsMjfKLsEINCNU54Ln61kXM2cfxhKUVwLuk/edit?gid=0#gid=0' },
  { id: 'whatsapp-community', icon: '💬', text: 'Join Community', href: 'https://chat.whatsapp.com/HJLbXPLhu8b9TdRUsQwOrA' },
  { id: 'e-guides', icon: '📘', text: 'Electronic Guides', href: 'https://drive.google.com/drive/folders/1tNuXfOSXyQyyck7BK-BqZNIbvNBpLgXR' },
]

const adminLinks = [
  { id: 'admin-phoebe', text: 'Admin Phoebe', href: 'https://api.whatsapp.com/send?phone=639686450947' },
  { id: 'admin-glia', text: 'Admin Glia', href: 'https://api.whatsapp.com/send?phone=639758609769' },
  { id: 'admin-james', text: 'Admin James', href: 'https://api.whatsapp.com/send?phone=639054620846' },
  { id: 'admin-jec', text: 'Admin Jec', href: 'https://api.whatsapp.com/send?phone=639611521891' },
  { id: 'admin-teddy', text: 'Admin Teddy', href: 'https://api.whatsapp.com/send?phone=639615431545' },
  { id: 'admin-danica', text: 'Admin Danica', href: 'https://api.whatsapp.com/send?phone=639772189091' },
  { id: 'admin-jonina', text: 'Admin Jonina', href: 'https://api.whatsapp.com/send?phone=639058429200' },
]

function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const [isMemberInfoOpen, setIsMemberInfoOpen] = useState(false)

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

  const toggleAdmin = (e) => {
    handleRipple(e)
    setIsAdminOpen(!isAdminOpen)
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
        {/* Avatar/Logo */}
        <div className="avatar-container">
          <div className="avatar">
            <img src="/logo.png" alt="Mama Mica GLW Logo" className="avatar-logo" />
          </div>
          <div className="avatar-ring"></div>
        </div>

        {/* Header */}
        <header className="header">
          <h1 className="title">Mica Glow</h1>
          <p className="tagline">Your trusted glow essentials</p>
          <p className="bio">Everything you need — prices, authenticity, community, and guides.</p>
        </header>

        {/* Link Buttons */}
        <nav className="links" aria-label="Quick Links">
          {links.map((link, index) => (
            <a
              key={link.id}
              href={link.href}
              className="link-btn"
              id={link.id}
              target="_blank"
              rel="noopener noreferrer"
              style={{ animationDelay: `${0.1 * (index + 1)}s` }}
              onClick={handleRipple}
            >
              <span className="btn-icon">{link.icon}</span>
              <span className="btn-text">{link.text}</span>
              <span className="btn-arrow">→</span>
            </a>
          ))}

          {/* Admin Dropdown */}
          <div className="admin-dropdown" style={{ animationDelay: '0.4s' }}>
            <button
              className={`link-btn admin-toggle ${isAdminOpen ? 'active' : ''}`}
              onClick={toggleAdmin}
              aria-expanded={isAdminOpen}
            >
              <span className="btn-icon">👩‍💼</span>
              <span className="btn-text">Contact Admin</span>
              <span className={`btn-chevron ${isAdminOpen ? 'open' : ''}`}>▼</span>
            </button>
            <div className={`admin-menu ${isAdminOpen ? 'open' : ''}`}>
              {adminLinks.map((admin) => (
                <a
                  key={admin.id}
                  href={admin.href}
                  className="admin-link"
                  id={admin.id}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleRipple}
                >
                  <span className="admin-icon">📱</span>
                  <span className="admin-name">{admin.text}</span>
                  <span className="btn-arrow">→</span>
                </a>
              ))}
            </div>
          </div>
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

        {/* Footer */}
        <footer className="footer">
          <p>&copy; 2026 Mica Glow</p>
        </footer>
      </main>
    </div>
  )
}

export default App
