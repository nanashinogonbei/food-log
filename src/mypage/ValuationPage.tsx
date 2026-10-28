import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { deleteValuation } from '../valuation/data.ts'
import { useUserValuations } from '../valuation/useValuations.ts'
import { formatJapaneseDate } from '../valuation/format.ts'
import { useBodyId } from '../components/useBodyId.ts'

const PAGE_SIZE = 10

/** マイページの商品評価タブ: ログインユーザー自身が投稿した評価の一覧を表示する */
function ValuationPage() {
  useBodyId('MYPAGE')
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { user } = useUser()
  const { valuations, isLoading, error, reload: reloadValuations } = useUserValuations(userId)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const visibleValuations = valuations.slice(0, visibleCount)
  const hasMore = visibleCount < valuations.length

  const handlePostClick = () => {
    navigate(`/${userId}/valuation/post`)
  }

  const handleEditClick = (productId: number) => {
    navigate(`/${userId}/valuation/post?productId=${productId}`)
  }

  const handleShowMoreClick = () => {
    setVisibleCount((count) => count + PAGE_SIZE)
  }

  const handleDeleteClick = async (valuationId: number) => {
    if (!userId) {
      return
    }
    if (!window.confirm('この評価を削除しますか？')) {
      return
    }
    try {
      await deleteValuation(valuationId, userId)
      reloadValuations()
    } catch (err) {
      alert(err instanceof Error ? err.message : '評価の削除に失敗しました')
    }
  }

  return (
    <div id="l-content">
      <div id="l-breadcrumb">
        <Link to="/">HOME</Link> &gt;{' '}
        <Link to={`/${userId}`}>マイページ</Link> &gt;{' '}
        商品評価
      </div>

      <h1 className="heading -typeA">商品評価</h1>
      <button type="button" className="elem-button -typeA" onClick={handlePostClick}>商品を評価する</button>


			<section className="product-content">
			
				<h2 className="heading -typeB">
					投稿した評価
					{!isLoading && !error && <span className="count">（全{valuations.length}件）</span>}
				</h2>
				{isLoading && <p>読み込み中...</p>}
				{error && <p>{error}</p>}
				{!isLoading && !error && valuations.length === 0 && <p>まだ評価を投稿していません。</p>}

				<ul className="product-listValuation">
					{visibleValuations.map((valuation) => (
						<li key={valuation.id} className="item">
							<figure className="elem-img">
								{valuation.productPhoto && (
									<img src={`http://production-null.work/food-log${valuation.productPhoto}`} alt={valuation.productName} />
								)}
							</figure>
							<p className="elem-name"><Link to={`/product/${valuation.productId}`} className="elem-link -typeA">{valuation.productName}</Link></p>
							<p className="elem-date">
								投稿日: {formatJapaneseDate(valuation.createdAt)}
								{valuation.updatedAt && <>（更新日: {formatJapaneseDate(valuation.updatedAt)}）</>}
							</p>
							{valuation.purchasePrice && <p className="elem-price">購入金額: {valuation.purchasePrice}円</p>}
							{valuation.purchaseStore && <p className="elem-store">購入店舗: {valuation.purchaseStore}</p>}
							<p className="elem-score">{valuation.scoreLabel}</p>
							<p className="elem-comment">{valuation.comment}</p>
							{user && valuation.userId === user.id && (
								<p className="elem-actions">
									<button type="button" onClick={() => handleEditClick(valuation.productId)}>
										編集
									</button>{' '}
									<button type="button" onClick={() => handleDeleteClick(valuation.id)}>
										削除
									</button>
								</p>
							)}
						</li>
					))}
				</ul>

				{hasMore && (
					<p>
						<button type="button" className="elem-button -typeA" onClick={handleShowMoreClick}>
							もっと見る
						</button>
					</p>
				)}
			
			</section>
			
    </div>
  )
}

export default ValuationPage
