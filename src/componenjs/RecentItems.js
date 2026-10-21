"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = require("react");
var _reactRouterDom = require("react-router-dom");
var _useProducts = require("../product/useProducts.ts");
var _useValuations = require("../valuation/useValuations.ts");
var _format = require("../valuation/format.ts");
const TAB_OPTIONS = [{
  value: 'product',
  label: '商品'
}, {
  value: 'valuation',
  label: '評価'
}];

/** 評価コメントの一覧表示用の最大文字数（超えた分は「…」で省略する） */
const COMMENT_EXCERPT_LENGTH = 40;
function toExcerpt(comment) {
  const text = comment.replace(/\s+/g, ' ').trim();
  return text.length > COMMENT_EXCERPT_LENGTH ? `${text.slice(0, COMMENT_EXCERPT_LENGTH)}…` : text;
}
/**
 * 「最近追加」: 最近追加された商品 / 最近投稿された評価を5件ずつタブで切り替えて表示する。
 * 初期表示は「商品」タブ。トップページでは全体、中カテゴリーページではそのカテゴリー内が対象。
 */
function RecentItems({
  categoryIds
} = {}) {
  const [tab, setTab] = (0, _react.useState)('product');
  const {
    products,
    isLoading: isProductsLoading,
    error: productsError
  } = (0, _useProducts.useRecentProducts)(categoryIds);
  const {
    valuations,
    isLoading: isValuationsLoading,
    error: valuationsError
  } = (0, _useValuations.useRecentValuations)(categoryIds);
  const isLoading = tab === 'product' ? isProductsLoading : isValuationsLoading;
  const error = tab === 'product' ? productsError : valuationsError;
  const isEmpty = tab === 'product' ? products.length === 0 : valuations.length === 0;
  return <div className="product-pickup -recent">
			<h2 className="heading">最近追加</h2>
			<div className="inner">

				<div className="stack-tabs" role="tablist">
					{TAB_OPTIONS.map(option => <_reactRouterDom.Link key={option.value} role="tab" aria-selected={tab === option.value} className={`item${tab === option.value ? ' -active' : ''}`} onClick={() => setTab(option.value)}>
							{option.label}
						</_reactRouterDom.Link>)}
				</div>

				{isLoading && <p className="elem-functionTxt">読み込み中...</p>}
				{error && <p className="elem-functionTxt">{error}</p>}
				{!isLoading && !error && isEmpty && <p className="elem-functionTxt">
						{tab === 'product' ? '追加された商品はまだありません。' : '投稿された評価はまだありません。'}
					</p>}

				{!isLoading && !error && tab === 'product' && products.length > 0 && <ul className="stack-list">
						{products.map(product => <li key={product.id} className="item">
								<_reactRouterDom.Link to={`/product/${product.id}`} className="inner">
									{product.photos[0] && <img src={`http://production-null.work/food-log${product.photos[0]}`} className="elem-img" alt={product.name} />}
									<div className="cluster-txt">
										<span className="elem-name">{product.name}</span>
										<span className="elem-date">{(0, _format.formatJapaneseDate)(product.createdAt)}</span>
									</div>
								</_reactRouterDom.Link>
							</li>)}
					</ul>}

				{!isLoading && !error && tab === 'valuation' && valuations.length > 0 && <ul className="stack-list">
						{valuations.map(valuation => <li key={valuation.id} className="item">
								<_reactRouterDom.Link to={`/product/${valuation.productId}`} className="inner">
									{valuation.productPhoto && <img src={`http://production-null.work/food-log${valuation.productPhoto}`} className="elem-img" alt={valuation.productName} />}
									<div className="cluster-txt">
										<span className="elem-name">{valuation.productName}</span>
										<span className={`elem-score -${valuation.score}`}>{valuation.scoreLabel}</span>
										<span className="elem-comment">{toExcerpt(valuation.comment)}</span>
										<span className="elem-date">{(0, _format.formatJapaneseDate)(valuation.createdAt)}</span>
									</div>
								</_reactRouterDom.Link>
							</li>)}
					</ul>}

			</div>
		</div>;
}
var _default = exports.default = RecentItems;