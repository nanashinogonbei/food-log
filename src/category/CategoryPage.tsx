import { Link, useParams } from 'react-router-dom'
import { findCategory } from './data.ts'
import NotFoundPage from '../NotFoundPage.tsx'

function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const category = findCategory(categoryId)

  if (!category) {
    return <NotFoundPage />
  }

  return (
    <div className="page">
      <h1 className="page__title">{category.name}</h1>

      <h2>小カテゴリー</h2>
      <div className="card-grid">
        {category.subCategories.map((subCategory) => (
          <Link key={subCategory.id} to={`/category/${category.id}/${subCategory.id}`}>
            {subCategory.name}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default CategoryPage
