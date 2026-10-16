import { Fragment, useId, useState } from 'react'
import { TUTORIAL_CATEGORIES, tutorials } from '../../data/tutorials'
import { useTutorialVideos } from '../../hooks/useTutorialVideos'
import { matchesSearch, splitHighlights } from '../../lib/textSearch'
import { youtubeEmbedUrl } from '../../lib/youtube'
import { TutorialSearch } from './TutorialSearch'
import './tutorials.css'

const ALL_CATEGORIES = 'All'
const CALCULATOR_HASH = '#peptide'
const SKELETON_CARDS = 3

/** @typedef {import('../../data/tutorials').Tutorial} Tutorial */

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
 * @param {{ tutorial: Tutorial }} props
 */
function TutorialPlayer({ tutorial }) {
  return (
    <iframe
      className="tut-player"
      src={youtubeEmbedUrl(tutorial.youtubeId)}
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
 * The title with the visitor's search words marked.
 *
 * @param {{ text: string, query: string }} props
 */
function Highlighted({ text, query }) {
  return splitHighlights(text, query).map((part, index) =>
    part.isMatch ? (
      <mark className="tut-mark" key={index}>
        {part.text}
      </mark>
    ) : (
      <Fragment key={index}>{part.text}</Fragment>
    )
  )
}

/**
 * One tutorial in the grid. An unpublished tutorial renders as a plain card
 * rather than a link or a player, so a visitor is never sent nowhere.
 *
 * @param {{ tutorial: Tutorial, query: string }} props
 */
function TutorialCard({ tutorial, query }) {
  const titleId = useId()
  const isPublished = tutorial.youtubeId !== null
  const meta = [tutorial.category, tutorial.length].filter(Boolean).join(' · ')

  return (
    <article className="tut-card" aria-labelledby={titleId}>
      <div className="tut-card-media">
        {isPublished ? (
          <TutorialPlayer tutorial={tutorial} />
        ) : (
          <>
            <PlayPlaceholder />
            {tutorial.category && <span className="tut-card-category">{tutorial.category}</span>}
            {tutorial.length && <span className="tut-card-length">{tutorial.length}</span>}
          </>
        )}
      </div>
      <div className="tut-card-body">
        <h3 className="tut-card-title" id={titleId}>
          <Highlighted text={tutorial.title} query={query} />
        </h3>
        {tutorial.desc && <p className="tut-card-desc">{tutorial.desc}</p>}
        {!isPublished && <p className="tut-card-status">Coming soon</p>}
        {isPublished && meta && <p className="tut-card-meta">{meta}</p>}
      </div>
    </article>
  )
}

/**
 * @param {{ tutorial: Tutorial }} props
 */
function FeaturedTutorial({ tutorial }) {
  const isPublished = tutorial.youtubeId !== null
  const meta = tutorial.length ? `Start here · ${tutorial.length}` : 'Start here'

  return (
    <article className="tut-featured">
      <div className="tut-featured-media">
        {isPublished ? <TutorialPlayer tutorial={tutorial} /> : <PlayPlaceholder isLarge />}
      </div>
      <div className="tut-featured-body">
        <h2 className="tut-featured-title">{tutorial.title}</h2>
        <p className="tut-featured-meta">{meta}</p>
        {tutorial.desc && <p className="tut-featured-desc">{tutorial.desc}</p>}
        {!isPublished && <p className="tut-card-status">Coming soon</p>}
      </div>
    </article>
  )
}

/** Placeholder shapes while the owner's list loads, so the page does not jump. */
function LibrarySkeleton() {
  return (
    <>
      <p className="tut-visually-hidden" role="status">
        Loading tutorials…
      </p>
      <div className="tut-skeleton tut-skeleton--featured" aria-hidden="true" />
      <div className="tut-grid" aria-hidden="true">
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <div className="tut-skeleton tut-skeleton--card" key={index} />
        ))}
      </div>
    </>
  )
}

/**
 * @param {number} count
 * @param {string} query
 */
function resultsLabel(count, query) {
  return `${count} tutorial${count === 1 ? '' : 's'} for “${query.trim()}”`
}

/**
 * Search, featured walkthrough, category chips and the card grid.
 *
 * @param {{ items: readonly Tutorial[] }} props
 */
function TutorialLibrary({ items }) {
  const [category, setCategory] = useState(ALL_CATEGORIES)
  const [query, setQuery] = useState('')

  const isSearching = query.trim().length > 0
  // Only categories with videos behind them, so no chip leads to an empty grid.
  const categories = TUTORIAL_CATEGORIES.filter((option) =>
    items.some((tutorial) => tutorial.category === option)
  )
  const activeCategory = categories.includes(category) ? category : ALL_CATEGORIES

  // While searching, the hero steps aside and competes like any other result.
  const featuredTutorial = isSearching ? undefined : items.find((tutorial) => tutorial.isFeatured)
  const pool = isSearching ? items : items.filter((tutorial) => !tutorial.isFeatured)
  const shownTutorials = pool.filter(
    (tutorial) =>
      (activeCategory === ALL_CATEGORIES || tutorial.category === activeCategory) &&
      matchesSearch([tutorial.title, tutorial.desc, tutorial.category], query)
  )

  const emptyState = isSearching ? (
    <div className="tut-empty">
      <p className="tut-empty-text">No tutorials match “{query.trim()}”.</p>
      <button type="button" className="tut-empty-action" onClick={() => setQuery('')}>
        Clear search
      </button>
    </div>
  ) : (
    <p className="tut-empty">No tutorials in this category yet.</p>
  )

  return (
    <>
      <TutorialSearch value={query} onChange={setQuery} />

      {featuredTutorial && <FeaturedTutorial tutorial={featuredTutorial} />}

      {categories.length > 0 && (
        <div className="tut-chips" role="radiogroup" aria-label="Filter tutorials by category">
          {[ALL_CATEGORIES, ...categories].map((option) => (
            <CategoryChip
              key={option}
              label={option}
              isSelected={activeCategory === option}
              onSelect={() => setCategory(option)}
            />
          ))}
        </div>
      )}

      <p className="tut-results" aria-live="polite">
        {isSearching ? resultsLabel(shownTutorials.length, query) : ''}
      </p>

      <div className="tut-grid">
        {shownTutorials.map((tutorial) => (
          <TutorialCard key={tutorial.id} tutorial={tutorial} query={query} />
        ))}
        {shownTutorials.length === 0 && emptyState}
      </div>
    </>
  )
}

/**
 * Full-page tutorial library, ported from "Tutorials.dc.html". Presentational:
 * the list arrives through `items` — from TutorialsPage in the app.
 *
 * @param {{ onBack: () => void, items?: readonly Tutorial[], isLoading?: boolean }} props
 */
export function Tutorials({ onBack, items = tutorials, isLoading = false }) {
  const titleId = useId()

  return (
    <section className="tut" aria-labelledby={titleId} aria-busy={isLoading}>
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

        {isLoading ? <LibrarySkeleton /> : <TutorialLibrary items={items} />}

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

/**
 * The Tutorials page as the app renders it: the owner's published list from
 * Supabase, or the bundled library when none has been saved.
 *
 * @param {{ onBack: () => void, client?: import('@supabase/supabase-js').SupabaseClient|null }} props
 */
export function TutorialsPage({ onBack, client }) {
  const { videos, isLoading } = useTutorialVideos({ client })

  return <Tutorials onBack={onBack} items={videos} isLoading={isLoading} />
}
