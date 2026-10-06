"use strict";

var _react = require("react");
var _client = require("react-dom/client");
var _reactRouterDom = require("react-router-dom");
var _clerkReact = require("@clerk/clerk-react");
var _localizations = require("@clerk/localizations");
require("./index.css");
require("./App.css");
var _Header = _interopRequireDefault(require("./components/Header.tsx"));
var _RequireAuth = _interopRequireDefault(require("./components/RequireAuth.tsx"));
var _RequireAdmin = _interopRequireDefault(require("./components/RequireAdmin.tsx"));
var _AdminPage = _interopRequireDefault(require("./admin/AdminPage.tsx"));
var _AdminProductApprovalPage = _interopRequireDefault(require("./admin/AdminProductApprovalPage.tsx"));
var _AdminProductManagePage = _interopRequireDefault(require("./admin/AdminProductManagePage.tsx"));
var _AdminReportPage = _interopRequireDefault(require("./admin/AdminReportPage.tsx"));
var _FeaturedProductsRanking = _interopRequireDefault(require("./components/FeaturedProductsRanking.tsx"));
var _ProductSearchBox = _interopRequireDefault(require("./components/ProductSearchBox.tsx"));
var _useBodyId = require("./components/useBodyId.ts");
var _CategoryListPage = _interopRequireDefault(require("./category/CategoryListPage.tsx"));
var _CategoryPage = _interopRequireDefault(require("./category/CategoryPage.tsx"));
var _MiddleCategoryPage = _interopRequireDefault(require("./category/MiddleCategoryPage.tsx"));
var _SubCategoryPage = _interopRequireDefault(require("./category/SubCategoryPage.tsx"));
var _useCategories = require("./category/useCategories.ts");
var _data = require("./category/data.ts");
var _ProductPage = _interopRequireDefault(require("./product/ProductPage.tsx"));
var _MyPage = _interopRequireDefault(require("./mypage/MyPage.tsx"));
var _RequestPage = _interopRequireDefault(require("./mypage/RequestPage.tsx"));
var _RequestPostPage = _interopRequireDefault(require("./mypage/RequestPostPage.tsx"));
var _ValuationPage = _interopRequireDefault(require("./mypage/ValuationPage.tsx"));
var _ValuationPostPage = _interopRequireDefault(require("./mypage/ValuationPostPage.tsx"));
var _NotFoundPage = _interopRequireDefault(require("./NotFoundPage.tsx"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// トップページ (/)
function TopPage() {
  (0, _useBodyId.useBodyId)('TOP');
  const {
    categories,
    isLoading,
    error
  } = (0, _useCategories.useCategories)();
  const mainCategories = (0, _data.getMainCategories)(categories);
  return <>
	
      <div className="product-fv"><_ProductSearchBox.default /></div>
      

      <h2>
        カテゴリーから探す <_reactRouterDom.Link to="/category">（一覧を見る）</_reactRouterDom.Link>
      </h2>
      {isLoading && <p>読み込み中...</p>}
      {error && <p>{error}</p>}
      {mainCategories.map(category => {
      const middleCategories = (0, _data.getMiddleCategories)(categories, category.slug);
      return <div key={category.slug} class="category-group">
			<figure class="col-image">
				<img src={`/assets/images/category/${category.filename}`} alt={category.name} />
			</figure>
			<div class="col-text">
				<h3 class="heading-typeA">
				  <_reactRouterDom.Link to={`/category/${category.label}`}>{category.name}</_reactRouterDom.Link>
				</h3>
				<div className="card-grid">
				  {middleCategories.map(middleCategory => <_reactRouterDom.Link key={middleCategory.slug} to={`/category/${category.label}/${middleCategory.label}`}>
					  {middleCategory.name}
					</_reactRouterDom.Link>)}
				</div>
			</div>
		</div>;
    })}

      <h2>注目の商品</h2>
      <_FeaturedProductsRanking.default />
    </>;
}
function App() {
  return <>
      <_Header.default />
      <_reactRouterDom.Routes>
        {/* トップページ */}
        <_reactRouterDom.Route path="/" element={<TopPage />} />
        {/* カテゴリー一覧ページ */}
        <_reactRouterDom.Route path="/category" element={<_CategoryListPage.default />} />
        {/* 大カテゴリーページ */}
        <_reactRouterDom.Route path="/category/:categoryLabel" element={<_CategoryPage.default />} />
        {/* 中カテゴリーページ */}
        <_reactRouterDom.Route path="/category/:categoryLabel/:middleCategoryLabel" element={<_MiddleCategoryPage.default />} />
        {/* 小カテゴリーページ */}
        <_reactRouterDom.Route path="/category/:categoryLabel/:middleCategoryLabel/:subCategoryLabel" element={<_SubCategoryPage.default />} />
        {/* 詳細ページ */}
        <_reactRouterDom.Route path="/product/:productId" element={<_ProductPage.default />} />
        {/* 管理者ページ（要管理者権限） */}
        <_reactRouterDom.Route path="/admin" element={<_RequireAdmin.default>
              <_AdminPage.default />
            </_RequireAdmin.default>} />
        {/* 商品承認 管理ページ（要管理者権限） */}
        <_reactRouterDom.Route path="/admin/product-approval" element={<_RequireAdmin.default>
              <_AdminProductApprovalPage.default />
            </_RequireAdmin.default>} />
        {/* 商品 管理ページ（要管理者権限） */}
        <_reactRouterDom.Route path="/admin/product" element={<_RequireAdmin.default>
              <_AdminProductManagePage.default />
            </_RequireAdmin.default>} />
        {/* 通報 管理ページ（要管理者権限） */}
        <_reactRouterDom.Route path="/admin/report" element={<_RequireAdmin.default>
              <_AdminReportPage.default />
            </_RequireAdmin.default>} />
        {/* マイページ（要ログイン） */}
        <_reactRouterDom.Route path="/:userId" element={<_RequireAuth.default>
              <_MyPage.default />
            </_RequireAuth.default>} />
        {/* 商品申請一覧（要ログイン） */}
        <_reactRouterDom.Route path="/:userId/request" element={<_RequireAuth.default>
              <_RequestPage.default />
            </_RequireAuth.default>} />
        {/* 商品申請 投稿（要ログイン） */}
        <_reactRouterDom.Route path="/:userId/request/post" element={<_RequireAuth.default>
              <_RequestPostPage.default />
            </_RequireAuth.default>} />
        {/* 商品評価一覧（要ログイン） */}
        <_reactRouterDom.Route path="/:userId/valuation" element={<_RequireAuth.default>
              <_ValuationPage.default />
            </_RequireAuth.default>} />
        {/* 商品評価 投稿（要ログイン） */}
        <_reactRouterDom.Route path="/:userId/valuation/post" element={<_RequireAuth.default>
              <_ValuationPostPage.default />
            </_RequireAuth.default>} />
        <_reactRouterDom.Route path="*" element={<_NotFoundPage.default />} />
      </_reactRouterDom.Routes>
    </>;
}

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file');
}
(0, _client.createRoot)(document.getElementById('root')).render(<_react.StrictMode>
    <_clerkReact.ClerkProvider publishableKey={PUBLISHABLE_KEY} localization={_localizations.jaJP}>
      <_reactRouterDom.BrowserRouter>
        <App />
      </_reactRouterDom.BrowserRouter>
    </_clerkReact.ClerkProvider>
  </_react.StrictMode>);