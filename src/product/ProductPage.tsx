import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react'
import { useProduct } from './useProducts.ts'
import { useProductValuations } from '../valuation/useValuations.ts'
import { deleteValuation } from '../valuation/data.ts'
import { formatJapaneseDate } from '../valuation/format.ts'
import { useCategories } from '../category/useCategories.ts'
import { getCategoryPath } from '../category/data.ts'

type ValuationTab = 'positive' | 'negative'

function ProductPage() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const { user } = useUser()
  const { product, isLoading, error } = useProduct(productId)
  const { categories } = useCategories()
  const {
    valuations,
    isLoading: isValuationsLoading,
    error: valuationsError,
    reload: reloadValuations,
  } = useProductValuations(productId)

  // 大きい画像に表示中のサムネイルのインデックス（サムネイルにマウスオーバー/フォーカス/クリックで切り替え）
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)

  useEffect(() => {
    setActivePhotoIndex(0)
  }, [product?.id])

  // ログインユーザーが既にこの商品を評価済みかどうか（評価済みなら投稿ボタンを隠す）
  const hasEvaluated = user ? valuations.some((valuation) => valuation.userId === user.id) : false

  // 「好き・大好き」＝ポジティブ、「イマイチ」＝ネガティブでタブ表示を分ける（デフォルトはポジティブ）
  const [valuationTab, setValuationTab] = useState<ValuationTab>('positive')
  const positiveValuations = valuations.filter((valuation) => valuation.score !== 'poor')
  const negativeValuations = valuations.filter((valuation) => valuation.score === 'poor')
  const visibleValuations = valuationTab === 'positive' ? positiveValuations : negativeValuations

  const handleEvaluateClick = () => {
    if (!user || !product) {
      return
    }
    navigate(`/${user.id}/valuation/post?productId=${product.id}`)
  }

  const handleDeleteClick = async (valuationId: number) => {
    if (!user) {
      return
    }
    if (!window.confirm('この評価を削除しますか？')) {
      return
    }
    try {
      await deleteValuation(valuationId, user.id)
      reloadValuations()
    } catch (err) {
      alert(err instanceof Error ? err.message : '評価の削除に失敗しました')
    }
  }

  if (isLoading) {
    return (
      <div className="page">
        <p>読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <p>{error}</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="page">
        <h1 className="page__title">商品が見つかりません</h1>
        <p>
          <Link to="/">トップページに戻る</Link>
        </p>
      </div>
    )
  }

  const categoryPaths = [product.category1, product.category2]
    .map((categorySlug) => getCategoryPath(categories, categorySlug))
    .filter((path) => path.length > 0)

  const purchasePrices = valuations
    .map((valuation) => (valuation.purchasePrice ? Number(valuation.purchasePrice) : NaN))
    .filter((price) => Number.isFinite(price))
  const priceRange =
    purchasePrices.length > 0
      ? { min: Math.min(...purchasePrices), max: Math.max(...purchasePrices) }
      : null

  return (
    <div className="page product-page">

		<section className="section-product">
			{product.photos.length > 0 && (
				<div className="product-page__photos">
					<figure className="product-page__photo-main">
					  <img
						src={`http://production-null.work/food-log${product.photos[activePhotoIndex] ?? product.photos[0]}`}
						alt={product.name}
					  />
					</figure>

					{product.photos.length > 1 && (
					  <div className="product-page__photo-thumbs">
						{product.photos.map((photo, index) => (
						  <Link
							key={photo}
							className={`product-page__photo-thumb${
							  index === activePhotoIndex ? ' product-page__photo-thumb--active' : ''
							}`}
							onMouseEnter={() => setActivePhotoIndex(index)}
							onFocus={() => setActivePhotoIndex(index)}
							onClick={() => setActivePhotoIndex(index)}
							aria-label={`${index + 1}枚目の画像を表示`}
						  >
							<img src={`http://production-null.work/food-log${photo}`} alt="" />
						  </Link>
						))}
					  </div>
					)}
				</div>
			)}

			<div className="product-page__meta">
				{categoryPaths.length > 0 && (
					<nav className="product-page__breadcrumb" aria-label="カテゴリー">
						{categoryPaths.map((path) => (
							<p key={path[path.length - 1].slug}>{path.map((category) => category.name).join(' > ')}</p>
						))}
					</nav>
				)}
				<h1 className="page__title">{product.name}</h1>
				{priceRange && (
					<p className="product-page__price-range">
						{priceRange.min}円～{priceRange.max}円
					</p>
				)}
				<h2>販売会社</h2>
				<div>{product.distributor}</div>
				{product.manufacturing && (
				  <>
					<h2>製造会社</h2>
					<div>{product.manufacturing}</div>
				  </>
				)}
			</div>
		</section>

		<div class="stack-valuation">
		  {!hasEvaluated && (
			<SignedIn>
			  <button type="button" onClick={handleEvaluateClick}>
				この製品を評価する
			  </button>
			</SignedIn>
		  )}
		  <SignedOut>
			<p>
			  <a href="/login.html">ログイン</a>すると、この製品を評価できます。
			</p>
		  </SignedOut>
		</div>

      <h2>みんなの評価</h2>
      {isValuationsLoading && <p>読み込み中...</p>}
      {valuationsError && <p>{valuationsError}</p>}
      {!isValuationsLoading && (
        <div className="valuation-tabs" role="tablist">
          <div
            role="tab"
            tabIndex={0}
            aria-selected={valuationTab === 'positive'}
            className={`valuation-tabs__tab${valuationTab === 'positive' ? ' valuation-tabs__tab--active' : ''}`}
            onClick={() => setValuationTab('positive')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setValuationTab('positive')
              }
            }}
          >
            ポジティブ評価（{positiveValuations.length}）
          </div>
          <div
            role="tab"
            tabIndex={0}
            aria-selected={valuationTab === 'negative'}
            className={`valuation-tabs__tab${valuationTab === 'negative' ? ' valuation-tabs__tab--active' : ''}`}
            onClick={() => setValuationTab('negative')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setValuationTab('negative')
              }
            }}
          >
            ネガティブ評価（{negativeValuations.length}）
          </div>
        </div>
      )}
      {!isValuationsLoading && valuations.length === 0 && <p>まだ評価がありません。</p>}
      {!isValuationsLoading && valuations.length > 0 && visibleValuations.length === 0 && (
        <p>該当する評価はまだありません。</p>
      )}
      <ul className="valuation-list">
        {visibleValuations.map((valuation) => (
          <li key={valuation.id} className="valuation-list__item">
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
    </div>
  )
}

export default ProductPage
