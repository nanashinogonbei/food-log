import { Link, useParams } from 'react-router-dom'
import { useCategories } from './useCategories.ts'
import { findMainCategoryByLabel, findMiddleCategoryByLabel, getSubCategories } from './data.ts'
import NotFoundPage from '../NotFoundPage.tsx'

function MiddleCategoryPage() {
  const { categoryLabel, middleCategoryLabel } = useParams<{
    categoryLabel: string
    middleCategoryLabel: string
  }>()
  const { categories, isLoading, error } = useCategories()

  if (isLoading) {
    return <div className="page">読み込み中...</div>
  }

  if (error) {
    return <div className="page">{error}</div>
  }

  const category = findMainCategoryByLabel(categories, categoryLabel)
  const middleCategory = findMiddleCategoryByLabel(categories, category?.slug, middleCategoryLabel)

  if (!category || !middleCategory) {
    return <NotFoundPage />
  }

  const subCategories = getSubCategories(categories, middleCategory.slug)

  return (
    <div className="page">
      <p>
        <Link to={`/category/${category.label}`}>{category.name}</Link> &gt; {middleCategory.name}
      </p>
      <h1 className="page__title">{middleCategory.name}</h1>

      <h2>小カテゴリー</h2>
      <div className="card-grid">
        {subCategories.map((subCategory) => (
          <Link
            key={subCategory.slug}
            to={`/category/${category.label}/${middleCategory.label}/${subCategory.label}`}
          >
            {subCategory.name}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default MiddleCategoryPage
