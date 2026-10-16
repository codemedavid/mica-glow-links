import { useId, useState } from 'react'
import { useAdminVideos } from '../../hooks/useAdminVideos'
import { addVideo, moveVideo, removeVideo, replaceVideo, toggleFeatured } from '../../data/videoList'
import { matchesSearch } from '../../lib/textSearch'
import { youtubeThumbnailUrl } from '../../lib/youtube'
import { VideoSheet } from './VideoSheet'
import './admin-videos.css'

/**
 * The admin page's Videos tab: the tutorial library customers see on the
 * Tutorials page, editable without a deploy.
 *
 * Each action saves the whole list immediately, the same "tap and it's live"
 * model as the link switches. The list on screen only changes once the
 * database has accepted the write.
 */

/** @typedef {import('../../data/tutorials').Tutorial} Tutorial */

/**
 * @param {readonly Tutorial[]} videos
 * @param {readonly Tutorial[]} matches
 * @param {boolean} isSearching
 */
function countLabel(videos, matches, isSearching) {
  if (isSearching) return `${matches.length} of ${videos.length} videos`

  const live = videos.filter((video) => video.youtubeId).length
  return `${videos.length} video${videos.length === 1 ? '' : 's'} · ${live} live`
}

/**
 * @param {object} props
 * @param {Tutorial} props.video
 * @param {boolean} props.isFirst
 * @param {boolean} props.isLast
 * @param {boolean} props.canReorder  False while searching: moving within a
 *   filtered view would jump past rows the owner cannot see.
 * @param {boolean} props.isDisabled
 * @param {() => void} props.onEdit
 * @param {(direction: -1|1) => void} props.onMove
 * @param {() => void} props.onToggleFeatured
 * @param {() => Promise<unknown>} props.onRemove
 */
function VideoRow({
  video,
  isFirst,
  isLast,
  canReorder,
  isDisabled,
  onEdit,
  onMove,
  onToggleFeatured,
  onRemove,
}) {
  const titleId = useId()
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)
  const isLive = Boolean(video.youtubeId)
  const meta = [video.category, video.length].filter(Boolean).join(' · ')
  const featureClass = video.isFeatured ? 'admin-row-ghost admin-row-ghost--on' : 'admin-row-ghost'

  const handleRemove = async () => {
    await onRemove()
    setIsConfirmingRemove(false)
  }

  return (
    <li className="admin-video" aria-labelledby={titleId}>
      <div className="admin-video-thumb">
        {isLive ? (
          <img
            src={youtubeThumbnailUrl(video.youtubeId)}
            alt=""
            width="480"
            height="360"
            loading="lazy"
          />
        ) : (
          <span className="admin-video-thumb-empty" aria-hidden="true">
            ▶
          </span>
        )}
        {video.isFeatured && <span className="admin-video-badge">Featured</span>}
      </div>

      <div className="admin-video-body">
        <p className="admin-video-title" id={titleId}>
          {video.title}
        </p>
        {meta && <p className="admin-video-meta">{meta}</p>}
        <span className={isLive ? 'admin-video-status admin-video-status--live' : 'admin-video-status'}>
          {isLive ? 'Live' : 'Coming soon'}
        </span>
      </div>

      <div className="admin-video-actions">
        <button
          className="admin-row-ghost"
          type="button"
          aria-label={`Edit ${video.title}`}
          disabled={isDisabled}
          onClick={onEdit}
        >
          Edit
        </button>
        <button
          className={featureClass}
          type="button"
          aria-pressed={video.isFeatured}
          aria-label={`Feature ${video.title} at the top`}
          disabled={isDisabled}
          onClick={onToggleFeatured}
        >
          {video.isFeatured ? '★ Featured' : '☆ Feature'}
        </button>
        {canReorder && (
          <span className="admin-video-move">
            <button
              className="admin-row-ghost admin-row-icon"
              type="button"
              aria-label={`Move ${video.title} up`}
              disabled={isDisabled || isFirst}
              onClick={() => onMove(-1)}
            >
              ↑
            </button>
            <button
              className="admin-row-ghost admin-row-icon"
              type="button"
              aria-label={`Move ${video.title} down`}
              disabled={isDisabled || isLast}
              onClick={() => onMove(1)}
            >
              ↓
            </button>
          </span>
        )}
        {isConfirmingRemove ? (
          <span className="admin-product-confirm">
            <button
              className="admin-row-danger"
              type="button"
              disabled={isDisabled}
              onClick={handleRemove}
            >
              Remove for good
            </button>
            <button
              className="admin-row-ghost"
              type="button"
              onClick={() => setIsConfirmingRemove(false)}
            >
              Keep
            </button>
          </span>
        ) : (
          <button
            className="admin-row-ghost admin-row-ghost--danger"
            type="button"
            aria-label={`Remove ${video.title}`}
            disabled={isDisabled}
            onClick={() => setIsConfirmingRemove(true)}
          >
            Remove
          </button>
        )}
      </div>
    </li>
  )
}

