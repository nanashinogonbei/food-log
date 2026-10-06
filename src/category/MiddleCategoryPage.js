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
function MiddleCategoryPage() {
  (0, _useBodyId.useBodyId)('CATEGORY-MIDDLE');
  const {
    categoryLabel,
    middleCategoryLabel
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
  const middleCategory = (0, _data.findMiddleCategoryByLabel)(categories, category?.slug, middleCategoryLabel);
  if (!category || !middleCategory) {
    return <_NotFoundPage.default />;
  }
  const subCategories = (0, _data.getSubCategories)(categories, middleCategory.slug);
  return <div className="page">
      <p>
        <_reactRouterDom.Link to={`/category/${category.label}`}>{category.name}</_reactRouterDom.Link> &gt; {middleCategory.name}
      </p>
      <h1 className="page__title">{middleCategory.name}</h1>

      <div className="card-grid">
        {subCategories.map(subCategory => <_reactRouterDom.Link key={subCategory.slug} to={`/category/${category.label}/${middleCategory.label}/${subCategory.label}`}>
            {subCategory.name}
          </_reactRouterDom.Link>)}
      </div>
    </div>;
}
var _default = exports.default = MiddleCategoryPage;