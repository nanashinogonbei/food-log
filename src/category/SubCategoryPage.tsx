import { Link, useParams } from 'react-router-dom'
import { useCategories } from './useCategories.ts'
import { findMainCategoryByLabel, findMiddleCategoryByLabel, findSubCategoryByLabel } from './data.ts'
import NotFoundPage from '../NotFoundPage.tsx'

// TODO: 商品データもDB/APIから取得するように置き換える
const productsBySubCategorySlug: Record<string, { id: string; name: string }[]> = {
  cider: [{ id: '1', name: 'サイダーA' }],
  cola: [{ id: '2', name: 'コーラB' }],
  'green-tea': [{ id: '3', name: '緑茶C' }],
  'oolong-tea': [{ id: '4', name: '烏龍茶D' }],
  black: [{ id: '5', name: 'ブラックコーヒーE' }],
  'au-lait': [{ id: '6', name: 'カフェオレF' }],
  'tablet-chocolate': [{ id: '7', name: '板チョコG' }],
  'plain-cookie': [{ id: '8', name: 'クッキーH' }],
  'potato-chips': [{ id: '9', name: 'ポテトチップスI' }],
}

function SubCategoryPage() {
  const { categoryLabel, middleCategoryLabel, subCategoryLabel } = useParams<{
    categoryLabel: string
    middleCategoryLabel: string
    subCategoryLabel: string
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
  const subCategory = findSubCategoryByLabel(categories, middleCategory?.slug, subCategoryLabel)

  if (!category || !middleCategory || !subCategory) {
    return <NotFoundPage />
  }

  const products = productsBySubCategorySlug[subCategory.slug] ?? []

  return (
    <div className="page">
      <p>
        <Link to={`/category/${category.label}`}>{category.name}</Link> &gt;{' '}
        <Link to={`/category/${category.label}/${middleCategory.label}`}>{middleCategory.name}</Link> &gt;{' '}
        {subCategory.name}
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
