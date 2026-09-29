import { useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useCategories } from '../category/useCategories.ts'
import AdminProductManageItem from './AdminProductManageItem.tsx'
import { fetchManagedProducts } from './productManage.ts'
import type { ManagedProductSummary } from './productManage.ts'

/**
 * 商品 管理ページ (/admin/product)
 * 承認済み・却下済みの商品（申請中は含まない）の情報を編集するためのページ。
 * 「商品承認 管理」(/admin/product-approval)とは異なり、ステータスの変更や
 * 完了メールの送信は行わない。商品名・カテゴリー・会社名の編集と、写真の削除ができる。
 */
function AdminProductManagePage() {
  const { user } = useUser()
  const adminUserId = user?.id
  const { categories, isLoading: categoriesLoading } = useCategories()

  const [products, setProducts] = useState<ManagedProductSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadCount, setReloadCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!adminUserId) {
      return
    }

    let isMounted = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setError(null)

    fetchManagedProducts(adminUserId)
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
  }, [adminUserId, reloadCount])

  const reload = () => setReloadCount((count) => count + 1)

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredProducts =
    normalizedQuery === ''
      ? products
      : products.filter((product) => product.name.toLowerCase().includes(normalizedQuery))

  return (
    <div className="page">
      <h1 className="page__title">商品 管理</h1>

      <div className="admin-product-search">
        <label htmlFor="admin-product-search-input">商品名で検索</label>
        <br />
        <input
          id="admin-product-search-input"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="商品名を入力"
        />
      </div>

      {isLoading && <p>読み込み中...</p>}
      {error && <p>{error}</p>}
      {!isLoading && !error && (
        <>
          <p>全{filteredProducts.length}件</p>
          {products.length === 0 && <p>商品はまだありません。</p>}
          {products.length > 0 && filteredProducts.length === 0 && <p>該当する商品が見つかりませんでした。</p>}

          <ul className="admin-product-list">
            {filteredProducts.map((product) => (
              <AdminProductManageItem
                key={product.id}
                product={product}
                categories={categories}
                categoriesLoading={categoriesLoading}
                adminUserId={adminUserId ?? ''}
                onUpdated={reload}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default AdminProductManagePage
