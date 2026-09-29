// PHP API (api/admin-product-approval.php) へ商品申請の管理操作を送信する

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export type AdminProductStatus = 'pending' | 'approved' | 'rejected'

export interface AdminProductPhoto {
  id: number
  url: string
}

export interface AdminProductSummary {
  id: number
  name: string
  category1: string | null
  category2: string | null
  distributor: string
  manufacturing: string | null
  status: string
  /** 申請者のClerk User ID */
  requestedBy: string
  createdAt: string
  photos: AdminProductPhoto[]
}

export interface AdminProductUpdatePayload {
  adminUserId: string
  productId: number
  name: string
  category1: string
  category2?: string
  distributor: string
  manufacturing?: string
  status: AdminProductStatus
}

/**
 * レスポンスがエラーの場合、JSONの error フィールドからメッセージを取り出す。
 */
async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  const data: unknown = await response.json().catch(() => null)
  if (data && typeof data === 'object' && 'error' in data) {
    return String((data as { error: unknown }).error)
  }
  return `${fallback} (status: ${response.status})`
}

/**
 * すべてのステータスの商品申請一覧を取得する（管理画面 /admin/product 用）。
 */
export async function fetchAdminProducts(adminUserId: string): Promise<AdminProductSummary[]> {
  const params = new URLSearchParams({ adminUserId })

  const response = await fetch(`${API_BASE_URL}/admin-product-approval.php?${params.toString()}`, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-store',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, '商品申請一覧の取得に失敗しました'))
  }

  return (await response.json()) as AdminProductSummary[]
}

/**
 * 商品情報とステータスを更新する。
 * ステータスが承認/却下に変わった場合、サーバー側で申請者への完了メールが送信される。
 */
export async function updateAdminProduct(payload: AdminProductUpdatePayload): Promise<AdminProductSummary> {
  const body = new URLSearchParams()
  body.set('adminUserId', payload.adminUserId)
  body.set('productId', String(payload.productId))
  body.set('name', payload.name)
  body.set('category1', payload.category1)
  if (payload.category2) {
    body.set('category2', payload.category2)
  }
  body.set('distributor', payload.distributor)
  if (payload.manufacturing) {
    body.set('manufacturing', payload.manufacturing)
  }
  body.set('status', payload.status)

  const response = await fetch(`${API_BASE_URL}/admin-product-approval.php`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, '商品の更新に失敗しました'))
  }

  return (await response.json()) as AdminProductSummary
}

/**
 * 不適切な商品写真を1枚削除する（DBのレコードとアップロード済みファイルの両方）。
 * 商品自体やステータスには影響しない。
 */
export async function deleteAdminProductPhoto(adminUserId: string, photoId: number): Promise<void> {
  const params = new URLSearchParams({ adminUserId, photoId: String(photoId) })

  const response = await fetch(`${API_BASE_URL}/admin-product-approval.php?${params.toString()}`, {
    method: 'DELETE',
    mode: 'cors',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, '写真の削除に失敗しました'))
  }
}
