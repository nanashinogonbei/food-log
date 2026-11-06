import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useBodyId } from '../components/useBodyId.ts'
import { usePublicUserValuations } from '../valuation/useValuations.ts'
import { formatJapaneseDate } from '../valuation/format.ts'
import { fetchPublicUserProfile } from './data.ts'
import type { UserProfile } from './data.ts'
import NotFoundPage from '../NotFoundPage.tsx'

const PAGE_SIZE = 10

/** ユーザーページ (/user/[userID]): そのユーザーが評価した商品の一覧を、誰でも見られる */
function UserValuationPage() {
  useBodyId('MYPAGE')
  const { userId: publicId } = useParams<{ userId: string }>()
  const { valuations, isLoading, error } = usePublicUserValuations(publicId)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // undefined: 取得中 / null: 該当ユーザーなし
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    if (!publicId) {
      return
    }

    let isMounted = true

    fetchPublicUserProfile(publicId)
      .then((data) => {
        if (isMounted) {
          setProfile(data)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setProfileError(err instanceof Error ? err.message : 'ユーザー情報の取得に失敗しました')
        }
      })

    return () => {
      isMounted = false
    }
  }, [publicId])

  if (profile === null) {
    return <NotFoundPage />
  }

  const userName = profile?.displayName || 'ユーザー'
  const visibleValuations = valuations.slice(0, visibleCount)
  const hasMore = visibleCount < valuations.length

  return (
    <div id="l-content">
      <div id="l-breadcrumb">
        <Link to="/">HOME</Link> &gt;{' '}
        {userName}さんの評価一覧
      </div>

      <h1 className="heading -typeA">{userName}さんの評価一覧</h1>

      <section className="product-content">
        <h2 className="heading -typeB">
          投稿した評価
          {!isLoading && !error && <span className="count">（全{valuations.length}件）</span>}
        </h2>
        {isLoading && <p>読み込み中...</p>}
        {(error || profileError) && <p>{error ?? profileError}</p>}
        {!isLoading && !error && valuations.length === 0 && <p>まだ評価が投稿されていません。</p>}

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
            </li>
          ))}
        </ul>

        {hasMore && (
          <p>
            <button type="button" className="elem-button -typeA" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
              もっと見る
            </button>
          </p>
        )}
      </section>
    </div>
  )
}

export default UserValuationPage
