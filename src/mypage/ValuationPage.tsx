import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { deleteValuation } from '../valuation/data.ts'
import { useUserValuations } from '../valuation/useValuations.ts'
import { formatJapaneseDate } from '../valuation/format.ts'

const PAGE_SIZE = 10

/** マイページの商品評価タブ: ログインユーザー自身が投稿した評価の一覧を表示する */
function ValuationPage() {
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
    <div className="page">
      <h1 className="page__title">商品評価</h1>

      <button type="button" onClick={handlePostClick}>
        商品を評価する
      </button>

      <h2>
        投稿した評価
        {!isLoading && !error && <span className="page__count">（全{valuations.length}件）</span>}
      </h2>
      {isLoading && <p>読み込み中...</p>}
      {error && <p>{error}</p>}
      {!isLoading && !error && valuations.length === 0 && <p>まだ評価を投稿していません。</p>}

      <ul className="valuation-list">
        {visibleValuations.map((valuation) => (
          <li key={valuation.id} className="valuation-list__item">
            <p className="valuation-list__product">
              <Link to={`/product/${valuation.productId}`}>
                {valuation.productPhoto && (
                  <img src={`http://production-null.work/food-log${valuation.productPhoto}`} alt={valuation.productName} />
                )}
                {valuation.productName}
              </Link>
            </p>
            <p className="valuation-list__date">
              投稿日: {formatJapaneseDate(valuation.createdAt)}
              {valuation.updatedAt && <>（更新日: {formatJapaneseDate(valuation.updatedAt)}）</>}
            </p>
            <p className="valuation-list__score">{valuation.scoreLabel}</p>
            <p className="valuation-list__comment">{valuation.comment}</p>
            {(valuation.purchasePrice || valuation.purchaseStore) && (
              <p className="valuation-list__purchase">
                {valuation.purchasePrice && <>購入金額: {valuation.purchasePrice}円 </>}
                {valuation.purchaseStore && <>購入店舗: {valuation.purchaseStore}</>}
              </p>
            )}
            {user && valuation.userId === user.id && (
              <p className="valuation-list__actions">
                <Link to={`/${user.id}/valuation/post?productId=${valuation.productId}`}>編集</Link>{' '}
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
          <button type="button" onClick={handleShowMoreClick}>
            もっと見る
          </button>
        </p>
      )}
    </div>
  )
}

export default ValuationPage
