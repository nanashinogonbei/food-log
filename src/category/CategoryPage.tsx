import { Link, useParams } from 'react-router-dom'
import { useCategories } from './useCategories.ts'
import { findMainCategoryByLabel, getMiddleCategories } from './data.ts'
import NotFoundPage from '../NotFoundPage.tsx'

function CategoryPage() {
  const { categoryLabel } = useParams<{ categoryLabel: string }>()
  const { categories, isLoading, error } = useCategories()

  if (isLoading) {
    return <div className="page">読み込み中...</div>
  }

  if (error) {
    return <div className="page">{error}</div>
  }

  const category = findMainCategoryByLabel(categories, categoryLabel)

  if (!category) {
    return <NotFoundPage />
  }

  const middleCategories = getMiddleCategories(categories, category.slug)

  return (
    <div className="page">
      <h1 className="page__title">{category.name}</h1>

      <h2>中カテゴリー</h2>
      <div className="card-grid">
        {middleCategories.map((middleCategory) => (
          <Link
            key={middleCategory.slug}
            to={`/category/${category.label}/${middleCategory.label}`}
          >
            {middleCategory.name}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default CategoryPage
