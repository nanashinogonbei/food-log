import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRecentProducts } from '../product/useProducts.ts'
import { useRecentValuations } from '../valuation/useValuations.ts'
import { formatJapaneseDate } from '../valuation/format.ts'

type RecentTab = 'product' | 'valuation'

const TAB_OPTIONS: { value: RecentTab; label: string }[] = [
	{ value: 'product', label: '商品' },
	{ value: 'valuation', label: '評価' },
]

/** 評価コメントの一覧表示用の最大文字数（超えた分は「…」で省略する） */
const COMMENT_EXCERPT_LENGTH = 40

function toExcerpt(comment: string): string {
	const text = comment.replace(/\s+/g, ' ').trim()
	return text.length > COMMENT_EXCERPT_LENGTH ? `${text.slice(0, COMMENT_EXCERPT_LENGTH)}…` : text
}

/**
 * トップページの「最近追加」: 最近追加された商品 / 最近投稿された評価を5件ずつタブで切り替えて表示する。
 * 初期表示は「商品」タブ。
 */
function RecentItems() {
	const [tab, setTab] = useState<RecentTab>('product')
	const { products, isLoading: isProductsLoading, error: productsError } = useRecentProducts()
	const { valuations, isLoading: isValuationsLoading, error: valuationsError } = useRecentValuations()

	const isLoading = tab === 'product' ? isProductsLoading : isValuationsLoading
	const error = tab === 'product' ? productsError : valuationsError
	const isEmpty = tab === 'product' ? products.length === 0 : valuations.length === 0

	return (
		<div className="product-recent">
			<h2 className="heading">最近追加</h2>
			<div className="inner">

				<div className="stack-tabs" role="tablist">
					{TAB_OPTIONS.map((option) => (
						<button
							key={option.value}
							type="button"
							role="tab"
							aria-selected={tab === option.value}
							className={`item${tab === option.value ? ' -active' : ''}`}
							onClick={() => setTab(option.value)}
						>
							{option.label}
						</button>
					))}
				</div>

				{isLoading && <p className="elem-functionTxt">読み込み中...</p>}
				{error && <p className="elem-functionTxt">{error}</p>}
				{!isLoading && !error && isEmpty && (
					<p className="elem-functionTxt">
						{tab === 'product' ? '追加された商品はまだありません。' : '投稿された評価はまだありません。'}
					</p>
				)}

				{!isLoading && !error && tab === 'product' && products.length > 0 && (
					<ul className="list-recent">
						{products.map((product) => (
							<li key={product.id} className="item">
								<Link to={`/product/${product.id}`} className="inner">
									{product.photos[0] && (
										<img
											src={`http://production-null.work/food-log${product.photos[0]}`}
											className="elem-img"
											alt={product.name}
										/>
									)}
									<div className="cluster-txt">
										<span className="elem-name">{product.name}</span>
										<span className="elem-date">{formatJapaneseDate(product.createdAt)}</span>
									</div>
								</Link>
							</li>
						))}
					</ul>
				)}

				{!isLoading && !error && tab === 'valuation' && valuations.length > 0 && (
					<ul className="list-recent">
						{valuations.map((valuation) => (
							<li key={valuation.id} className="item">
								<Link to={`/product/${valuation.productId}`} className="inner">
									{valuation.productPhoto && (
										<img
											src={`http://production-null.work/food-log${valuation.productPhoto}`}
											className="elem-img"
											alt={valuation.productName}
										/>
									)}
									<div className="cluster-txt">
										<span className="elem-name">{valuation.productName}</span>
										<span className={`elem-score -${valuation.score}`}>{valuation.scoreLabel}</span>
										<span className="elem-comment">{toExcerpt(valuation.comment)}</span>
										<span className="elem-date">{formatJapaneseDate(valuation.createdAt)}</span>
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

export default RecentItems
