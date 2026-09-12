// PHP API (api/products.php) へ商品申請を送信する

export interface ProductRequestPayload {
  userId: string
  name: string
  category1: string
  category2?: string
  distributor: string
  manufacturing?: string
  photos: File[]
}

export interface ProductRequestResult {
  id: number
  status: string
  photos: string[]
}

export interface ProductSummary {
  id: number
  name: string
  category1: string | null
  category2: string | null
  distributor: string
  manufacturing: string | null
  status: string
  createdAt: string
  photos: string[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/**
 * 指定したカテゴリーID群のいずれかに属する商品一覧をAPI(api/products.php)から取得する。
 * カテゴリーページの「すべて」タブでは、自身のIDと子カテゴリーのIDをまとめて渡す。
 */
export async function fetchProductsByCategoryIds(categoryIds: string[]): Promise<ProductSummary[]> {
  if (categoryIds.length === 0) {
    return []
  }

  const params = new URLSearchParams({ categoryIds: categoryIds.join(',') })

  const response = await fetch(`${API_BASE_URL}/products.php?${params.toString()}`, {
    method: 'GET',
    mode: 'cors',
    cache: 'default',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`商品一覧の取得に失敗しました (status: ${response.status})`)
  }

  return response.json() as Promise<ProductSummary[]>
}

/**
 * 商品名の部分一致で商品を検索する（商品評価ページのオートコンプリート用）。
 */
export async function searchProductsByName(name: string): Promise<ProductSummary[]> {
  const trimmed = name.trim()

  if (trimmed === '') {
    return []
  }

  const params = new URLSearchParams({ name: trimmed })

  const response = await fetch(`${API_BASE_URL}/products.php?${params.toString()}`, {
    method: 'GET',
    mode: 'cors',
    cache: 'default',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`商品の検索に失敗しました (status: ${response.status})`)
  }

  return response.json() as Promise<ProductSummary[]>
}

/**
 * 指定したIDの商品を1件取得する（製品ページ、商品評価ページの事前選択用）。
 * 存在しない場合は null を返す。
 */
export async function fetchProductById(id: string): Promise<ProductSummary | null> {
  if (id.trim() === '') {
    return null
  }

  const params = new URLSearchParams({ id })

  const response = await fetch(`${API_BASE_URL}/products.php?${params.toString()}`, {
    method: 'GET',
    mode: 'cors',
    cache: 'default',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`商品の取得に失敗しました (status: ${response.status})`)
  }

  return response.json() as Promise<ProductSummary | null>
}

/**
 * 商品申請フォームの内容をAPI(api/products.php)に送信する。
 * 商品写真は複数枚まとめて multipart/form-data で送る。
 */
export async function submitProductRequest(payload: ProductRequestPayload): Promise<ProductRequestResult> {
  const formData = new FormData()
  formData.append('userId', payload.userId)
  formData.append('name', payload.name)
  formData.append('category1', payload.category1)
  if (payload.category2) {
    formData.append('category2', payload.category2)
  }
  formData.append('distributor', payload.distributor)
  if (payload.manufacturing) {
    formData.append('manufacturing', payload.manufacturing)
  }
  payload.photos.forEach((photo) => {
    formData.append('photo[]', photo)
  })

  const response = await fetch(`${API_BASE_URL}/products.php`, {
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
        : `商品申請に失敗しました (status: ${response.status})`
    throw new Error(message)
  }

  return data as ProductRequestResult
}
