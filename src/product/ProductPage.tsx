import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react'
import { useProduct } from './useProducts.ts'
import { useProductValuations } from '../valuation/useValuations.ts'
import { deleteValuation } from '../valuation/data.ts'
import { useReportedValuationIds } from '../report/useReportedValuationIds.ts'
import ValuationReportButton from './ValuationReportButton.tsx'
import { formatJapaneseDate } from '../valuation/format.ts'
import { useCategories } from '../category/useCategories.ts'
import { getCategoryPath } from '../category/data.ts'
import { useBodyId } from '../components/useBodyId.ts'
type ValuationTab = 'positive' | 'negative'

function ProductPage() {
  useBodyId('PRODUCT')
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
  // ログインユーザーが通報済みの評価（「通報済み」表示用）
  const { reportedIds, markReported } = useReportedValuationIds(user?.id)

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
      <div id="l-content">
        <h1 className="heading -typeA">商品が見つかりません</h1>
        <p><Link to="/" className="elem-link -typeA">トップページに戻る</Link></p>
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
    <div id="l-content">


			<section className="product-info">
				{product.photos.length > 0 && (
					<div className="cluster-img">
					
						<figure className="stack-imgMain">
							<img
							src={`http://production-null.work/food-log${product.photos[activePhotoIndex] ?? product.photos[0]}`}
							alt={product.name}
							/>
						</figure>

						{product.photos.length > 1 && (
							<div className="stack-imgThumb">
							{product.photos.map((photo, index) => (
								<Link
									key={photo}
									className={`item${index === activePhotoIndex ? ' -active' : ''}`}
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

				<div className="cluster-txt">
					<h1 className="heading -typeA">{product.name}</h1>
					
					{categoryPaths.length > 0 && (
						<div className="stack-catgory" aria-label="カテゴリー">
							{categoryPaths.map((path) => (
								<p className="elem-category" key={path[path.length - 1].slug}>{path.map((category) => category.name).join(' > ')}</p>
							))}
						</div>
					)}
					
					{priceRange && (
						<div className="stack-price">
							<h2 className="heading -typeD">価格帯</h2>
							<p className="elem-priceRange">
								{priceRange.min}円～{priceRange.max}円
							</p>
							<p className="elem-notes -typeA">※ユーザの投稿から算出</p>
						</div>
					)}
					
					<div className="stack-company">
						<div className="cluster-distributor">
							<h2 className="heading -typeD">販売会社</h2>
							<div>{product.distributor}</div>
						</div>					
						{product.manufacturing && (
							<div className="cluster-manufacturing">
								<h2 className="heading -typeD">製造会社</h2>
								<div>{product.manufacturing}</div>
							</div>
						)}
					</div>
					
				</div>
			</section>


		  {!hasEvaluated && (
				<SignedIn>
					<div class="stack-valuation">
						<button type="button" onClick={handleEvaluateClick}>この製品を評価する</button>
					</div>
				</SignedIn>
		  )}
		  <SignedOut>
				<div class="stack-valuation">
					<p><a href="/login.html" className="elem-link -typeA">ログイン</a>すると、この製品を評価できます。</p>
				</div>
		  </SignedOut>


			<section className="product-valuation">
			
				<h2 className="heading -typeC">みんなの評価</h2>
				{isValuationsLoading && <p>読み込み中...</p>}
				{valuationsError && <p>{valuationsError}</p>}
				{!isValuationsLoading && (
					<div className="stack-tabs" role="tablist">
						<a
							role="tab"
							tabIndex={0}
							aria-selected={valuationTab === 'positive'}
							className={`item${valuationTab === 'positive' ? ' -active' : ''}`}
							onClick={() => setValuationTab('positive')}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault()
									setValuationTab('positive')
								}
							}}
						>
							ポジティブ評価（{positiveValuations.length}）
						</a>
						<a
							role="tab"
							tabIndex={0}
							aria-selected={valuationTab === 'negative'}
							className={`item${valuationTab === 'negative' ? ' -active' : ''}`}
							onClick={() => setValuationTab('negative')}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault()
									setValuationTab('negative')
								}
							}}
						>
							ネガティブ評価（{negativeValuations.length}）
						</a>
					</div>
				)}
				
				{!isValuationsLoading && valuations.length === 0 && <p className="elem-noneTxt">まだ評価がありません。</p>}
				{!isValuationsLoading && valuations.length > 0 && visibleValuations.length === 0 && ( <p className="elem-noneTxt">該当する評価はまだありません。</p> )}
				
				<ul className="stack-listValuation">
					{visibleValuations.map((valuation) => (
						<li key={valuation.id} className="item">
							<div className="cluster-content">
								<p className="elem-date">
									投稿日: {formatJapaneseDate(valuation.createdAt)}
									{valuation.updatedAt && <>（更新日: {formatJapaneseDate(valuation.updatedAt)}）</>}
								</p>
								{(valuation.purchasePrice || valuation.purchaseStore) && (
									<p className="elem-purchase">
										{valuation.purchasePrice && <>購入金額: {valuation.purchasePrice}円　</>}
										{valuation.purchaseStore && <>購入店舗: {valuation.purchaseStore}</>}
									</p>
								)}
								<p className="elem-score">{valuation.scoreLabel}</p>
								<p className="elem-comment">{valuation.comment}</p>
							</div>
							<div className="cluster-action">
								{user && valuation.userId === user.id && (
									<p className="elem-actions">
										<Link to={`/${user.id}/valuation/post?productId=${valuation.productId}`}>編集</Link>{' '}
										<button type="button" onClick={() => handleDeleteClick(valuation.id)}>削除</button>
									</p>
								)}
								{user && valuation.userId !== user.id && (
									<p className="elem-actions">
										<ValuationReportButton
											valuationId={valuation.id}
											reporterUserId={user.id}
											isReported={reportedIds.has(valuation.id)}
											onReported={markReported}
										/>
									</p>
								)}
							</div>
						</li>
					))}
				</ul>
			</section>
			
			
    </div>
  )
}

export default ProductPage
