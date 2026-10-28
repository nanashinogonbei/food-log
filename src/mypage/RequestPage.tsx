import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useUserProducts } from '../product/useProducts.ts'
import { useBodyId } from '../components/useBodyId.ts'

// 承認待ち/却下のみバッジ表示する（承認済み(approved)は通常表示のため対象外）
const STATUS_LABELS: Record<string, string> = {
  pending: '申請中',
  rejected: '却下',
}

const PAGE_SIZE = 10

/** マイページの商品申請タブ: ログインユーザー自身が申請した商品の一覧を表示する */
function RequestPage() {
  useBodyId('MYPAGE')
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { products, isLoading, error } = useUserProducts(userId)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const visibleProducts = products.slice(0, visibleCount)
  const hasMore = visibleCount < products.length

  const handlePostClick = () => {
    navigate(`/${userId}/request/post`)
  }

  const handleShowMoreClick = () => {
    setVisibleCount((count) => count + PAGE_SIZE)
  }

  return (
	<div id="l-content">
		<div id="l-breadcrumb">
			<Link to="/">HOME</Link> &gt;{' '}
			<Link to={`/${userId}`}>マイページ</Link> &gt;{' '}
			商品申請
		</div>

		<h1 className="heading -typeA">商品申請</h1>
		<button type="button" className="elem-button -typeA" onClick={handlePostClick}>商品を申請する</button>

		<section className="product-content">
			<h2 className="heading -typeB">
				申請した商品
				{!isLoading && !error && <span className="count">（全{products.length}件）</span>}
			</h2>
			{isLoading && <p>読み込み中...</p>}
			{error && <p>{error}</p>}
			{!isLoading && !error && products.length === 0 && <p>まだ商品を申請していません。</p>}

			<ul className="list-request">
			{visibleProducts.map((product) => {
			  const statusLabel = STATUS_LABELS[product.status]

			  return (
				<li key={product.id} className={`item -${product.status}`}>
				  {product.photos[0] && (
					<figure><img src={`http://production-null.work/food-log${product.photos[0]}`} alt={product.name} /></figure>
				  )}
				  <div className="cluster-txt">
					<p className="name"><Link to={`/product/${product.id}`} className="elem-link -typeA">{product.name}</Link></p>
					<p className="distributor"><span className="label">販売会社</span>{product.distributor}</p>
						{product.manufacturing && (
					<p className="manufacturing"><span className="label">製造会社</span>{product.manufacturing}</p>
					)}
					{statusLabel && (
						<span className="status">{statusLabel}</span>
					)}
				  </div>
				</li>
			  )
			})}
			</ul>

			{hasMore && (
			<p>
			  <button type="button" onClick={handleShowMoreClick}>
				もっと見る
			  </button>
			</p>
			)}
		</section>
	</div>
  )
}

export default RequestPage
