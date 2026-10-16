import { useId, useRef } from 'react'

/**
 * Search field for the Tutorials page. Escape and the × button both clear it
 * and keep focus in the field, so a visitor can immediately type again.
 *
 * @param {{ value: string, onChange: (value: string) => void }} props
 */
export function TutorialSearch({ value, onChange }) {
  const inputId = useId()
  const inputRef = useRef(null)

  const clear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && value) {
      event.preventDefault()
      clear()
    }
  }

  return (
    // role="search" rather than <search>: the element is too new for the
    // older iPhones many members are on.
    <div className="tut-search" role="search">
      <svg className="tut-search-icon" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
        <circle cx="8.5" cy="8.5" r="5.75" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="m13 13 4.25 4.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <label className="tut-visually-hidden" htmlFor={inputId}>
        Search tutorials
      </label>
      <input
        ref={inputRef}
        id={inputId}
        className="tut-search-input"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck="false"
        placeholder="Search tutorials — try “pen” or “storage”"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      {value && (
        <button type="button" className="tut-search-clear" aria-label="Clear search text" onClick={clear}>
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  )
}
