import { Link, useNavigate, useParams } from 'react-router-dom'
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react'
import { useProduct } from './useProducts.ts'
import { useProductValuations } from '../valuation/useValuations.ts'

function ProductPage() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const { user } = useUser()
  const { product, isLoading, error } = useProduct(productId)
  const {
    valuations,
    isLoading: isValuationsLoading,
    error: valuationsError,
  } = useProductValuations(productId)

  const handleEvaluateClick = () => {
    if (!user || !product) {
      return
    }
    navigate(`/${user.id}/valuation?productId=${product.id}`)
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

  return (
    <div className="page product-page">
      <h1 className="page__title">{product.name}</h1>

      {product.photos.length > 0 && (
        <div className="product-page__photos">
          {product.photos.map((photo) => (
            <figure className="col-image" key={photo}>
              <img src={`http://production-null.work/food-log${photo}`} alt={product.name} />
            </figure>
          ))}
        </div>
      )}

      <dl className="product-page__meta">
        <dt>販売会社</dt>
        <dd>{product.distributor}</dd>
        {product.manufacturing && (
          <>
            <dt>製造会社</dt>
            <dd>{product.manufacturing}</dd>
          </>
        )}
      </dl>

      <SignedIn>
        <button type="button" onClick={handleEvaluateClick}>
          この製品を評価する
        </button>
      </SignedIn>
      <SignedOut>
        <p>
          <a href="/login.html">ログイン</a>すると、この製品を評価できます。
        </p>
      </SignedOut>

      <h2>みんなの評価</h2>
      {isValuationsLoading && <p>読み込み中...</p>}
      {valuationsError && <p>{valuationsError}</p>}
      {!isValuationsLoading && valuations.length === 0 && <p>まだ評価がありません。</p>}
      <ul className="valuation-list">
        {valuations.map((valuation) => (
          <li key={valuation.id} className="valuation-list__item">
            <p className="valuation-list__score">{valuation.scoreLabel}</p>
            <p className="valuation-list__comment">{valuation.comment}</p>
            {(valuation.purchasePrice || valuation.purchaseStore) && (
              <p className="valuation-list__purchase">
                {valuation.purchasePrice && <>購入金額: {valuation.purchasePrice}円 </>}
                {valuation.purchaseStore && <>購入店舗: {valuation.purchaseStore}</>}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ProductPage
