import { useEffect, useId, useState } from 'react'
import {
  fetchCustomLinks,
  fetchLinkOverrides,
  fetchLinkVisibility,
  updateCustomLinks,
  updateLinkOverrides,
  updateLinkVisibility,
} from '../../data/settingsRepository'
import { CUSTOM_LINK_GROUPS, applyLinkOverride, homeControls } from '../../data/homeLinks'
import { isSafeOutboundUrl } from '../../lib/url'

/**
 * The Links tab: visibility, copy and URL edits for the built-in buttons, plus
 * links the owner adds to any category. Built-in buttons are edited through
 * `link_overrides`; added links live whole in `custom_links`, so removing one
 * is a delete rather than an override.
 */

const EMPTY_NEW_LINK = Object.freeze({ icon: '', title: '', desc: '', href: '' })
const CONTACT_GROUP_ID = 'contact'
const ADDABLE_GROUP_IDS = new Set(CUSTOM_LINK_GROUPS.map((group) => group.id))

function createCustomLinkId() {
  const suffix = globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)
  return `custom-${suffix}`
}

/** Admin-row shape for a link the owner added, matching homeControls entries. */
function toEditorLink(customLink) {
  return { ...customLink, canEditHref: true, isCustom: true }
}

function buildEditorGroups(customLinks) {
  return homeControls.map((group) => ({
    ...group,
    links: [
      ...group.links,
      ...customLinks.filter((link) => link.groupId === group.id).map(toEditorLink),
    ],
  }))
}

function buildLinkDrafts(overrides = {}, customLinks = []) {
  const builtIn = homeControls.flatMap((group) =>
    group.links.map((link) => applyLinkOverride(link, overrides))
  )

  return Object.fromEntries(
    [...builtIn, ...customLinks].map((link) => [
      link.id,
      { title: link.title ?? '', desc: link.desc ?? '', href: link.href ?? '' },
    ])
  )
}

/**
 * @param {{ group: {id: string, label: string}, isBusy: boolean, onAdd: (draft: object) => Promise<string|null>, onCancel: () => void }} props
 */
