// PHP API (api/admin-products-manage.php) へ商品情報の編集操作を送信する
//
// 「商品承認 管理」(productApproval.ts / api/admin-product-approval.php)が
// 申請中(pending)の商品を承認/却下するためのものなのに対し、こちらは
// 承認済み・却下済みの商品の情報を後から編集するためのもの。ステータスは変更しない。

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export interface ManagedProductPhoto {
  id: number
  url: string
}

export interface ManagedProductSummary {
  id: number
  name: string
  category1: string | null
  category2: string | null
  distributor: string
  manufacturing: string | null
  status: string
  createdAt: string
  photos: ManagedProductPhoto[]
}

export interface ManagedProductUpdatePayload {
  adminUserId: string
  productId: number
  name: string
  category1: string
  category2?: string
  distributor: string
  manufacturing?: string
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
 * ステータスが「申請中」以外の商品一覧を取得する（管理画面 /admin/product 用）。
 */
export async function fetchManagedProducts(adminUserId: string): Promise<ManagedProductSummary[]> {
  const params = new URLSearchParams({ adminUserId })

  const response = await fetch(`${API_BASE_URL}/admin-products-manage.php?${params.toString()}`, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-store',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, '商品一覧の取得に失敗しました'))
  }

  return (await response.json()) as ManagedProductSummary[]
}

/**
 * 商品情報を更新する（ステータスは変更しない）。
 */
export async function updateManagedProduct(payload: ManagedProductUpdatePayload): Promise<ManagedProductSummary> {
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

  const response = await fetch(`${API_BASE_URL}/admin-products-manage.php`, {
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

  return (await response.json()) as ManagedProductSummary
}

/**
 * 商品写真を1枚削除する（DBのレコードとアップロード済みファイルの両方）。
 */
export async function deleteManagedProductPhoto(adminUserId: string, photoId: number): Promise<void> {
  const params = new URLSearchParams({ adminUserId, photoId: String(photoId) })

  const response = await fetch(`${API_BASE_URL}/admin-products-manage.php?${params.toString()}`, {
    method: 'DELETE',
    mode: 'cors',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, '写真の削除に失敗しました'))
  }
}
