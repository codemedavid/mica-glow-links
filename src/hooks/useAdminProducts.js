import { useCallback, useEffect, useState } from 'react'
import {
  deleteProduct,
  listProducts,
  saveProduct,
  setProductStock,
  sortProducts,
} from '../data/productsRepository'

/**
 * The editable price list behind the admin page's Prices tab.
 *
 * Deliberately not useProducts: that hook serves customers and falls back to
 * the catalogue bundled into the build so the calculator is never empty. Here
 * a stand-in would be a trap, because the owner would be editing rows that do
 * not exist. This hook shows the table and nothing else.
 *
 * After a successful write the list is reconciled locally rather than
 * refetched: the repository hands back the saved product in the app's Product
 * shape, so a second round trip would only re-fetch what we already know.
 *
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 */
export function useAdminProducts({ client } = {}) {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    // No setIsLoading(true) here: the initial state is already loading, and
    // setting state synchronously in an effect body only triggers a cascading
    // render. The flag is cleared once, when the read lands.
    listProducts({ client }).then((result) => {
      if (!active) return
      setProducts(result.products)
      setError(result.error)
      setIsLoading(false)
    })

    return () => {
      active = false
    }
  }, [client])

  const save = useCallback(
    async (input) => {
      const result = await saveProduct(input, { client })
      if (!result.ok) return result

      setProducts((current) => {
        const others = current.filter((product) => product.code !== result.product.code)
        return sortProducts([...others, result.product])
      })

      return result
    },
    [client]
  )

  const setStock = useCallback(
    async (code, stock) => {
      const result = await setProductStock(code, stock, { client })
      if (!result.ok) return result

      setProducts((current) =>
        current.map((product) =>
          product.code === code ? { ...product, stock: result.stock } : product
        )
      )

      return result
    },
    [client]
  )

  const remove = useCallback(
    async (code) => {
      const result = await deleteProduct(code, { client })
      if (!result.ok) return result

      setProducts((current) => current.filter((product) => product.code !== code))

      return result
    },
    [client]
  )

  return { products, isLoading, error, save, setStock, remove }
}
