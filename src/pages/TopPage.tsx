import { Link } from 'react-router-dom'

// TODO: 実データ取得(API/DB)に置き換える
const categories = [
  { id: 'sweets', name: 'スイーツ' },
  { id: 'drink', name: 'ドリンク' },
  { id: 'snack', name: 'スナック' },
]

const products = [
  { id: '1', name: '商品A' },
  { id: '2', name: '商品B' },
  { id: '3', name: '商品C' },
]

function TopPage() {
  return (
    <div className="page">
      <h1 className="page__title">トップページ</h1>
      <p>不特定多数が商品を評価するコミュニティサイトです。</p>

      <h2>
        カテゴリーから探す <Link to="/category">（一覧を見る）</Link>
      </h2>
      <div className="card-grid">
        {categories.map((category) => (
          <Link key={category.id} to={`/category/${category.id}`}>
            {category.name}
          </Link>
        ))}
      </div>

      <h2>注目の商品</h2>
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

export default TopPage
