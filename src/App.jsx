import { useEffect, useState } from 'react'
import './App.css'

const links = [
  { id: 'price-list', icon: '💜', text: 'Price List', href: 'https://docs.google.com/spreadsheets/d/1Akr_wwyNCsMjfKLsEINCNU54Ln61kXM2cfxhKUVwLuk/edit?gid=0#gid=0' },
  { id: 'whatsapp-community', icon: '💬', text: 'Join Community', href: 'https://chat.whatsapp.com/HJLbXPLhu8b9TdRUsQwOrA' },
  { id: 'e-guides', icon: '📘', text: 'Electronic Guides', href: 'https://drive.google.com/drive/folders/1tNuXfOSXyQyyck7BK-BqZNIbvNBpLgXR' },
  { id: 'coa', icon: '📋', text: 'COA', href: 'https://drive.google.com/drive/folders/18cfTEy6FIXlJTcrxoPpeRlr-BzbTG4Kn' },
]

const adminLinks = [
  { id: 'admin-phoebe', text: 'Admin Phoebe', href: 'https://api.whatsapp.com/send?phone=639686450947' },
  { id: 'admin-glia', text: 'Admin Glia', href: 'https://api.whatsapp.com/send?phone=639758609769' },
  { id: 'admin-james', text: 'Admin James', href: 'https://api.whatsapp.com/send?phone=639054620846' },
  { id: 'admin-jec', text: 'Admin Jec', href: 'https://api.whatsapp.com/send?phone=639611521891' },
  { id: 'admin-teddy', text: 'Admin Teddy', href: 'https://api.whatsapp.com/send?phone=639615431545' },
  { id: 'admin-danica', text: 'Admin Danica', href: 'https://api.whatsapp.com/send?phone=639302121321' },
  { id: 'admin-jonina', text: 'Admin Jonina', href: 'https://api.whatsapp.com/send?phone=639058429200' },
]

const verifiedResellers = [
  { region: 'NCR', resellers: [
    { name: 'VR Ranzel', location: 'CAMANAVA', whatsapp: '639772079026' },
    { name: 'Hanigreys', location: 'Las Pinas City', whatsapp: '639778132630' },
    { name: 'Dior', location: 'Las Piñas/Alabang', whatsapp: '639994640938' },
    { name: 'CM', location: 'Makati', whatsapp: '639173810203' },
    { name: 'PJ Padilla', location: 'Mandaluyong', whatsapp: '639356990380' },
    { name: 'Johnny', location: 'Mandaluyong', whatsapp: '639053189325' },
    { name: 'VR Tin V', location: 'Manila', whatsapp: '639156189057' },
    { name: 'VR Donna', location: 'North Caloocan', whatsapp: '639275040723' },
    { name: 'Doonnaa', location: 'North Caloocan/QC', whatsapp: '639940732838' },
    { name: 'VR Kricket', location: 'Quezon City', whatsapp: '639616807032' },
    { name: 'J.ricaaa', location: 'Quezon City', whatsapp: '639619549496' },
    { name: 'Peerpeppers', location: 'Sampaloc, Manila', whatsapp: '639173054436' },
  ]},
  { region: 'Central Luzon', resellers: [
    { name: 'Nikki', location: 'Arayat', whatsapp: '639357838505' },
    { name: 'VR Marthyne', location: 'Bocaue', whatsapp: '639153456788' },
    { name: 'VR TirzMagic', location: 'Marilao, Bulacan', whatsapp: '639625887847' },
    { name: 'Peptide with Katy', location: 'San Fernando & Telabastagan', whatsapp: '639190981812' },
  ]},
  { region: 'CALABARZON', resellers: [
    { name: 'Jonina David', location: 'Bacoor', whatsapp: '639058429200' },
    { name: 'Grey S.', location: 'Cavite', whatsapp: '639452319679' },
    { name: 'Frances T', location: 'Dasmariñas City', whatsapp: '639499516769' },
    { name: 'Jo-Anne Luna-Whaley', location: 'Imus', whatsapp: '639690877490' },
    { name: 'Gossip Glow Macau', location: 'Macau SAR', whatsapp: '639777061224' },
    { name: 'Tina Manahan', location: 'Montalban', whatsapp: '639934015392' },
    { name: 'Jenny De Bianca', location: 'Pasig - Cainta', whatsapp: '639273205785' },
  ]},
  { region: 'MIMAROPA', resellers: [
    { name: 'Own Benefits', location: 'Palawan', whatsapp: '639178281853' },
  ]},
  { region: 'Central Visayas', resellers: [
    { name: '@LaiPepties', location: 'Cebu City', whatsapp: '639976470458' },
  ]},
  { region: 'Zamboanga Peninsula', resellers: [
    { name: 'Malicamp Biobeauty', location: 'Pagadian City', whatsapp: '639099199885' },
    { name: 'VR Paige', location: 'Pagadian City', whatsapp: '639192473712' },
  ]},
  { region: 'Northern Mindanao', resellers: [
    { name: 'VR Jazzey', location: 'Bukidnon', whatsapp: '639209885705' },
    { name: 'Cindelle', location: 'Cagayan de Oro', whatsapp: '639171766929' },
    { name: 'Miks', location: 'CDO & Misamis Oriental', whatsapp: '639309893405' },
  ]},
  { region: 'Davao Region', resellers: [
    { name: 'VR Karen', location: 'Davao Oriental', whatsapp: '639436636693' },
  ]},
  { region: 'SOCCSKSARGEN', resellers: [
    { name: 'Grance Aguilar', location: 'General Santos City', whatsapp: '639206891642' },
  ]},
  { region: 'CARAGA', resellers: [
    { name: 'Jho', location: 'Butuan', whatsapp: '639193548595' },
    { name: 'Kara', location: 'All Cities of Caraga', whatsapp: '639946946430' },
    { name: 'Ranma Saotome', location: 'Caraga Region', whatsapp: '639694603790' },
  ]},
]

