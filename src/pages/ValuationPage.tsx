import { useParams } from 'react-router-dom'

// TODO: 実データ取得(API/DB)に置き換える
const valuations = [
  { productId: '1', productName: '商品A', score: 4 },
  { productId: '2', productName: '商品B', score: 5 },
]

function ValuationPage() {
  const { userId } = useParams<{ userId: string }>()

  return (
    <div className="page">
      <h1 className="page__title">商品評価</h1>
      <p>
        ユーザーID: <strong>{userId}</strong> が投稿した評価
      </p>
      <ul>
        {valuations.map((valuation) => (
          <li key={valuation.productId}>
            {valuation.productName} : 評価 {valuation.score} / 5
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ValuationPage
