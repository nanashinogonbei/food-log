// PHP API (api/categories.php) から取得するカテゴリーのレコード
export interface CategoryRecord {
  id: number
  slug: string
  label: string
  order: number
  parentSlug: string | null
}

//const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const API_BASE_URL = 'https://production-null.work/food-log/api'

let cachedCategories: CategoryRecord[] | null = null
let inFlightRequest: Promise<CategoryRecord[]> | null = null

/**
 * カテゴリー一覧をAPI(api/categories.php)から取得する。
 * 同じセッション内では結果をキャッシュし、重複リクエストをまとめる。
 */
export function fetchCategories(): Promise<CategoryRecord[]> {
  if (cachedCategories) {
    return Promise.resolve(cachedCategories)
  }

  if (!inFlightRequest) {
	inFlightRequest = fetch(`${API_BASE_URL}/categories.php`, {
	  method: 'GET',
	  mode: 'cors',
	  cache: 'default',
	  credentials: 'include',
	})
      .then((response) => {
        if (!response.ok) {
          throw new Error(`カテゴリー取得に失敗しました (status: ${response.status})`)
        }
        return response.json() as Promise<CategoryRecord[]>
      })
      .then((categories) => {
        cachedCategories = categories
        return categories
      })
      .finally(() => {
        inFlightRequest = null
      })
  }

  return inFlightRequest
}

/** 大カテゴリー(親を持たない)のみを取り出す */
export function getMainCategories(categories: CategoryRecord[]): CategoryRecord[] {
  return categories.filter((category) => category.parentSlug === null)
}

/** 指定した大カテゴリーの slug に紐づく小カテゴリーを取り出す */
export function getSubCategories(categories: CategoryRecord[], parentSlug: string): CategoryRecord[] {
  return categories.filter((category) => category.parentSlug === parentSlug)
}

/** slug からカテゴリー(大小どちらも)を1件取得する */
export function findCategoryBySlug(categories: CategoryRecord[], slug: string | undefined): CategoryRecord | undefined {
  return categories.find((category) => category.slug === slug)
}

/** label から大カテゴリーを1件取得する(URLに大カテゴリー名を使うため) */
export function findMainCategoryByLabel(categories: CategoryRecord[], label: string | undefined): CategoryRecord | undefined {
  return categories.find((category) => category.parentSlug === null && category.label === label)
}

/** 指定した親(slug)配下で、label が一致する小カテゴリーを1件取得する */
export function findSubCategoryByLabel(
  categories: CategoryRecord[],
  parentSlug: string | undefined,
  label: string | undefined,
): CategoryRecord | undefined {
  return categories.find((category) => category.parentSlug === parentSlug && category.label === label)
}
