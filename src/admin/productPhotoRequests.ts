// PHP API (api/admin-product-photos.php) へ商品画像の申請の管理操作を送信する

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** 承認待ちの画像申請1件 */
export interface AdminPhotoRequest {
  id: number
  productId: number
  productName: string
  /** 画像のパス（アップロード先のURLの前に付けて表示する） */
  url: string
  /** 申請者の公開用ID */
  requestedBy: string
  /** 申請（投稿）日時 */
  createdAt: string
}

export type PhotoRequestAction = 'approve' | 'reject'

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  const data: unknown = await response.json().catch(() => null)
  if (data && typeof data === 'object' && 'error' in data) {
    return String((data as { error: unknown }).error)
  }
  return `${fallback} (status: ${response.status})`
}

/** 承認待ちの画像申請の一覧を取得する（管理画面 /admin/image 用）。 */
export async function fetchAdminPhotoRequests(adminUserId: string): Promise<AdminPhotoRequest[]> {
  const params = new URLSearchParams({ adminUserId })

  const response = await fetch(`${API_BASE_URL}/admin-product-photos.php?${params.toString()}`, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-store',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, '画像申請一覧の取得に失敗しました'))
  }

  return (await response.json()) as AdminPhotoRequest[]
}

/** 画像申請を承認（商品ページに表示）または却下（画像を削除）する。 */
export async function reviewAdminPhotoRequest(
  adminUserId: string,
  requestId: number,
  action: PhotoRequestAction,
): Promise<void> {
  const body = new URLSearchParams({ adminUserId, requestId: String(requestId), action })

  const response = await fetch(`${API_BASE_URL}/admin-product-photos.php`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, action === 'approve' ? '承認に失敗しました' : '却下に失敗しました'),
    )
  }
}
