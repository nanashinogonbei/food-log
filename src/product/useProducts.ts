import { useEffect, useState } from 'react'
import { fetchProductsByCategoryIds } from './data.ts'
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
