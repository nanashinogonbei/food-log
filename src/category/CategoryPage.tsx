import { Link, useParams } from 'react-router-dom'
import { useCategories } from './useCategories.ts'
import { findCategoryBySlug, getSubCategories } from './data.ts'
import NotFoundPage from '../NotFoundPage.tsx'

function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const { categories, isLoading, error } = useCategories()

  if (isLoading) {
    return <div className="page">読み込み中...</div>
  }

  if (error) {
    return <div className="page">{error}</div>
  }

  const category = findCategoryBySlug(categories, categoryId)

  if (!category || category.parentSlug !== null) {
    return <NotFoundPage />
  }

  const subCategories = getSubCategories(categories, category.slug)

  return (
    <div className="page">
      <h1 className="page__title">{category.name}</h1>

      <h2>小カテゴリー</h2>
      <div className="card-grid">
        {subCategories.map((subCategory) => (
          <Link key={subCategory.slug} to={`/category/${category.slug}/${subCategory.slug}`}>
            {subCategory.name}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default CategoryPage