function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const [isResellersOpen, setIsResellersOpen] = useState(false)
  const [openRegion, setOpenRegion] = useState(null)
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

  const toggleResellers = (e) => {
    handleRipple(e)
    setIsResellersOpen(!isResellersOpen)
    if (isResellersOpen) setOpenRegion(null)
  }

  const toggleRegion = (regionName) => {
    setOpenRegion(openRegion === regionName ? null : regionName)
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

          {/* Verified Resellers Dropdown */}
          <div className="admin-dropdown" style={{ animationDelay: '0.5s' }}>
            <button
              className={`link-btn admin-toggle ${isResellersOpen ? 'active' : ''}`}
              onClick={toggleResellers}
              aria-expanded={isResellersOpen}
            >
              <span className="btn-icon">✅</span>
              <span className="btn-text">Verified Resellers</span>
              <span className={`btn-chevron ${isResellersOpen ? 'open' : ''}`}>▼</span>
            </button>
            <div className={`admin-menu reseller-menu ${isResellersOpen ? 'open' : ''}`}>
              {verifiedResellers.map((group) => (
                <div key={group.region} className="region-group">
                  <button
                    className={`region-btn ${openRegion === group.region ? 'active' : ''}`}
                    onClick={() => toggleRegion(group.region)}
                  >
                    <span className="region-name">{group.region}</span>
                    <span className="region-count">{group.resellers.length}</span>
                    <span className={`region-chevron ${openRegion === group.region ? 'open' : ''}`}>▼</span>
                  </button>
                  <div className={`region-resellers ${openRegion === group.region ? 'open' : ''}`}>
                    {group.resellers.map((reseller, idx) => (
                      <a
                        key={idx}
                        href={`https://api.whatsapp.com/send?phone=${reseller.whatsapp}`}
                        className="reseller-card"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="reseller-info">
                          <span className="reseller-name">{reseller.name}</span>
                          <span className="reseller-location">{reseller.location}</span>
                        </div>
                        <span className="reseller-wa">💬</span>
                      </a>
                    ))}
                  </div>
                </div>
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
