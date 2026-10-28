import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useCategories } from '../category/useCategories.ts'
import AdminProductApprovalItem from './AdminProductApprovalItem.tsx'
import { fetchAdminProducts } from './productApproval.ts'
import type { AdminProductSummary } from './productApproval.ts'
import { useBodyId } from '../components/useBodyId.ts'

/**
 * 商品承認 管理ページ (/admin/product-approval)
 * すべての商品申請を一覧表示し、内容の確認・編集、ステータス（申請中/承認済み/却下）の変更、
 * 不適切な写真を理由にした却下を行う。ステータスが承認/却下に変わると、
 * サーバー側で申請者への完了メールが送信される。
 */
function AdminProductApprovalPage() {
  useBodyId('ADMIN')
  const { user } = useUser()
  const adminUserId = user?.id
  const { categories, isLoading: categoriesLoading } = useCategories()

  const [products, setProducts] = useState<AdminProductSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    if (!adminUserId) {
      return
    }

    let isMounted = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setError(null)

    fetchAdminProducts(adminUserId)
      .then((data) => {
        if (isMounted) {
          setProducts(data)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : '商品申請一覧の取得に失敗しました')
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

  return (
    <div id="l-content">
      
			<div id="l-breadcrumb">
        <Link to="/">HOME</Link> &gt;{' '}
        <Link to="/admin">管理者ページ</Link> &gt;{' '}
        商品承認 管理
      </div>

      <h1 className="heading -typeA">商品承認 管理</h1>

      <section className="product-content">
        
				<h2 className="heading -typeB">
          商品申請一覧
          {!isLoading && !error && <span className="count">（全{products.length}件）</span>}
        </h2>
				
        {isLoading && <p>読み込み中...</p>}
        {error && <p>{error}</p>}
        {!isLoading && !error && products.length === 0 && <p>商品申請はまだありません。</p>}
        {!isLoading && !error && (
        <>
          <ul className="product-listApplication">
            {products.map((product) => (
              <AdminProductApprovalItem
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
				
      </section>
			
    </div>
  )
}

export default AdminProductApprovalPage
