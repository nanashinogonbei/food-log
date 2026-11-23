// PHP API (api/product-photo-requests.php) へ商品画像の申請を送信する

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** アップロード済みの画像（/uploads/...）を表示するときのURLの前に付ける */
export const PHOTO_BASE_URL = 'http://production-null.work/food-log'

/** 1回の申請で送れる画像の最大枚数（api/product-photo-requests.php の MAX_PHOTOS_PER_REQUEST と合わせる） */
export const PHOTO_REQUEST_MAX_COUNT = 10

export interface ProductPhotoRequestPayload {
  /** ClerkのユーザーID */
  userId: string
  productId: number
  /** 送信順がそのまま優先順位になる */
  photos: File[]
}

/**
 * 商品画像の申請を送信する。画像は管理者が承認するまで商品ページには表示されない。
 */
export async function submitProductPhotoRequest(payload: ProductPhotoRequestPayload): Promise<void> {
  const formData = new FormData()
  formData.append('userId', payload.userId)
  formData.append('productId', String(payload.productId))
  payload.photos.forEach((photo) => {
    formData.append('photo[]', photo)
  })

  const response = await fetch(`${API_BASE_URL}/product-photo-requests.php`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
    body: formData,
  })

  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null)
    throw new Error(
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : `画像の申請に失敗しました (status: ${response.status})`,
    )
  }
}
