// PHP API (api/valuations.php) へ商品評価を送信・取得する

export type ValuationScore = 'poor' | 'like' | 'love'

/** 評価の選択肢（イマイチ/好き/大好き）。フォームの単一選択に使う。 */
export const VALUATION_SCORE_OPTIONS: { value: ValuationScore; label: string }[] = [
  { value: 'poor', label: 'イマイチ' },
  { value: 'like', label: '好き' },
  { value: 'love', label: '大好き' },
]

/** 購入場所の種別 */
export type PurchaseType = 'store' | 'vending' | 'online' | 'other'

export const PURCHASE_TYPE_OPTIONS: { value: PurchaseType; label: string }[] = [
  { value: 'store', label: '店舗' },
  { value: 'vending', label: '自販機' },
  { value: 'online', label: 'ネット・通販' },
  { value: 'other', label: 'その他' },
]

export const PURCHASE_TYPE_LABELS: Record<PurchaseType, string> = {
  store: '店舗',
  vending: '自販機',
  online: 'ネット・通販',
  other: 'その他',
}

// 購入場所の各入力欄の最大文字数（api/valuations.php の定数と合わせる）
export const PURCHASE_STORE_MAX_LENGTH = 50
export const PURCHASE_BRANCH_MAX_LENGTH = 50
export const PURCHASE_URL_MAX_LENGTH = 500
export const PURCHASE_DETAIL_MAX_LENGTH = 100
export const PURCHASE_REGION_MAX_LENGTH = 100

export interface ValuationPayload {
  userId: string
  productId: number
  score: ValuationScore
  comment: string
  purchasePrice?: string
  /** 購入地域（任意。◯◯県〇〇市〇〇区） */
  purchaseRegion?: string
  /** 購入場所の種別。未指定なら購入場所なし */
  purchaseType?: PurchaseType
  /** 店名（店舗・ネット・通販） */
  purchaseStore?: string
  /** 支店名（店舗） */
  purchaseBranch?: string
  /** URL（ネット・通販） */
  purchaseUrl?: string
  /** その他の内容 */
  purchaseDetail?: string
}

export interface ValuationSubmitResult {
  id: number
  productId: number
  score: ValuationScore
  /** 'created': 新規投稿 / 'updated': 既存評価の修正（同じ商品への2回目以降の投稿） */
  action: 'created' | 'updated'
}

export interface ValuationSummary {
  id: number
  productId: number
  productName: string
  productPhoto: string | null
  /** 投稿者の公開用ID（ユーザーページ /user/[userID] のURLに使う） */
  userId: string
  /** 投稿者の表示名（未設定の場合は null） */
  userDisplayName: string | null
  score: ValuationScore
  scoreLabel: string
  comment: string
  purchasePrice: string | null
  purchaseRegion: string | null
  purchaseType: PurchaseType | null
  purchaseStore: string | null
  purchaseBranch: string | null
  purchaseUrl: string | null
  purchaseDetail: string | null
  createdAt: string
  /** 評価を修正した日時。未修正の場合は null */
  updatedAt: string | null
}

/** 評価に購入場所があるか（種別が未設定の評価は購入場所なしとして扱う） */
export function hasPurchasePlace(valuation: Pick<ValuationSummary, 'purchaseType' | 'purchaseRegion'>): boolean {
  return valuation.purchaseType !== null || Boolean(valuation.purchaseRegion)
}

export type RankingPeriod = 'weekly' | 'monthly' | 'quarterly'

export interface ProductRanking {
  rank: number
  productId: number
  productName: string
  productPhoto: string | null
  valuationCount: number
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
  if (payload.purchaseRegion) {
    formData.append('purchaseRegion', payload.purchaseRegion)
  }
  if (payload.purchaseType) {
    formData.append('purchaseType', payload.purchaseType)
  }
  if (payload.purchaseStore) {
    formData.append('purchaseStore', payload.purchaseStore)
  }
  if (payload.purchaseBranch) {
    formData.append('purchaseBranch', payload.purchaseBranch)
  }
  if (payload.purchaseUrl) {
    formData.append('purchaseUrl', payload.purchaseUrl)
  }
  if (payload.purchaseDetail) {
    formData.append('purchaseDetail', payload.purchaseDetail)
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
 * 指定した期間（週間/月間/四半期）に投稿された評価数の多い順に商品を最大5件取得する
 * （トップページの「注目の商品」ランキング用）。
 */
export async function fetchProductRanking(period: RankingPeriod, categoryIds: string[] = []): Promise<ProductRanking[]> {
  const params = new URLSearchParams({ ranking: period })
  if (categoryIds.length > 0) {
    params.set('categoryIds', categoryIds.join(','))
  }

  const response = await fetch(`${API_BASE_URL}/valuations.php?${params.toString()}`, {
    method: 'GET',
    mode: 'cors',
    cache: 'default',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`ランキングの取得に失敗しました (status: ${response.status})`)
  }

  return response.json() as Promise<ProductRanking[]>
}

/**
 * 最近投稿された評価を新しい順に最大5件取得する（「最近追加」の評価タブ用）。
 * categoryIds を渡すと、そのカテゴリー群に属する商品への評価に絞り込む。
 */
export function fetchRecentValuations(categoryIds: string[] = []): Promise<ValuationSummary[]> {
  return fetchValuations({ recent: true, categoryIds })
}

/**
 * 指定したユーザーが投稿した評価一覧を取得する（マイページの商品評価タブ用）。
 */
export function fetchValuationsByUser(userId: string): Promise<ValuationSummary[]> {
  return fetchValuations({ userId })
}

/**
 * 公開用IDのユーザーが投稿した評価一覧を取得する（誰でも見られるユーザーページ用）。
 */
export function fetchValuationsByPublicId(publicId: string): Promise<ValuationSummary[]> {
  return fetchValuations({ publicId })
}

/**
 * 指定した商品に投稿された評価一覧を取得する（製品ページ用）。
 */
export function fetchValuationsByProduct(productId: string): Promise<ValuationSummary[]> {
  return fetchValuations({ productId })
}

async function fetchValuations(query: {
  userId?: string
  publicId?: string
  productId?: string
  recent?: boolean
  categoryIds?: string[]
}): Promise<ValuationSummary[]> {
  const params = new URLSearchParams()
  if (query.recent) {
    params.set('recent', '1')
  }
  if (query.categoryIds && query.categoryIds.length > 0) {
    params.set('categoryIds', query.categoryIds.join(','))
  }
  if (query.userId) {
    params.set('userId', query.userId)
  }
  if (query.publicId) {
    params.set('publicId', query.publicId)
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

/**
 * 指定したIDの評価を削除する（製品ページの「削除」リンク用）。
 * 投稿者本人のみ削除できる（userIdをサーバー側で照合する）。
 */
export async function deleteValuation(id: number, userId: string): Promise<void> {
  const params = new URLSearchParams({ id: String(id), userId })

  const response = await fetch(`${API_BASE_URL}/valuations.php?${params.toString()}`, {
    method: 'DELETE',
    mode: 'cors',
    credentials: 'include',
  })

  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null)
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : `評価の削除に失敗しました (status: ${response.status})`
    throw new Error(message)
  }
}
