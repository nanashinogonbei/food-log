"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = require("react");
var _reactRouterDom = require("react-router-dom");
var _useValuations = require("../valuation/useValuations.ts");
const PERIOD_OPTIONS = [{
  value: 'weekly',
  label: '週間'
}, {
  value: 'monthly',
  label: '月間'
}, {
  value: 'quarterly',
  label: '四半期'
}];

/**
 * トップページの「注目の商品」: 週間/月間/四半期で評価された数の多い商品を1〜5位で表示する。
 */
function FeaturedProductsRanking() {
  const [period, setPeriod] = (0, _react.useState)('weekly');
  const {
    ranking,
    isLoading,
    error
  } = (0, _useValuations.useProductRanking)(period);
  return <div className="product-ranking">
			<h2 className="heading">注目の商品</h2>
			<div className="inner">
			
				<div className="stack-tabs" role="tablist">
					{PERIOD_OPTIONS.map(option => <_reactRouterDom.Link key={option.value} role="tab" aria-selected={period === option.value} className={`item${period === option.value ? ' -active' : ''}`} onClick={() => setPeriod(option.value)}>
						{option.label}
						</_reactRouterDom.Link>)}
				</div>

				{isLoading && <p className="elem-functionTxt">読み込み中...</p>}
				{error && <p className="elem-functionTxt">{error}</p>}
				{!isLoading && !error && ranking.length === 0 && <p className="elem-functionTxt">この期間に評価された商品はまだありません。</p>}

				{!isLoading && !error && ranking.length > 0 && <ul className="list-ranking">
					  {ranking.map(item => <li key={item.productId} className="item">
						  <_reactRouterDom.Link to={`/product/${item.productId}`} className="inner">
							{item.productPhoto && <img src={`http://production-null.work/food-log${item.productPhoto}`} className="elem-img" alt={item.productName} />}
							<div className="cluster-txt">
								<span className="elem-ranking">{item.rank}位</span>
								<span className="elem-name">{item.productName}</span>
								<span className="elem-count">{item.valuationCount}件の評価</span>
							</div>
						  </_reactRouterDom.Link>
						</li>)}
					</ul>}

			</div>
		</div>;
}
var _default = exports.default = FeaturedProductsRanking;