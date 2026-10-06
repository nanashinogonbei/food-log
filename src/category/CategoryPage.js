"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _reactRouterDom = require("react-router-dom");
var _useCategories = require("./useCategories.ts");
var _data = require("./data.ts");
var _NotFoundPage = _interopRequireDefault(require("../NotFoundPage.tsx"));
var _useBodyId = require("../components/useBodyId.ts");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function CategoryPage() {
  (0, _useBodyId.useBodyId)('CATEGORY-BIG');
  const {
    categoryLabel
  } = (0, _reactRouterDom.useParams)();
  const {
    categories,
    isLoading,
    error
  } = (0, _useCategories.useCategories)();
  if (isLoading) {
    return <div className="page">読み込み中...</div>;
  }
  if (error) {
    return <div className="page">{error}</div>;
  }
  const category = (0, _data.findMainCategoryByLabel)(categories, categoryLabel);
  if (!category) {
    return <_NotFoundPage.default />;
  }
  const middleCategories = (0, _data.getMiddleCategories)(categories, category.slug);
  return <div className="page">
      <h1 className="page__title">{category.name}</h1>

      <div className="card-grid">
        {middleCategories.map(middleCategory => <_reactRouterDom.Link key={middleCategory.slug} to={`/category/${category.label}/${middleCategory.label}`}>
            {middleCategory.name}
          </_reactRouterDom.Link>)}
      </div>
    </div>;
}
var _default = exports.default = CategoryPage;