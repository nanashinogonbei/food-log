import { Link } from 'react-router-dom'
import { useCategories } from './useCategories.ts'
import { getMainCategories } from './data.ts'

function CategoryListPage() {
  const { categories, isLoading, error } = useCategories()

  if (isLoading) {
    return <div className="page">読み込み中...</div>
  }

  if (error) {
    return <div className="page">{error}</div>
  }

  const mainCategories = getMainCategories(categories)

  return (
    <div className="page">
      <h1 className="page__title">カテゴリー一覧</h1>
      <div className="card-grid">
        {mainCategories.map((category) => (
          <Link key={category.slug} to={`/category/${category.label}`}>
            {category.name}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default CategoryListPage
