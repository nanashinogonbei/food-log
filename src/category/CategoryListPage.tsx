import { Link } from 'react-router-dom'

// TODO: 実データ取得(API/DB)に置き換える
const categories = [
  { id: 'sweets', name: 'スイーツ' },
  { id: 'drink', name: 'ドリンク' },
  { id: 'snack', name: 'スナック' },
]

function CategoryListPage() {
  return (
    <div className="page">
      <h1 className="page__title">カテゴリー一覧</h1>
      <div className="card-grid">
        {categories.map((category) => (
          <Link key={category.id} to={`/category/${category.id}`}>
            {category.name}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default CategoryListPage
