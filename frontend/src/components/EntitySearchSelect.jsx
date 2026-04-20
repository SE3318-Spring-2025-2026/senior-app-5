// frontend/src/components/EntitySearchSelect.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import apiClient from '../utils/apiClient'
import styles from './EntitySearchSelect.module.css'

/**
 * Reusable entity search + select input.
 *
 * It queries a configurable backend endpoint that exposes a search-by-field
 * pattern (e.g. `GET /users/search?field=email&value=foo`) and lets the user
 * pick a result. The component is agnostic of the resource (users, groups,
 * teams, ...) as long as the endpoint follows the convention.
 *
 * Props:
 * - endpoint:      REST path relative to apiClient base (e.g. '/users/search')
 * - searchField:   Field name the backend should query on (e.g. 'email')
 * - returnField:   Field from each result that should be emitted via onChange
 *                  (e.g. '_id')
 * - displayField:  Field used for the visible label in the dropdown
 *                  (defaults to searchField)
 * - value:         Currently selected returnField value (controlled)
 * - onChange:      Called with the returnField value (or '' when cleared)
 * - onSelect:      Optional, called with the full selected entity
 * - label:         Optional label text
 * - placeholder:   Input placeholder
 * - required:      Marks the hidden value as required in forms
 * - minChars:      Minimum chars before firing a search (default 2)
 * - debounceMs:    Debounce window (default 250ms)
 * - paramNames:    Override query param names if the backend uses different
 *                  keys, e.g. { field: 'filterField', value: 'q' }
 */
function EntitySearchSelect({
  endpoint,
  searchField,
  returnField,
  displayField,
  value,
  onChange,
  onSelect,
  label,
  placeholder,
  required = false,
  minChars = 2,
  debounceMs = 250,
  paramNames,
}) {
  const params = useMemo(
    () => ({
      field: paramNames?.field ?? 'field',
      value: paramNames?.value ?? 'value',
    }),
    [paramNames],
  )

  const effectiveDisplayField = displayField ?? searchField

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const containerRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!value) {
      setSelected(null)
      setQuery('')
    }
  }, [value])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query || query.trim().length < minChars || selected) {
      setResults([])
      setLoading(false)
      setError('')
      setHasSearched(false)
      return undefined
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await apiClient.get(endpoint, {
          params: {
            [params.field]: searchField,
            [params.value]: query.trim(),
          },
        })
        const data = Array.isArray(response.data) ? response.data : []
        setResults(data)
        setOpen(true)
        setError('')
        setHasSearched(true)
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Search failed.'
        setError(Array.isArray(message) ? message.join(', ') : message)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => clearTimeout(debounceRef.current)
  }, [query, endpoint, searchField, params, minChars, debounceMs, selected])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (event) => {
    const nextQuery = event.target.value
    setQuery(nextQuery)
    if (selected) {
      setSelected(null)
      onChange?.('')
    }
  }

  const handlePick = (item) => {
    setSelected(item)
    setQuery(String(item?.[effectiveDisplayField] ?? ''))
    setOpen(false)
    setResults([])
    onChange?.(item?.[returnField] ?? '')
    onSelect?.(item)
  }

  const handleClear = () => {
    setSelected(null)
    setQuery('')
    setResults([])
    setOpen(false)
    onChange?.('')
    onSelect?.(null)
  }

  return (
    <div ref={containerRef} className={styles.wrapper}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.inputRow}>
        <input
          type="text"
          className={styles.input}
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (results.length > 0 && !selected) setOpen(true)
          }}
          placeholder={placeholder}
          autoComplete="off"
        />
        {selected && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
            aria-label="Clear selection"
          >
            Clear
          </button>
        )}
        <input
          type="text"
          value={value ?? ''}
          readOnly
          required={required}
          tabIndex={-1}
          aria-hidden="true"
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute', pointerEvents: 'none' }}
        />
      </div>

      {open && !selected && (loading || hasSearched || error) && (
        <ul className={styles.dropdown} role="listbox">
          {loading && <li className={styles.status}>Searching…</li>}
          {!loading && error && (
            <li className={`${styles.status} ${styles.errorStatus}`}>
              {error}
            </li>
          )}
          {!loading &&
            !error &&
            results.map((item) => {
              const key = item?.[returnField] ?? item?._id ?? Math.random()
              return (
                <li
                  key={key}
                  className={styles.option}
                  role="option"
                  onClick={() => handlePick(item)}
                >
                  <span className={styles.optionPrimary}>
                    {String(item?.[effectiveDisplayField] ?? '—')}
                  </span>
                  <span className={styles.optionSecondary}>
                    {String(item?.[returnField] ?? '')}
                  </span>
                </li>
              )
            })}
          {!loading && !error && results.length === 0 && (
            <li className={styles.status}>No matches</li>
          )}
        </ul>
      )}

      {selected && (
        <small className={styles.hint}>
          Selected {returnField}: {value}
        </small>
      )}
    </div>
  )
}

export default EntitySearchSelect
