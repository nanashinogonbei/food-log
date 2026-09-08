import { Link, useParams } from 'react-router-dom'
import { findCategory, findSubCategory } from './data.ts'
import NotFoundPage from '../NotFoundPage.tsx'

function SubCategoryPage() {
  const { categoryId, subCategoryId } = useParams<{ categoryId: string; subCategoryId: string }>()
  const category = findCategory(categoryId)
  const subCategory = findSubCategory(categoryId, subCategoryId)

  if (!category || !subCategory) {
    return <NotFoundPage />
  }

  return (
    <div className="page">
      <p>
        <Link to={`/category/${category.id}`}>{category.name}</Link> &gt; {subCategory.name}
      </p>
      <h1 className="page__title">{subCategory.name}</h1>

      <div className="card-grid">
        {subCategory.products.map((product) => (
          <Link key={product.id} to={`/product/${product.id}`}>
            {product.name}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default SubCategoryPage
