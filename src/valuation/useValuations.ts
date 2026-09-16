import { useEffect, useState } from 'react'
import { fetchProductRanking, fetchValuationsByProduct, fetchValuationsByUser } from './data.ts'
import type { ProductRanking, RankingPeriod, ValuationSummary } from './data.ts'

interface UseProductRankingResult {
  ranking: ProductRanking[]
  isLoading: boolean
  error: string | null
}

/**
 * 指定した期間（週間/月間/四半期）の評価数ランキング（最大5件）を取得する
 * （トップページの「注目の商品」用）。
 */
export function useProductRanking(period: RankingPeriod): UseProductRankingResult {
  const [ranking, setRanking] = useState<ProductRanking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setError(null)

    fetchProductRanking(period)
      .then((data) => {
        if (isMounted) {
          setRanking(data)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'ランキングの取得に失敗しました')
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
  }, [period])

  return { ranking, isLoading, error }
}

interface UseValuationsResult {
  valuations: ValuationSummary[]
  isLoading: boolean
  error: string | null
  /** 評価投稿後などに一覧を再取得する */
  reload: () => void
}

/** 指定したユーザーが投稿した評価一覧を取得する（マイページの商品評価タブ用） */
export function useUserValuations(userId: string | undefined): UseValuationsResult {
  return useValuationsBy(userId, fetchValuationsByUser)
}

/** 指定した商品に投稿された評価一覧を取得する（製品ページ用） */
export function useProductValuations(productId: string | undefined): UseValuationsResult {
  return useValuationsBy(productId, fetchValuationsByProduct)
}

function useValuationsBy(
  key: string | undefined,
  fetcher: (key: string) => Promise<ValuationSummary[]>,
): UseValuationsResult {
  const [valuations, setValuations] = useState<ValuationSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    if (!key) {
      // 取得対象のキーが無い場合は読み込み対象がないため、読み込み中表示を即座に解除する。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)
    setError(null)

    fetcher(key)
      .then((data) => {
        if (isMounted) {
          setValuations(data)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : '評価一覧の取得に失敗しました')
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
    // fetcher は呼び出し側で固定の関数を渡す想定のため依存配列には含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reloadCount])

  return { valuations, isLoading, error, reload: () => setReloadCount((count) => count + 1) }
}
