// PHP API (api/valuations.php) へ商品評価を送信・取得する

export type ValuationScore = 'poor' | 'like' | 'love'

/** 評価の選択肢（イマイチ/好き/大好き）。フォームの単一選択に使う。 */
export const VALUATION_SCORE_OPTIONS: { value: ValuationScore; label: string }[] = [
  { value: 'poor', label: 'イマイチ' },
  { value: 'like', label: '好き' },
  { value: 'love', label: '大好き' },
]

export interface ValuationPayload {
  userId: string
  productId: number
  score: ValuationScore
  comment: string
  purchasePrice?: string
  purchaseStore?: string
}

export interface ValuationSubmitResult {
  id: number
  productId: number
  score: ValuationScore
}

export interface ValuationSummary {
  id: number
  productId: number
  productName: string
  productPhoto: string | null
  userId: string
  score: ValuationScore
  scoreLabel: string
  comment: string
  purchasePrice: string | null
  purchaseStore: string | null
  createdAt: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/**
 * 商品評価フォームの内容をAPI(api/valuations.php)に送信する。
 */
export async function submitValuation(payload: ValuationPayload): Promise<ValuationSubmitResult> {
  const formData = new FormData()
  formData.append('userId', payload.userId)
  formData.append('productId', String(payload.productId))
  formData.append('score', payload.score)
  formData.append('comment', payload.comment)
  if (payload.purchasePrice) {
    formData.append('purchasePrice', payload.purchasePrice)
  }
  if (payload.purchaseStore) {
    formData.append('purchaseStore', payload.purchaseStore)
  }

  const response = await fetch(`${API_BASE_URL}/valuations.php`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
    body: formData,
  })

  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : `商品評価の投稿に失敗しました (status: ${response.status})`
    throw new Error(message)
  }

  return data as ValuationSubmitResult
}

/**
 * 指定したユーザーが投稿した評価一覧を取得する（マイページの商品評価タブ用）。
 */
export function fetchValuationsByUser(userId: string): Promise<ValuationSummary[]> {
  return fetchValuations({ userId })
}

/**
 * 指定した商品に投稿された評価一覧を取得する（製品ページ用）。
 */
export function fetchValuationsByProduct(productId: string): Promise<ValuationSummary[]> {
  return fetchValuations({ productId })
}

async function fetchValuations(query: { userId?: string; productId?: string }): Promise<ValuationSummary[]> {
  const params = new URLSearchParams()
  if (query.userId) {
    params.set('userId', query.userId)
  }
  if (query.productId) {
    params.set('productId', query.productId)
  }

  const response = await fetch(`${API_BASE_URL}/valuations.php?${params.toString()}`, {
    method: 'GET',
    mode: 'cors',
    cache: 'default',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`評価一覧の取得に失敗しました (status: ${response.status})`)
  }

  return response.json() as Promise<ValuationSummary[]>
}
