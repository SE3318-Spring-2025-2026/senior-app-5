import { useEffect, useMemo, useRef, useState } from 'react'
import apiClient from '../utils/apiClient'

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.results)) return payload.results
  return []
}

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
        const data = toArray(response.data)
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
      if (containerRef.current && !containerRef.current.contains(event.target)) {
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
    <div ref={containerRef} className="relative w-full">
      {label && (
        <span className="mb-1 block text-xs font-semibold text-slate-400">{label}</span>
      )}
      <div className="relative flex items-center gap-2">
        <input
          type="text"
          className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200
                     placeholder:text-slate-600 focus:border-blue-700 focus:outline-none focus:ring-2
                     focus:ring-blue-600/30"
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
            className="shrink-0 rounded-lg border border-[#1e293b] bg-[#111827] px-2 py-1 text-xs
                       text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-colors"
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
        <ul
          className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl border border-[#1e293b]
                     bg-[#0d1729] shadow-2xl"
          role="listbox"
        >
          {loading && (
            <li className="px-3 py-2 text-sm text-slate-500">Searching…</li>
          )}
          {!loading && error && (
            <li className="px-3 py-2 text-sm text-red-400">{error}</li>
          )}
          {!loading && !error && results.map((item) => {
            const key = item?.[returnField] ?? item?._id ?? Math.random()
            return (
              <li
                key={key}
                className="cursor-pointer px-3 py-2.5 hover:bg-white/[0.04] transition-colors"
                role="option"
                onClick={() => handlePick(item)}
              >
                <span className="block text-sm font-medium text-slate-200">
                  {String(item?.[effectiveDisplayField] ?? '—')}
                </span>
                <span className="block text-xs text-slate-500">
                  {String(item?.[returnField] ?? '')}
                </span>
              </li>
            )
          })}
          {!loading && !error && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
          )}
        </ul>
      )}

      {selected && (
        <small className="mt-1 block text-xs text-slate-600">
          Selected {returnField}: {value}
        </small>
      )}
    </div>
  )
}

export default EntitySearchSelect
