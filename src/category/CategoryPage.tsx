import { Link, useParams } from 'react-router-dom'

// TODO: 実データ取得(API/DB)に置き換える
const products = [
  { id: '1', name: '商品A' },
  { id: '2', name: '商品B' },
]

function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>()

  return (
    <div className="page">
      <h1 className="page__title">カテゴリーページ</h1>
      <p>
        カテゴリーID: <strong>{categoryId}</strong>
      </p>

      <div className="card-grid">
        {products.map((product) => (
          <Link key={product.id} to={`/product/${product.id}`}>
            {product.name}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default CategoryPage
