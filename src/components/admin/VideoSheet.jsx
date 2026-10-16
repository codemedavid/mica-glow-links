import { useId, useState } from 'react'
import { TUTORIAL_CATEGORIES } from '../../data/tutorials'
import { parseYouTubeId, youtubeThumbnailUrl, youtubeWatchUrl } from '../../lib/youtube'

/**
 * The add / edit sheet in the admin page's Videos tab. Same bottom-sheet shell
 * as "Add a product", so the two tabs feel like one tool.
 *
 * The link field confirms what it understood as the owner types — a thumbnail
 * of the actual video — so a wrong paste is caught here, not on the live page.
 */

const TITLE_MAX = 90
const DESC_MAX = 240
const LENGTH_PATTERN = /^(\d{1,2}:)?\d{1,2}:[0-5]\d$/

/** @typedef {import('../../data/tutorials').Tutorial} Tutorial */

/** @returns {string} */
function createVideoId() {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
  return `video-${random.slice(0, 8)}`
}

/**
 * @param {Tutorial|undefined} video
 */
function initialDraft(video) {
  return {
    link: video?.youtubeId ? youtubeWatchUrl(video.youtubeId) : '',
    title: video?.title ?? '',
    desc: video?.desc ?? '',
    category: video?.category || TUTORIAL_CATEGORIES[0],
    length: video?.length ?? '',
    isFeatured: video?.isFeatured ?? false,
  }
}

/**
 * @param {ReturnType<typeof initialDraft>} draft
 * @returns {string|null}
 */
function validate(draft) {
  if (!draft.title.trim()) return 'Give the video a title.'
  if (draft.link.trim() && !parseYouTubeId(draft.link)) {
    return 'That link is not a YouTube video. Copy it from YouTube’s Share button.'
  }
  if (draft.length.trim() && !LENGTH_PATTERN.test(draft.length.trim())) {
    return 'Write the length as minutes:seconds, like 3:20.'
  }
  return null
}

/**
 * @param {{ link: string }} props
 */
function LinkPreview({ link }) {
  const videoId = parseYouTubeId(link)

  if (!link.trim()) {
    return (
      <p className="admin-hint">
        Optional. Leave it empty and the video shows as “Coming soon”.
      </p>
    )
  }

  if (!videoId) {
    return <p className="admin-video-link-state admin-video-link-state--bad">Not a YouTube video link yet.</p>
  }

  return (
    <div className="admin-video-preview">
      <img
        src={youtubeThumbnailUrl(videoId)}
        alt="Preview of the linked video"
        width="480"
        height="360"
        loading="lazy"
      />
      <div className="admin-video-preview-copy">
        <span className="admin-video-link-state admin-video-link-state--ok">✓ Video found</span>
        <a href={youtubeWatchUrl(videoId)} target="_blank" rel="noopener noreferrer">
          Open on YouTube ↗
        </a>
      </div>
    </div>
  )
}

/**
 * @param {object} props
 * @param {Tutorial} [props.video]  Present when editing; absent when adding.
 * @param {(video: Tutorial) => Promise<{ok: boolean, error: string|null}>} props.onSubmit
 * @param {() => void} props.onCancel
 */
export function VideoSheet({ video, onSubmit, onCancel }) {
  const headingId = useId()
  const linkId = useId()
  const titleId = useId()
  const descId = useId()
  const categoryId = useId()
  const lengthId = useId()

  const [draft, setDraft] = useState(() => initialDraft(video))
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const isEditing = Boolean(video)
  const heading = isEditing ? 'Edit video' : 'Add a video'
  const submitLabel = isEditing ? 'Save changes' : 'Publish video'

  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const problem = validate(draft)
    if (problem) {
      setError(problem)
      return
    }

    setError('')
    setIsBusy(true)
    const result = await onSubmit({
      id: video?.id ?? createVideoId(),
      title: draft.title.trim(),
      desc: draft.desc.trim(),
      category: draft.category,
      length: draft.length.trim(),
      youtubeId: parseYouTubeId(draft.link),
      isFeatured: draft.isFeatured,
    })
    setIsBusy(false)

    if (!result.ok) setError(result.error ?? 'Could not save the video.')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && !isBusy) onCancel()
  }

  return (
    <div
      className="admin-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      onKeyDown={handleKeyDown}
    >
      <form className="admin-sheet-card admin-video-sheet" onSubmit={handleSubmit} noValidate>
        <h3 className="admin-panel-title" id={headingId}>
          {heading}
        </h3>

        <div className="admin-field">
          <label className="admin-field-label" htmlFor={linkId}>
            YouTube link
          </label>
          <input
            id={linkId}
            className="admin-input"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://youtu.be/…"
            // The sheet exists to take this one paste; start there.
            autoFocus
            value={draft.link}
            onChange={update('link')}
          />
          <LinkPreview link={draft.link} />
        </div>

        <div className="admin-field">
          <label className="admin-field-label admin-field-label--split" htmlFor={titleId}>
            <span>Title</span>
            <span className="admin-counter" aria-hidden="true">
              {draft.title.length}/{TITLE_MAX}
            </span>
          </label>
          <input
            id={titleId}
            className="admin-input"
            maxLength={TITLE_MAX}
            placeholder="e.g. Drawing your dose in units"
            value={draft.title}
            onChange={update('title')}
          />
        </div>

        <div className="admin-field">
          <label className="admin-field-label" htmlFor={descId}>
            Description (optional)
          </label>
          <textarea
            id={descId}
            className="admin-input admin-textarea"
            rows={3}
            maxLength={DESC_MAX}
            placeholder="What will the viewer learn?"
            value={draft.desc}
            onChange={update('desc')}
          />
        </div>

        <div className="admin-video-sheet-row">
          <div className="admin-field">
            <label className="admin-field-label" htmlFor={categoryId}>
              Category
            </label>
            <select
              id={categoryId}
              className="admin-select admin-select--block"
              value={draft.category}
              onChange={update('category')}
            >
              {TUTORIAL_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-field">
            <label className="admin-field-label" htmlFor={lengthId}>
              Length
            </label>
            <input
              id={lengthId}
              className="admin-input"
              inputMode="numeric"
              placeholder="e.g. 3:20"
              value={draft.length}
              onChange={update('length')}
            />
          </div>
        </div>

        <label className="admin-video-feature">
          <input type="checkbox" checked={draft.isFeatured} onChange={update('isFeatured')} />
          <span className="admin-video-feature-copy">
            <strong>Feature at the top</strong>
            <span className="admin-hint">Shown first as the “Start here” video.</span>
          </span>
        </label>

        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}

        <button className="admin-primary" type="submit" disabled={isBusy}>
          {isBusy ? 'Saving…' : submitLabel}
        </button>
        <button className="admin-row-ghost" type="button" onClick={onCancel} disabled={isBusy}>
          Cancel
        </button>
      </form>
    </div>
  )
}
