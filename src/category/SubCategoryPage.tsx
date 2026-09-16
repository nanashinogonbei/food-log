import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCategories } from './useCategories.ts'
import {
  findMainCategoryByLabel,
  findMiddleCategoryByLabel,
  findSubCategoryByLabel,
  getChildCategories,
} from './data.ts'
import { useProductsByCategory } from '../product/useProducts.ts'
import NotFoundPage from '../NotFoundPage.tsx'

const ALL_TAB = 'all'

function SubCategoryPage() {
  const { categoryLabel, middleCategoryLabel, subCategoryLabel } = useParams<{
    categoryLabel: string
    middleCategoryLabel: string
    subCategoryLabel: string
  }>()
  const { categories, isLoading: isCategoriesLoading, error: categoriesError } = useCategories()
  const [activeTab, setActiveTab] = useState<string>(ALL_TAB)

  const category = findMainCategoryByLabel(categories, categoryLabel)
  const middleCategory = findMiddleCategoryByLabel(categories, category?.slug, middleCategoryLabel)
  const subCategory = findSubCategoryByLabel(categories, middleCategory?.slug, subCategoryLabel)

  // 小カテゴリーの下にある細区分（4階層目）を「すべて」に続くタブとして表示する
  const childCategories = subCategory ? getChildCategories(categories, subCategory.slug) : []

  const categoryIds = !subCategory
    ? []
    : activeTab === ALL_TAB
      ? [subCategory.slug, ...childCategories.map((child) => child.slug)]
      : [activeTab]

  // カテゴリーの解決前・未存在時も含め、Hooksは常に同じ順序で呼び出す
  const {
    products,
    isLoading: isProductsLoading,
    error: productsError,
  } = useProductsByCategory(categoryIds)

  if (isCategoriesLoading) {
    return <div className="page">読み込み中...</div>
  }

  if (categoriesError) {
    return <div className="page">{categoriesError}</div>
  }

  if (!category || !middleCategory || !subCategory) {
    return <NotFoundPage />
  }

  return (
    <div className="page">
      <p>
        <Link to={`/category/${category.label}`}>{category.name}</Link> &gt;{' '}
        <Link to={`/category/${category.label}/${middleCategory.label}`}>{middleCategory.name}</Link> &gt;{' '}
        {subCategory.name}
      </p>
      <h1 className="page__title">{subCategory.name}</h1>

		<div className="group-endCategory">
		
			<div className="colmun-side">
				{childCategories.length > 0 && (
				<ul className="li-category">
					<li
						className={`item${activeTab === ALL_TAB ? ' -active' : ''}`}
					>
					<Link
						onClick={() => setActiveTab(ALL_TAB)}
					>
					すべて
					</Link>
					</li>
					{childCategories.map((child) => (
						<li
							className="item"
							className={`item${activeTab === child.slug ? ' -active' : ''}`}
						>
						<Link
						  key={child.slug}
						  onClick={() => setActiveTab(child.slug)}
						>
						{child.name}
						</Link>
						</li>
					))}
				</ul>
				)}
			</div>

			<div className="colmun-main">
				{isProductsLoading && <p>読み込み中...</p>}
				{productsError && <p>{productsError}</p>}

				{!isProductsLoading && !productsError && products.length === 0 && <p>該当する商品はまだありません。</p>}

				<div className="card-product">
				{products.map((product) => (
					<div
						key={product.id}
						className="card-item"
					>
						<Link to={`/product/${product.id}`}>
						{product.photos[0] && (
						  <figure className="col-image">
							<img src={`http://production-null.work/food-log${product.photos[0]}`} alt={product.name} />
						  </figure>
						)}
						<div className="col-txt">
							<p className="elem-distributor">{product.distributor}</p>
							<p className="elem-name">{product.name}</p>
						</div>
						</Link>
					</div>
				))}
				</div>
			</div>
			
		</div>
		
    </div>
  )
}

export default SubCategoryPage
