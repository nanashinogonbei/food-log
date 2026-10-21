import { Link, useParams } from 'react-router-dom'
import { useCategories } from './useCategories.ts'
import {
  findMainCategoryByLabel,
  findMiddleCategoryByLabel,
  getDescendantCategories,
  getSubCategories,
} from './data.ts'
import FeaturedProductsRanking from '../components/FeaturedProductsRanking.tsx'
import RecentItems from '../components/RecentItems.tsx'
import NotFoundPage from '../NotFoundPage.tsx'
import { useBodyId } from '../components/useBodyId.ts'

function MiddleCategoryPage() {
  useBodyId('CATEGORY-MIDDLE')
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

  // 中カテゴリー自身と、その配下（小カテゴリー・細区分）すべてに属する商品を対象にする
  const categoryIds = [middleCategory.slug, ...getDescendantCategories(categories, middleCategory.slug).map((c) => c.slug)]

  return (
 	<div id="l-content">
		<div id="l-breadcrumb">
			<Link to="/">HOME</Link> &gt;{' '}
			<Link to={`/category/${category.label}`}>{category.name}</Link> &gt;{' '}
			{middleCategory.name}
		</div>
		<h1 className="heading -typeA">{middleCategory.name}</h1>
		<ul className="stack-linkLink -typeA">
			{subCategories.map((subCategory) => (
			<li className="item">
			<Link
				key={subCategory.slug}
				to={`/category/${category.label}/${middleCategory.label}/${subCategory.label}`}
			>
				{subCategory.name}
			</Link>
			</li>
			))}
		</ul>
		{/* key: 別の中カテゴリーへ移動したときに、タブ選択や取得済みの表示をリセットして作り直す */}
		<FeaturedProductsRanking key={`ranking-${middleCategory.slug}`} categoryIds={categoryIds} />
		<RecentItems key={`recent-${middleCategory.slug}`} categoryIds={categoryIds} />
	</div>
  )
}

export default MiddleCategoryPage