function AddLinkForm({ group, isBusy, onAdd, onCancel }) {
  const iconId = useId()
  const titleId = useId()
  const descId = useId()
  const hrefId = useId()
  const [draft, setDraft] = useState(EMPTY_NEW_LINK)
  const [error, setError] = useState('')
  const isContact = group.id === CONTACT_GROUP_ID

  const update = (field) => (event) => setDraft({ ...draft, [field]: event.target.value })

  const handleSubmit = async (event) => {
    event.preventDefault()

    const title = draft.title.trim()
    const href = draft.href.trim()

    if (!title) {
      setError('Enter a title for the new link.')
      return
    }

    if (!isSafeOutboundUrl(href)) {
      setError('Enter a valid URL, starting with https://')
      return
    }

    setError('')
    const failure = await onAdd({ icon: draft.icon.trim(), title, desc: draft.desc.trim(), href })
    if (failure) setError(failure)
  }

  return (
    <form
      className="admin-link-editor admin-link-add-form"
      aria-label={`New link in ${group.label}`}
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="admin-link-edit-fields">
        {!isContact && (
          <label className="admin-field" htmlFor={iconId}>
            <span className="admin-field-label">Icon (emoji, optional)</span>
            <input
              id={iconId}
              className="admin-input admin-input--link-edit"
              value={draft.icon}
              maxLength={8}
              onChange={update('icon')}
            />
          </label>
        )}

        <label className="admin-field" htmlFor={titleId}>
          <span className="admin-field-label">{isContact ? 'Title (admin name)' : 'Title'}</span>
          <input
            id={titleId}
            className="admin-input admin-input--link-edit"
            value={draft.title}
            onChange={update('title')}
          />
        </label>

        {!isContact && (
          <label className="admin-field admin-link-edit-url" htmlFor={descId}>
            <span className="admin-field-label">Description (optional)</span>
            <input
              id={descId}
              className="admin-input admin-input--link-edit"
              value={draft.desc}
              onChange={update('desc')}
            />
          </label>
        )}

        <label className="admin-field admin-link-edit-url" htmlFor={hrefId}>
          <span className="admin-field-label">URL</span>
          <input
            id={hrefId}
            className="admin-input admin-input--link-edit"
            type="url"
            inputMode="url"
            placeholder={isContact ? 'https://api.whatsapp.com/send?phone=63…' : 'https://'}
            value={draft.href}
            onChange={update('href')}
          />
        </label>
      </div>

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      <div className="admin-link-add-actions">
        <button className="admin-row-save" type="submit" disabled={isBusy}>
          {isBusy ? 'Adding…' : 'Add link'}
        </button>
        <button className="admin-row-ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

/**
 * @param {{ client: import('@supabase/supabase-js').SupabaseClient|null, onSaved: (message: string) => void }} props
 */
export function LinksCard({ client, onSaved }) {
  const [visibility, setVisibility] = useState({})
  const [overrides, setOverrides] = useState({})
  const [customLinks, setCustomLinks] = useState([])
  const [drafts, setDrafts] = useState(() => buildLinkDrafts())
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState('')
  const [addingGroupId, setAddingGroupId] = useState('')
  const [confirmRemoveId, setConfirmRemoveId] = useState('')

  useEffect(() => {
    let active = true

    Promise.all([
      fetchLinkVisibility({ client }),
      fetchLinkOverrides({ client }),
      fetchCustomLinks({ client }),
    ]).then(([visibilityResult, overridesResult, customLinksResult]) => {
      if (!active) return

      setVisibility(visibilityResult.visibility)
      setOverrides(overridesResult.overrides)
      setCustomLinks(customLinksResult.links)
      setDrafts(buildLinkDrafts(overridesResult.overrides, customLinksResult.links))
    })

    return () => {
      active = false
    }
  }, [client])

  /** Saves the whole custom list, rolling back the UI if the write fails. */
  const saveCustomLinks = async (nextLinks, busyId, successMessage) => {
    const previous = customLinks

    setCustomLinks(nextLinks)
    setError('')
    setSavingId(busyId)

    const result = await updateCustomLinks(nextLinks, { client })
    setSavingId('')

    if (!result.ok) {
      setCustomLinks(previous)
      return result.error ?? 'Could not save links.'
    }

    onSaved(successMessage)
    return null
  }

  const handleToggle = async (id) => {
    const next = { ...visibility, [id]: visibility[id] === false }

    setVisibility(next)
    setError('')
    setSavingId(id)

    const result = await updateLinkVisibility(next, { client })
    setSavingId('')

    if (!result.ok) {
      setVisibility(visibility)
      setError(result.error ?? 'Could not save link visibility.')
      return
    }

    onSaved('Link visibility saved')
  }

  const handleDraftChange = (id, field, value) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }))
  }

  const handleSaveCustomDetails = async (link, { title, desc, href }) => {
    const nextLinks = customLinks.map((item) =>
      item.id === link.id ? { ...item, title, desc, href } : item
    )
    const failure = await saveCustomLinks(nextLinks, link.id, 'Link details saved')
    if (failure) setError(failure)
  }

  const handleSaveBuiltInDetails = async (link, { title, desc, href }) => {
    const nextOverride = link.canEditHref ? { title, desc, href } : { title, desc }
    const nextOverrides = { ...overrides, [link.id]: nextOverride }

    setOverrides(nextOverrides)
    setError('')
    setSavingId(link.id)

    const result = await updateLinkOverrides(nextOverrides, { client })
    setSavingId('')

    if (!result.ok) {
      setOverrides(overrides)
      setError(result.error ?? 'Could not save link details.')
      return
    }

    onSaved('Link details saved')
  }

  const handleSaveDetails = (link) => {
    const draft = drafts[link.id] ?? { title: '', desc: '', href: '' }
    const fields = { title: draft.title.trim(), desc: draft.desc.trim(), href: draft.href.trim() }

    if (!fields.title) {
      setError(`Enter a title for ${link.title}.`)
      return
    }

    if (link.canEditHref && !isSafeOutboundUrl(fields.href)) {
      setError(`Enter a valid URL for ${fields.title}.`)
      return
    }

    if (link.isCustom) return handleSaveCustomDetails(link, fields)
    return handleSaveBuiltInDetails(link, fields)
  }

  const handleAdd = async (groupId, fields) => {
    const link = { id: createCustomLinkId(), groupId, ...fields }
    const failure = await saveCustomLinks([...customLinks, link], groupId, 'Link added')
    if (failure) return failure

    setDrafts((current) => ({
      ...current,
      [link.id]: { title: link.title, desc: link.desc, href: link.href },
    }))
    setAddingGroupId('')
    return null
  }

  const handleRemove = async (link) => {
    const nextLinks = customLinks.filter((item) => item.id !== link.id)
    const failure = await saveCustomLinks(nextLinks, link.id, 'Link removed')

    setConfirmRemoveId('')
    if (failure) setError(failure)
  }

  const isBusy = Boolean(savingId)

  return (
    <section className="admin-panel admin-panel--links">
      <div className="admin-panel-head">
        <h2 className="admin-panel-title">Home page buttons</h2>
        <p className="admin-panel-sub">
          Add links to any category, edit button copy and URLs, and show or hide them.
        </p>
      </div>

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      <div className="admin-link-groups">
        {buildEditorGroups(customLinks).map((group) => (
          <div className="admin-link-group" key={group.id}>
            <h3 className="admin-link-group-title">{group.label}</h3>
            <div className="admin-link-toggle-list">
              {group.links.map((link) => {
                const enabled = visibility[link.id] !== false
                const isSaving = savingId === link.id
                const draft = drafts[link.id] ?? { title: link.title, desc: link.desc, href: link.href ?? '' }
                const isConfirmingRemove = confirmRemoveId === link.id

                return (
                  <div className="admin-link-editor" key={link.id}>
                    <label className="admin-link-toggle">
                      <span className="admin-link-toggle-copy">
                        <span className="admin-link-toggle-title">
                          {link.isCustom && link.icon ? `${link.icon} ` : ''}
                          {draft.title || link.title}
                        </span>
                        <span className="admin-link-toggle-desc">
                          {link.adminDesc ?? (draft.desc || (link.isCustom ? 'Added by you.' : link.desc))}
                        </span>
                      </span>
                      <input
                        className="admin-switch-input"
                        type="checkbox"
                        checked={enabled}
                        disabled={isBusy}
                        onChange={() => handleToggle(link.id)}
                      />
                      <span className="admin-switch" aria-hidden="true">
                        <span className="admin-switch-thumb"></span>
                      </span>
                      <span className="admin-link-toggle-state">
                        {isSaving ? 'Saving' : enabled ? 'Visible' : 'Hidden'}
                      </span>
                    </label>

                    <div className="admin-link-edit-fields">
                      <label className="admin-field">
                        <span className="admin-field-label">Title</span>
                        <input
                          className="admin-input admin-input--link-edit"
                          value={draft.title}
                          onChange={(event) => handleDraftChange(link.id, 'title', event.target.value)}
                        />
                      </label>

                      <label className="admin-field">
                        <span className="admin-field-label">Description</span>
                        <input
                          className="admin-input admin-input--link-edit"
                          value={draft.desc}
                          onChange={(event) => handleDraftChange(link.id, 'desc', event.target.value)}
                        />
                      </label>

                      {link.canEditHref && (
                        <label className="admin-field admin-link-edit-url">
                          <span className="admin-field-label">URL</span>
                          <input
                            className="admin-input admin-input--link-edit"
                            type="url"
                            value={draft.href}
                            onChange={(event) => handleDraftChange(link.id, 'href', event.target.value)}
                          />
                        </label>
                      )}

                      {!link.canEditHref && (
                        <p className="admin-link-function-note">
                          Uses the built-in {link.kind === 'route' ? 'page route' : 'button action'}.
                        </p>
                      )}

                      <button
                        className="admin-row-save admin-link-save"
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleSaveDetails(link)}
                      >
                        {isSaving ? 'Saving…' : 'Save details'}
                      </button>
                    </div>

                    {link.isCustom && !isConfirmingRemove && (
                      <button
                        className="admin-row-ghost admin-row-ghost--danger"
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmRemoveId(link.id)}
                      >
                        Remove
                      </button>
                    )}

                    {link.isCustom && isConfirmingRemove && (
                      <div className="admin-product-confirm">
                        <button
                          className="admin-row-danger"
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRemove(link)}
                        >
                          Yes, remove
                        </button>
                        <button
                          className="admin-row-ghost"
                          type="button"
                          onClick={() => setConfirmRemoveId('')}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}

              {ADDABLE_GROUP_IDS.has(group.id) &&
                (addingGroupId === group.id ? (
                  <AddLinkForm
                    group={group}
                    isBusy={isBusy}
                    onAdd={(fields) => handleAdd(group.id, fields)}
                    onCancel={() => setAddingGroupId('')}
                  />
                ) : (
                  <button
                    className="admin-add admin-link-add"
                    type="button"
                    disabled={isBusy}
                    onClick={() => setAddingGroupId(group.id)}
                  >
                    + Add link
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
