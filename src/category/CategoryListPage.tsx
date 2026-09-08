import { Link } from 'react-router-dom'
import { categories } from './data.ts'

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
