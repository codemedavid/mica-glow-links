import { useId, useState } from 'react'
import { TUTORIAL_CATEGORIES, tutorials } from '../../data/tutorials'
import './tutorials.css'

const ALL_CATEGORIES = 'All'
const CALCULATOR_HASH = '#peptide'
// Privacy-enhanced YouTube domain: it sets no tracking cookies until the
// visitor actually presses play.
const YOUTUBE_EMBED_BASE = 'https://www.youtube-nocookie.com/embed/'

/**
 * @param {{ isSelected: boolean, label: string, onSelect: () => void }} props
 */
function CategoryChip({ isSelected, label, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      className={isSelected ? 'tut-chip tut-chip--selected' : 'tut-chip'}
      onClick={onSelect}
    >
      {label}
    </button>
  )
}

/**
 * Embedded YouTube player. Lazy so a page full of tutorials does not pull a
 * player iframe per card before the visitor scrolls to it.
 *
 * @param {{ tutorial: import('../../data/tutorials').Tutorial }} props
 */
function TutorialPlayer({ tutorial }) {
  return (
    <iframe
      className="tut-player"
      src={`${YOUTUBE_EMBED_BASE}${tutorial.youtubeId}`}
      title={tutorial.title}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  )
}

/**
 * @param {{ isLarge?: boolean }} props
 */
function PlayPlaceholder({ isLarge = false }) {
  return (
    <span className={isLarge ? 'tut-play tut-play--large' : 'tut-play'} aria-hidden="true">
      ▶
    </span>
  )
}

/**
 * One tutorial in the grid. An unpublished tutorial renders as a plain card
 * rather than a link or a player, so a visitor is never sent nowhere.
 *
 * @param {{ tutorial: import('../../data/tutorials').Tutorial }} props
 */
function TutorialCard({ tutorial }) {
  const titleId = useId()
  const isPublished = tutorial.youtubeId !== null

  return (
    <article className="tut-card" aria-labelledby={titleId}>
      <div className="tut-card-media">
        {isPublished ? (
          <TutorialPlayer tutorial={tutorial} />
        ) : (
          <>
            <PlayPlaceholder />
            <span className="tut-card-category">{tutorial.category}</span>
            <span className="tut-card-length">{tutorial.length}</span>
          </>
        )}
      </div>
      <div className="tut-card-body">
        <h3 className="tut-card-title" id={titleId}>
          {tutorial.title}
        </h3>
        <p className="tut-card-desc">{tutorial.desc}</p>
        {isPublished ? (
          <p className="tut-card-meta">
            {tutorial.category} · {tutorial.length}
          </p>
        ) : (
          <p className="tut-card-status">Coming soon</p>
        )}
      </div>
    </article>
  )
}

/**
 * Full-page tutorial library, ported from "Tutorials.dc.html".
 *
 * @param {{ onBack: () => void, items?: readonly import('../../data/tutorials').Tutorial[] }} props
 */
export function Tutorials({ onBack, items = tutorials }) {
  const [category, setCategory] = useState(ALL_CATEGORIES)
  const titleId = useId()

  const featuredTutorial = items.find((tutorial) => tutorial.isFeatured)
  const libraryTutorials = items.filter((tutorial) => !tutorial.isFeatured)
  const shownTutorials =
    category === ALL_CATEGORIES
      ? libraryTutorials
      : libraryTutorials.filter((tutorial) => tutorial.category === category)

  return (
    <section className="tut" aria-labelledby={titleId}>
      <div className="tut-shell">
        <div className="tut-topbar">
          <button type="button" className="tut-back" onClick={onBack}>
            ← Back to Links
          </button>
        </div>

        <header className="tut-head">
          <p className="tut-eyebrow">Watch &amp; learn</p>
          <h1 className="tut-title" id={titleId}>
            Peptide Tutorials
          </h1>
          <p className="tut-sub">
            Short, clear walkthroughs for reconstituting vials, using peptide pens, and drawing an
            accurate dose.
          </p>
        </header>

        {featuredTutorial && (
          <article className="tut-featured">
            <div className="tut-featured-media">
              {featuredTutorial.youtubeId !== null ? (
                <TutorialPlayer tutorial={featuredTutorial} />
              ) : (
                <PlayPlaceholder isLarge />
              )}
            </div>
            <div className="tut-featured-body">
              <h2 className="tut-featured-title">{featuredTutorial.title}</h2>
              <p className="tut-featured-meta">Start here · {featuredTutorial.length}</p>
              <p className="tut-featured-desc">{featuredTutorial.desc}</p>
              {featuredTutorial.youtubeId === null && (
                <p className="tut-card-status">Coming soon</p>
              )}
            </div>
          </article>
        )}

        <div className="tut-chips" role="radiogroup" aria-label="Filter tutorials by category">
          {[ALL_CATEGORIES, ...TUTORIAL_CATEGORIES].map((option) => (
            <CategoryChip
              key={option}
              label={option}
              isSelected={category === option}
              onSelect={() => setCategory(option)}
            />
          ))}
        </div>

        <div className="tut-grid">
          {shownTutorials.map((tutorial) => (
            <TutorialCard key={tutorial.id} tutorial={tutorial} />
          ))}
          {shownTutorials.length === 0 && (
            <p className="tut-empty">No tutorials in this category yet.</p>
          )}
        </div>

        <aside className="tut-next">
          <span className="tut-next-tag">
            <span className="tut-next-dot" aria-hidden="true" />
            Next step
          </span>
          <h2 className="tut-next-title">Work out your exact dose</h2>
          <p className="tut-next-desc">
            The calculator turns your vial size, water volume and target dose into the number of
            units to draw.
          </p>
          <a className="tut-cta" href={CALCULATOR_HASH}>
            Open the calculator →
          </a>
        </aside>

        <p className="tut-disclaimer">
          Educational content only. Always confirm technique and dosing with your prescriber.
        </p>

        <p className="tut-copyright">© 2026 Mica Glow</p>
      </div>
    </section>
  )
}
