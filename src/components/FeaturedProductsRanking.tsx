import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProductRanking } from '../valuation/useValuations.ts'
import type { RankingPeriod } from '../valuation/data.ts'

const PERIOD_OPTIONS: { value: RankingPeriod; label: string }[] = [
  { value: 'weekly', label: '週間' },
  { value: 'monthly', label: '月間' },
  { value: 'quarterly', label: '四半期' },
]

/**
 * トップページの「注目の商品」: 週間/月間/四半期で評価された数の多い商品を1〜5位で表示する。
 */
function FeaturedProductsRanking() {
  const [period, setPeriod] = useState<RankingPeriod>('weekly')
  const { ranking, isLoading, error } = useProductRanking(period)

  return (
    <div className="ranking">
      <div className="ranking__tabs" role="tablist">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={period === option.value}
            className={`ranking__tab${period === option.value ? ' ranking__tab--active' : ''}`}
            onClick={() => setPeriod(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isLoading && <p>読み込み中...</p>}
      {error && <p>{error}</p>}
      {!isLoading && !error && ranking.length === 0 && <p>この期間に評価された商品はまだありません。</p>}

      {!isLoading && !error && ranking.length > 0 && (
        <ol className="ranking__list">
          {ranking.map((item) => (
            <li key={item.productId} className="ranking__item">
              <Link to={`/product/${item.productId}`}>
                <span className="ranking__rank">{item.rank}</span>
                {item.productPhoto && (
                  <img
                    src={`http://production-null.work/food-log${item.productPhoto}`}
                    alt={item.productName}
                  />
                )}
                <span className="ranking__name">{item.productName}</span>
                <span className="ranking__count">{item.valuationCount}件の評価</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default FeaturedProductsRanking
