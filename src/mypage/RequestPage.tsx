import { useNavigate, useParams } from 'react-router-dom'
import { useUserProducts } from '../product/useProducts.ts'

// 承認待ち/却下のみバッジ表示する（承認済み(approved)は通常表示のため対象外）
const STATUS_LABELS: Record<string, string> = {
  pending: '申請中',
  rejected: '却下',
}

/** マイページの商品申請タブ: ログインユーザー自身が申請した商品の一覧を表示する */
function RequestPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { products, isLoading, error } = useUserProducts(userId)

  const handlePostClick = () => {
    navigate(`/${userId}/request/post`)
  }

  return (
    <div className="page">
      <h1 className="page__title">商品申請</h1>

      <button type="button" onClick={handlePostClick}>
        商品を申請する
      </button>

      <h2>申請した商品</h2>
      {isLoading && <p>読み込み中...</p>}
      {error && <p>{error}</p>}
      {!isLoading && !error && products.length === 0 && <p>まだ商品を申請していません。</p>}

      <ul className="product-list">
        {products.map((product) => {
          const statusLabel = STATUS_LABELS[product.status]

          return (
            <li key={product.id} className="product-list__item">
              {product.photos[0] && (
                <img src={`http://production-null.work/food-log${product.photos[0]}`} alt={product.name} />
              )}
              <div className="product-list__body">
                <p className="product-list__name">
                  {product.name}
                  {statusLabel && (
                    <span className={`product-list__status product-list__status--${product.status}`}>
                      {statusLabel}
                    </span>
                  )}
                </p>
                <p className="product-list__distributor">販売会社: {product.distributor}</p>
                {product.manufacturing && (
                  <p className="product-list__manufacturing">製造会社: {product.manufacturing}</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default RequestPage
