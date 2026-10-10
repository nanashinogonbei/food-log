"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = require("react");
var _reactRouterDom = require("react-router-dom");
var _useCategories = require("./useCategories.ts");
var _data = require("./data.ts");
var _useProducts = require("../product/useProducts.ts");
var _NotFoundPage = _interopRequireDefault(require("../NotFoundPage.tsx"));
var _useBodyId = require("../components/useBodyId.ts");
require("../assets/css/category-small.css");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const ALL_TAB = 'all';
function SubCategoryPage() {
  (0, _useBodyId.useBodyId)('CATEGORY-SMALL');
  const {
    categoryLabel,
    middleCategoryLabel,
    subCategoryLabel
  } = (0, _reactRouterDom.useParams)();
  const {
    categories,
    isLoading: isCategoriesLoading,
    error: categoriesError
  } = (0, _useCategories.useCategories)();
  const [activeTab, setActiveTab] = (0, _react.useState)(ALL_TAB);
  const category = (0, _data.findMainCategoryByLabel)(categories, categoryLabel);
  const middleCategory = (0, _data.findMiddleCategoryByLabel)(categories, category?.slug, middleCategoryLabel);
  const subCategory = (0, _data.findSubCategoryByLabel)(categories, middleCategory?.slug, subCategoryLabel);

  // 小カテゴリーの下にある細区分（4階層目）を「すべて」に続くタブとして表示する
  const childCategories = subCategory ? (0, _data.getChildCategories)(categories, subCategory.slug) : [];
  const categoryIds = !subCategory ? [] : activeTab === ALL_TAB ? [subCategory.slug, ...childCategories.map(child => child.slug)] : [activeTab];

  // カテゴリーの解決前・未存在時も含め、Hooksは常に同じ順序で呼び出す
  const {
    products,
    isLoading: isProductsLoading,
    error: productsError
  } = (0, _useProducts.useProductsByCategory)(categoryIds);
  if (isCategoriesLoading) {
    return <div className="page">読み込み中...</div>;
  }
  if (categoriesError) {
    return <div className="page">{categoriesError}</div>;
  }
  if (!category || !middleCategory || !subCategory) {
    return <_NotFoundPage.default />;
  }
  return <div className="page">
      <p>
        <_reactRouterDom.Link to={`/category/${category.label}`}>{category.name}</_reactRouterDom.Link> &gt;{' '}
        <_reactRouterDom.Link to={`/category/${category.label}/${middleCategory.label}`}>{middleCategory.name}</_reactRouterDom.Link> &gt;{' '}
        {subCategory.name}
      </p>
      <h1 className="page__title">{subCategory.name}</h1>

		<div className="group-endCategory">
		
			<div className="colmun-side">
				{childCategories.length > 0 && <ul className="li-category">
					<li className={`item${activeTab === ALL_TAB ? ' -active' : ''}`}>
					<_reactRouterDom.Link onClick={() => setActiveTab(ALL_TAB)}>
					すべて
					</_reactRouterDom.Link>
					</li>
					{childCategories.map(child => <li className="item" className={`item${activeTab === child.slug ? ' -active' : ''}`}>
						<_reactRouterDom.Link key={child.slug} onClick={() => setActiveTab(child.slug)}>
						{child.name}
						</_reactRouterDom.Link>
						</li>)}
				</ul>}
			</div>

			<div className="colmun-main">
				{isProductsLoading && <p>読み込み中...</p>}
				{productsError && <p>{productsError}</p>}

				{!isProductsLoading && !productsError && products.length === 0 && <p>該当する商品はまだありません。</p>}

				<div className="card-product">
				{products.map(product => <div key={product.id} className="card-item">
						<_reactRouterDom.Link to={`/product/${product.id}`}>
						{product.photos[0] && <figure className="col-image">
							<img src={`http://production-null.work/food-log${product.photos[0]}`} alt={product.name} />
						  </figure>}
						<div className="col-txt">
							<p className="elem-distributor">{product.distributor}</p>
							<p className="elem-name">{product.name}</p>
						</div>
						</_reactRouterDom.Link>
					</div>)}
				</div>
			</div>
			
		</div>
		
    </div>;
}
var _default = exports.default = SubCategoryPage;