/**
 * @param {object} props
 * @param {import('@supabase/supabase-js').SupabaseClient|null} props.client
 * @param {(message: string) => void} [props.onSaved]
 */
export function VideosCard({ client, onSaved = () => {} }) {
  const {
    videos,
    source,
    error: loadError,
    isLoading,
    canEdit,
    reload,
    commit,
  } = useAdminVideos({ client })
  const searchId = useId()
  const [query, setQuery] = useState('')
  // null when closed; { video } when editing; {} when adding.
  const [sheet, setSheet] = useState(null)
  const [writeError, setWriteError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const isSearching = query.trim().length > 0
  const matches = videos.filter((video) =>
    matchesSearch([video.title, video.desc, video.category], query)
  )

  /** Saves a whole new list and announces success. */
  const save = async (next, successMessage) => {
    setWriteError('')
    setIsSaving(true)
    const result = await commit(next)
    setIsSaving(false)

    if (result.ok) onSaved(successMessage)
    return result
  }

  /** Row actions report a refusal into the card; the sheet reports into itself. */
  const saveFromRow = async (next, successMessage) => {
    const result = await save(next, successMessage)
    if (!result.ok) setWriteError(result.error ?? 'Could not save that change.')
  }

  const handleSheetSubmit = async (video) => {
    const isNew = !sheet?.video
    const next = isNew ? addVideo(videos, video) : replaceVideo(videos, video)
    const result = await save(next, isNew ? 'Video added' : 'Video saved')

    if (result.ok) setSheet(null)
    return result
  }

  const error = writeError || loadError
  const showDefaultsNote = !isLoading && !loadError && source === 'fallback'

  return (
    <section className="admin-panel admin-panel--videos">
      <div className="admin-panel-head">
        <h2 className="admin-panel-title">Tutorial videos</h2>
        <p className="admin-panel-sub">
          Paste a YouTube link and a title. It appears on the Tutorials page straight away.
        </p>
      </div>

      <div className="admin-product-toolbar">
        <label className="admin-visually-hidden" htmlFor={searchId}>
          Search videos
        </label>
        <input
          id={searchId}
          className="admin-input admin-input--search"
          type="search"
          placeholder="Search videos"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          className="admin-add"
          type="button"
          disabled={!canEdit}
          onClick={() => setSheet({})}
        >
          + Add video
        </button>
      </div>

      {error && (
        <div className="admin-video-error">
          <p className="admin-error" role="alert">
            {error}
          </p>
          {loadError && (
            <button className="admin-row-ghost" type="button" onClick={reload}>
              Try again
            </button>
          )}
        </div>
      )}

      {showDefaultsNote && (
        <p className="admin-video-note">
          These are the built-in tutorials. Your first change saves this list, and from then on the
          Tutorials page shows exactly what is here.
        </p>
      )}

      <p className="admin-hint" aria-live="polite">
        {isLoading ? 'Loading videos…' : countLabel(videos, matches, isSearching)}
      </p>

      {!isLoading && videos.length === 0 && (
        <p className="admin-pending">No videos yet. Add the first one with “+ Add video”.</p>
      )}

      {!isLoading && videos.length > 0 && matches.length === 0 && (
        <p className="admin-pending">No videos match “{query.trim()}”.</p>
      )}

      {!isLoading && matches.length > 0 && (
        <ul className="admin-video-list">
          {matches.map((video) => (
            <VideoRow
              key={video.id}
              video={video}
              isFirst={video.id === videos[0]?.id}
              isLast={video.id === videos.at(-1)?.id}
              canReorder={!isSearching}
              isDisabled={!canEdit || isSaving}
              onEdit={() => setSheet({ video })}
              onMove={(direction) =>
                saveFromRow(moveVideo(videos, video.id, direction), 'Order saved')
              }
              onToggleFeatured={() =>
                saveFromRow(
                  toggleFeatured(videos, video.id),
                  video.isFeatured ? 'Removed from the top' : 'Featured at the top'
                )
              }
              onRemove={() => saveFromRow(removeVideo(videos, video.id), 'Video removed')}
            />
          ))}
        </ul>
      )}

      {sheet && (
        <VideoSheet
          video={sheet.video}
          onSubmit={handleSheetSubmit}
          onCancel={() => setSheet(null)}
        />
      )}
    </section>
  )
}
