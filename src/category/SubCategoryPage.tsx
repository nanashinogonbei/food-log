import { Link, useParams } from 'react-router-dom'
import { useCategories } from './useCategories.ts'
import { findCategoryBySlug } from './data.ts'
import NotFoundPage from '../NotFoundPage.tsx'

// TODO: 商品データもDB/APIから取得するように置き換える
const productsBySubCategorySlug: Record<string, { id: string; name: string }[]> = {
  soda: [
    { id: '1', name: 'サイダーA' },
    { id: '2', name: 'コーラB' },
  ],
  tea: [
    { id: '3', name: '緑茶C' },
    { id: '4', name: '烏龍茶D' },
  ],
  coffee: [
    { id: '5', name: 'ブラックコーヒーE' },
    { id: '6', name: 'カフェオレF' },
  ],
  chocolate: [{ id: '7', name: '板チョコG' }],
  cookie: [{ id: '8', name: 'クッキーH' }],
  potato: [{ id: '9', name: 'ポテトチップスI' }],
}

function SubCategoryPage() {
  const { categoryId, subCategoryId } = useParams<{ categoryId: string; subCategoryId: string }>()
  const { categories, isLoading, error } = useCategories()

  if (isLoading) {
    return <div className="page">読み込み中...</div>
  }

  if (error) {
    return <div className="page">{error}</div>
  }

  const category = findCategoryBySlug(categories, categoryId)
  const subCategory = findCategoryBySlug(categories, subCategoryId)

  if (!category || !subCategory || subCategory.parentSlug !== category.slug) {
    return <NotFoundPage />
  }

  const products = productsBySubCategorySlug[subCategory.slug] ?? []

  return (
    <div className="page">
      <p>
        <Link to={`/category/${category.slug}`}>{category.name}</Link> &gt; {subCategory.name}
      </p>
      <h1 className="page__title">{subCategory.name}</h1>

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

export default SubCategoryPage
