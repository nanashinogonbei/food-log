import { useParams } from 'react-router-dom'

function ProductPage() {
  const { productId } = useParams<{ productId: string }>()

  return (
    <div className="page">
      <h1 className="page__title">詳細ページ</h1>
      <p>
        商品ID: <strong>{productId}</strong>
      </p>
      {/* TODO: 商品名・画像・評価一覧などを表示 */}
    </div>
  )
}

export default ProductPage
