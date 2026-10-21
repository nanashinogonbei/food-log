import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProductRanking } from '../valuation/useValuations.ts'
import type { RankingPeriod } from '../valuation/data.ts'

const PERIOD_OPTIONS: { value: RankingPeriod; label: string }[] = [
  { value: 'weekly', label: '週間' },
  { value: 'monthly', label: '月間' },
  { value: 'quarterly', label: '四半期' },
]

interface FeaturedProductsRankingProps {
	/** 指定すると、そのカテゴリー（ID群）に属する商品だけを対象にする（中カテゴリーページ用）。未指定なら全商品 */
	categoryIds?: string[]
}

/**
 * 「注目の商品」: 週間/月間/四半期で評価された数の多い商品を1〜5位で表示する。
 * トップページでは全商品、中カテゴリーページではそのカテゴリー内の商品が対象。
 */
function FeaturedProductsRanking({ categoryIds }: FeaturedProductsRankingProps = {}) {
	const [period, setPeriod] = useState<RankingPeriod>('weekly')
	const { ranking, isLoading, error } = useProductRanking(period, categoryIds)

	return (
		<div className="product-pickup -ranking">
			<h2 className="heading">注目の商品</h2>
			<div className="inner">
			
				<div className="stack-tabs" role="tablist">
					{PERIOD_OPTIONS.map((option) => (
						<Link
							key={option.value}
							role="tab"
							aria-selected={period === option.value}
							className={`item${period === option.value ? ' -active' : ''}`}
							onClick={() => setPeriod(option.value)}
						>
						{option.label}
						</Link>
					))}
				</div>

				{isLoading && <p className="elem-functionTxt">読み込み中...</p>}
				{error && <p className="elem-functionTxt">{error}</p>}
				{!isLoading && !error && ranking.length === 0 && <p className="elem-functionTxt">この期間に評価された商品はまだありません。</p>}

				{!isLoading && !error && ranking.length > 0 && (
					<ul className="stack-list">
					  {ranking.map((item) => (
						<li key={item.productId} className="item">
						  <Link
							to={`/product/${item.productId}`}
							className="inner"
						>
							{item.productPhoto && (
							  <img
								src={`http://production-null.work/food-log${item.productPhoto}`}
								className="elem-img"
								alt={item.productName}
							  />
							)}
							<div className="cluster-txt">
								<span className="elem-ranking">{item.rank}位</span>
								<span className="elem-name">{item.productName}</span>
								<span className="elem-count">{item.valuationCount}件の評価</span>
							</div>
						  </Link>
						</li>
					  ))}
					</ul>
				)}

			</div>
		</div>
	)
}

export default FeaturedProductsRanking
