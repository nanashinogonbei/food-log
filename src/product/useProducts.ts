import { useEffect, useState } from 'react'
import { fetchProductById, fetchProductsByCategoryIds, searchProductsByName } from './data.ts'
import type { ProductSummary } from './data.ts'

interface UseProductsByCategoryResult {
  products: ProductSummary[]
  isLoading: boolean
  error: string | null
}

/**
 * 指定したカテゴリーID群のいずれかに属する商品一覧をAPIから取得する。
 * categoryIdsの中身（順不同）が変わったときだけ再取得する。
 */
export function useProductsByCategory(categoryIds: string[]): UseProductsByCategoryResult {
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 配列の参照ではなく中身で再取得の要否を判定するため、キー文字列化して依存値にする
  const categoryIdsKey = [...categoryIds].sort().join(',')
  const hasCategoryIds = categoryIdsKey !== ''

  useEffect(() => {
    if (!hasCategoryIds) {
      return
    }

    let isMounted = true
    const ids = categoryIdsKey.split(',')

    // categoryIdsKey(タブ切り替え等)が変わるたびに読み込み中表示をリセットする。
    // react-hooks/set-state-in-effectは「依存値変化に応じた再フェッチ前のリセット」も
    // 一律で検出するため、この既知の有効なパターンについては無効化する。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setError(null)

    fetchProductsByCategoryIds(ids)
      .then((data) => {
        if (isMounted) {
          setProducts(data)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : '商品一覧の取得に失敗しました')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [categoryIdsKey, hasCategoryIds])

  // カテゴリーが未確定/空の場合はAPIを呼ばず、その場で空の結果を返す
  if (!hasCategoryIds) {
    return { products: [], isLoading: false, error: null }
  }

  return { products, isLoading, error }
}

interface UseProductResult {
  product: ProductSummary | null
  isLoading: boolean
  error: string | null
}

/**
 * 指定したIDの商品を1件取得する（製品ページ、商品評価ページの事前選択用）。
 */
export function useProduct(productId: string | undefined): UseProductResult {
  const [product, setProduct] = useState<ProductSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!productId) {
      // productIdが無い場合は読み込み対象がないため、読み込み中表示を即座に解除する。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)
    setError(null)

    fetchProductById(productId)
      .then((data) => {
        if (isMounted) {
          setProduct(data)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : '商品の取得に失敗しました')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [productId])

  return { product, isLoading, error }
}

const NAME_SEARCH_MIN_LENGTH = 3
const NAME_SEARCH_DEBOUNCE_MS = 300

interface UseProductSearchResult {
  candidates: ProductSummary[]
  isSearching: boolean
  error: string | null
}

/**
 * 商品名（3文字以上）をデバウンスしながら検索し、候補一覧を返す。
 * 商品評価ページのオートコンプリートで使用する。3文字未満、または空文字が
 * 渡された場合は候補を空にしてAPIは呼ばない（呼び出し側で確定済み商品の
 * 再検索を止めたい場合にも、空文字を渡すことで利用できる）。
 */
export function useProductSearch(query: string): UseProductSearchResult {
  const [candidates, setCandidates] = useState<ProductSummary[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = query.trim()

    if (trimmed.length < NAME_SEARCH_MIN_LENGTH) {
      // 検索文字数に満たない場合は候補をクリアし、APIも呼ばずに即座に確定させる。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCandidates([])
      setIsSearching(false)
      setError(null)
      return
    }

    let isMounted = true
    setIsSearching(true)
    setError(null)

    const timerId = window.setTimeout(() => {
      searchProductsByName(trimmed)
        .then((data) => {
          if (isMounted) {
            setCandidates(data)
          }
        })
        .catch((err: unknown) => {
          if (isMounted) {
            setError(err instanceof Error ? err.message : '商品の検索に失敗しました')
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsSearching(false)
          }
        })
    }, NAME_SEARCH_DEBOUNCE_MS)

    return () => {
      isMounted = false
      window.clearTimeout(timerId)
    }
  }, [query])

  return { candidates, isSearching, error }
}
