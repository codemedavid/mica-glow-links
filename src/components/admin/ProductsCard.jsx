import { useId, useMemo, useState } from 'react'
import { useAdminProducts } from '../../hooks/useAdminProducts'

/**
 * The editable catalogue in the admin page's Prices tab — the product list,
 * stock switches and "+ Add" sheet from "Admin.dc.html".
 *
 * It writes to the same `products` table the order calculator reads, so a
 * price saved here is the price the next quote uses. There is no separate
 * admin copy of the catalogue to drift out of sync.
 */

/** Enough rows to browse, few enough to stay responsive on a phone. */
const MAX_VISIBLE = 40

const STOCK_OPTIONS = [
  { value: 'in', label: 'In stock' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
  { value: 'unknown', label: 'Unknown' },
]

const EMPTY_DRAFT = { code: '', name: '', spec: '', vial: '', stock: 'in' }

/**
 * One editable row. The price is a draft until saved, so a half-typed number
 * never reaches the database and the Save button can say whether anything
 * actually changed.
 *
 * @param {object} props
 * @param {import('../../data/products').Product} props.product
 * @param {(vial: string) => Promise<{ok: boolean}>} props.onSave
 * @param {(stock: string) => Promise<{ok: boolean}>} props.onStockChange
 * @param {() => Promise<{ok: boolean}>} props.onRemove
 */
function ProductRow({ product, onSave, onStockChange, onRemove }) {
  const [draftPrice, setDraftPrice] = useState(String(product.vial))
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)
  const [isBusy, setIsBusy] = useState(false)

  const isDirty = draftPrice !== String(product.vial)

  const handleSave = async () => {
    setIsBusy(true)
    await onSave(draftPrice)
    setIsBusy(false)
  }

  const handleRemove = async () => {
    setIsBusy(true)
    await onRemove()
    setIsBusy(false)
    setIsConfirmingRemove(false)
  }

  return (
    <li className="admin-product">
      <div className="admin-product-head">
        <span className="admin-product-code">{product.code}</span>
        <span className="admin-product-name">{product.name}</span>
      </div>

      {product.spec && <p className="admin-product-spec">{product.spec}</p>}

      <div className="admin-product-controls">
        <span className="admin-product-peso" aria-hidden="true">
          ₱
        </span>
        <input
          className="admin-input admin-input--compact"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          aria-label={`Price for ${product.code}`}
          value={draftPrice}
          onChange={(event) => setDraftPrice(event.target.value)}
        />

        <select
          className="admin-select"
          aria-label={`Stock for ${product.code}`}
          value={product.stock}
          disabled={isBusy}
          onChange={(event) => onStockChange(event.target.value)}
        >
          {STOCK_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          className="admin-row-save"
          type="button"
          aria-label={`Save ${product.code}`}
          disabled={!isDirty || isBusy}
          onClick={handleSave}
        >
          Save
        </button>
      </div>

      {isConfirmingRemove ? (
        <div className="admin-product-confirm">
          <button
            className="admin-row-danger"
            type="button"
            aria-label={`Confirm remove ${product.code}`}
            disabled={isBusy}
            onClick={handleRemove}
          >
            Remove for good
          </button>
          <button
            className="admin-row-ghost"
            type="button"
            aria-label={`Keep ${product.code}`}
            onClick={() => setIsConfirmingRemove(false)}
          >
            Keep
          </button>
        </div>
      ) : (
        <button
          className="admin-row-ghost admin-row-ghost--danger"
          type="button"
          aria-label={`Remove ${product.code}`}
          onClick={() => setIsConfirmingRemove(true)}
        >
          Remove
        </button>
      )}
    </li>
  )
}

/**
 * @param {object} props
 * @param {(draft: typeof EMPTY_DRAFT) => Promise<{ok: boolean, error: string|null}>} props.onSubmit
 * @param {() => void} props.onCancel
 */
function AddProductSheet({ onSubmit, onCancel }) {
  const codeId = useId()
  const nameId = useId()
  const specId = useId()
  const priceId = useId()
  const stockId = useId()

  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const update = (field) => (event) =>
    setDraft((current) => ({ ...current, [field]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsBusy(true)
    const result = await onSubmit(draft)
    setIsBusy(false)

    if (!result.ok) setError(result.error ?? 'Could not add the product.')
  }

  return (
    <div className="admin-sheet" role="dialog" aria-modal="true" aria-label="Add a product">
      <form className="admin-sheet-card" onSubmit={handleSubmit}>
        <h3 className="admin-panel-title">Add a product</h3>

        <label className="admin-field" htmlFor={codeId}>
          <span className="admin-field-label">Product code</span>
          <input id={codeId} className="admin-input" value={draft.code} onChange={update('code')} />
        </label>

        <label className="admin-field" htmlFor={nameId}>
          <span className="admin-field-label">Product name</span>
          <input id={nameId} className="admin-input" value={draft.name} onChange={update('name')} />
        </label>

        <label className="admin-field" htmlFor={specId}>
          <span className="admin-field-label">Spec (optional)</span>
          <input id={specId} className="admin-input" value={draft.spec} onChange={update('spec')} />
        </label>

        <label className="admin-field" htmlFor={priceId}>
          <span className="admin-field-label">Price (₱)</span>
          <input
            id={priceId}
            className="admin-input"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={draft.vial}
            onChange={update('vial')}
          />
        </label>

        <label className="admin-field" htmlFor={stockId}>
          <span className="admin-field-label">Stock</span>
          <select
            id={stockId}
            className="admin-select admin-select--block"
            value={draft.stock}
            onChange={update('stock')}
          >
            {STOCK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}

        <button className="admin-primary" type="submit" disabled={isBusy}>
          {isBusy ? 'Adding…' : 'Save new product'}
        </button>
        <button className="admin-row-ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
      </form>
    </div>
  )
}

/**
 * @param {object} props
 * @param {import('@supabase/supabase-js').SupabaseClient|null} props.client
 * @param {(message: string) => void} [props.onSaved]
 */
export function ProductsCard({ client, onSaved = () => {} }) {
  const {
    products,
    isLoading,
    error: loadError,
    save,
    setStock,
    remove,
  } = useAdminProducts({ client })
  const searchId = useId()
  const [query, setQuery] = useState('')
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [writeError, setWriteError] = useState('')

  const trimmedQuery = query.trim().toLowerCase()

  const matches = useMemo(() => {
    if (!trimmedQuery) return products
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(trimmedQuery) ||
        product.code.toLowerCase().includes(trimmedQuery) ||
        (product.spec ?? '').toLowerCase().includes(trimmedQuery)
    )
  }, [products, trimmedQuery])

  const visible = matches.slice(0, MAX_VISIBLE)

  /** Runs a write, surfacing its reason instead of letting it fail quietly. */
  const attempt = async (operation, successMessage) => {
    setWriteError('')
    const result = await operation()

    if (!result.ok) {
      setWriteError(result.error ?? 'Could not save that change.')
      return result
    }

    onSaved(successMessage)
    return result
  }

  const handleAdd = async (draft) => {
    const result = await attempt(() => save(draft), `Added ${String(draft.code).trim()}`)
    if (result.ok) setIsSheetOpen(false)
    return result
  }

  // A failed write is the more urgent of the two, so it wins the one alert slot.
  const error = writeError || loadError

  const countLabel = trimmedQuery
    ? `${matches.length} of ${products.length} products`
    : `${products.length} product${products.length === 1 ? '' : 's'}`

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <h2 className="admin-panel-title">Products</h2>
        <p className="admin-panel-sub">
          The order calculator quotes these prices. Saving here changes the next quote.
        </p>
      </div>

      <div className="admin-product-toolbar">
        <label className="admin-visually-hidden" htmlFor={searchId}>
          Search products
        </label>
        <input
          id={searchId}
          className="admin-input admin-input--search"
          type="search"
          placeholder="Search products"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="admin-add" type="button" onClick={() => setIsSheetOpen(true)}>
          + Add
        </button>
      </div>

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      <p className="admin-hint">{isLoading ? 'Loading the price list…' : countLabel}</p>

      {!isLoading && products.length === 0 && (
        <p className="admin-pending">No products yet. Add the first one with “+ Add”.</p>
      )}

      {!isLoading && products.length > 0 && matches.length === 0 && (
        <p className="admin-pending">No products match “{query.trim()}”.</p>
      )}

      {visible.length > 0 && (
        <ul className="admin-product-list">
          {visible.map((product) => (
            <ProductRow
              key={product.code}
              product={product}
              onSave={(vial) => attempt(() => save({ ...product, vial }), `Saved ${product.code}`)}
              onStockChange={(stock) =>
                attempt(() => setStock(product.code, stock), `Saved ${product.code}`)
              }
              onRemove={() => attempt(() => remove(product.code), `Removed ${product.code}`)}
            />
          ))}
        </ul>
      )}

      {matches.length > visible.length && (
        <p className="admin-hint">Showing the first {MAX_VISIBLE}. Search to narrow the list.</p>
      )}

      {isSheetOpen && (
        <AddProductSheet onSubmit={handleAdd} onCancel={() => setIsSheetOpen(false)} />
      )}
    </section>
  )
}
