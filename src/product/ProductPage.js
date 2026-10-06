"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = require("react");
var _reactRouterDom = require("react-router-dom");
var _clerkReact = require("@clerk/clerk-react");
var _useProducts = require("./useProducts.ts");
var _useValuations = require("../valuation/useValuations.ts");
var _data = require("../valuation/data.ts");
var _useReportedValuationIds = require("../report/useReportedValuationIds.ts");
var _ValuationReportButton = _interopRequireDefault(require("./ValuationReportButton.tsx"));
var _format = require("../valuation/format.ts");
var _useCategories = require("../category/useCategories.ts");
var _data2 = require("../category/data.ts");
var _useBodyId = require("../components/useBodyId.ts");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function ProductPage() {
  (0, _useBodyId.useBodyId)('PRODUCT');
  const {
    productId
  } = (0, _reactRouterDom.useParams)();
  const navigate = (0, _reactRouterDom.useNavigate)();
  const {
    user
  } = (0, _clerkReact.useUser)();
  const {
    product,
    isLoading,
    error
  } = (0, _useProducts.useProduct)(productId);
  const {
    categories
  } = (0, _useCategories.useCategories)();
  const {
    valuations,
    isLoading: isValuationsLoading,
    error: valuationsError,
    reload: reloadValuations
  } = (0, _useValuations.useProductValuations)(productId);
  // ログインユーザーが通報済みの評価（「通報済み」表示用）
  const {
    reportedIds,
    markReported
  } = (0, _useReportedValuationIds.useReportedValuationIds)(user?.id);

  // 大きい画像に表示中のサムネイルのインデックス（サムネイルにマウスオーバー/フォーカス/クリックで切り替え）
  const [activePhotoIndex, setActivePhotoIndex] = (0, _react.useState)(0);
  (0, _react.useEffect)(() => {
    setActivePhotoIndex(0);
  }, [product?.id]);

  // ログインユーザーが既にこの商品を評価済みかどうか（評価済みなら投稿ボタンを隠す）
  const hasEvaluated = user ? valuations.some(valuation => valuation.userId === user.id) : false;

  // 「好き・大好き」＝ポジティブ、「イマイチ」＝ネガティブでタブ表示を分ける（デフォルトはポジティブ）
  const [valuationTab, setValuationTab] = (0, _react.useState)('positive');
  const positiveValuations = valuations.filter(valuation => valuation.score !== 'poor');
  const negativeValuations = valuations.filter(valuation => valuation.score === 'poor');
  const visibleValuations = valuationTab === 'positive' ? positiveValuations : negativeValuations;
  const handleEvaluateClick = () => {
    if (!user || !product) {
      return;
    }
    navigate(`/${user.id}/valuation/post?productId=${product.id}`);
  };
  const handleDeleteClick = async valuationId => {
    if (!user) {
      return;
    }
    if (!window.confirm('この評価を削除しますか？')) {
      return;
    }
    try {
      await (0, _data.deleteValuation)(valuationId, user.id);
      reloadValuations();
    } catch (err) {
      alert(err instanceof Error ? err.message : '評価の削除に失敗しました');
    }
  };
  if (isLoading) {
    return <div className="page">
        <p>読み込み中...</p>
      </div>;
  }
  if (error) {
    return <div className="page">
        <p>{error}</p>
      </div>;
  }
  if (!product) {
    return <div className="page">
        <h1 className="page__title">商品が見つかりません</h1>
        <p>
          <_reactRouterDom.Link to="/">トップページに戻る</_reactRouterDom.Link>
        </p>
      </div>;
  }
  const categoryPaths = [product.category1, product.category2].map(categorySlug => (0, _data2.getCategoryPath)(categories, categorySlug)).filter(path => path.length > 0);
  const purchasePrices = valuations.map(valuation => valuation.purchasePrice ? Number(valuation.purchasePrice) : NaN).filter(price => Number.isFinite(price));
  const priceRange = purchasePrices.length > 0 ? {
    min: Math.min(...purchasePrices),
    max: Math.max(...purchasePrices)
  } : null;
  return <div className="page product-page">

		<section className="section-product">
			{product.photos.length > 0 && <div className="product-page__photos">
					<figure className="product-page__photo-main">
					  <img src={`http://production-null.work/food-log${product.photos[activePhotoIndex] ?? product.photos[0]}`} alt={product.name} />
					</figure>

					{product.photos.length > 1 && <div className="product-page__photo-thumbs">
						{product.photos.map((photo, index) => <_reactRouterDom.Link key={photo} className={`product-page__photo-thumb${index === activePhotoIndex ? ' product-page__photo-thumb--active' : ''}`} onMouseEnter={() => setActivePhotoIndex(index)} onFocus={() => setActivePhotoIndex(index)} onClick={() => setActivePhotoIndex(index)} aria-label={`${index + 1}枚目の画像を表示`}>
							<img src={`http://production-null.work/food-log${photo}`} alt="" />
						  </_reactRouterDom.Link>)}
					  </div>}
				</div>}

			<div className="product-page__meta">
				{categoryPaths.length > 0 && <nav className="product-page__breadcrumb" aria-label="カテゴリー">
						{categoryPaths.map(path => <p key={path[path.length - 1].slug}>{path.map(category => category.name).join(' > ')}</p>)}
					</nav>}
				<h1 className="page__title">{product.name}</h1>
				{priceRange && <p className="product-page__price-range">
						{priceRange.min}円～{priceRange.max}円
					</p>}
				<h2>販売会社</h2>
				<div>{product.distributor}</div>
				{product.manufacturing && <>
					<h2>製造会社</h2>
					<div>{product.manufacturing}</div>
				  </>}
			</div>
		</section>

		  {!hasEvaluated && <_clerkReact.SignedIn>
			<div class="stack-valuation">
			  <button type="button" onClick={handleEvaluateClick}>
				この製品を評価する
			  </button>
			</div>
			</_clerkReact.SignedIn>}
		  <_clerkReact.SignedOut>
			<div class="stack-valuation">
			<p>
			  <a href="/login.html">ログイン</a>すると、この製品を評価できます。
			</p>
			</div>
		  </_clerkReact.SignedOut>

      <h2>みんなの評価</h2>
      {isValuationsLoading && <p>読み込み中...</p>}
      {valuationsError && <p>{valuationsError}</p>}
      {!isValuationsLoading && <div className="valuation-tabs" role="tablist">
          <div role="tab" tabIndex={0} aria-selected={valuationTab === 'positive'} className={`valuation-tabs__tab${valuationTab === 'positive' ? ' valuation-tabs__tab--active' : ''}`} onClick={() => setValuationTab('positive')} onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setValuationTab('positive');
        }
      }}>
            ポジティブ評価（{positiveValuations.length}）
          </div>
          <div role="tab" tabIndex={0} aria-selected={valuationTab === 'negative'} className={`valuation-tabs__tab${valuationTab === 'negative' ? ' valuation-tabs__tab--active' : ''}`} onClick={() => setValuationTab('negative')} onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setValuationTab('negative');
        }
      }}>
            ネガティブ評価（{negativeValuations.length}）
          </div>
        </div>}
      {!isValuationsLoading && valuations.length === 0 && <p>まだ評価がありません。</p>}
      {!isValuationsLoading && valuations.length > 0 && visibleValuations.length === 0 && <p>該当する評価はまだありません。</p>}
      <ul className="valuation-list">
        {visibleValuations.map(valuation => <li key={valuation.id} className="valuation-list__item">
            <p className="valuation-list__date">
              投稿日: {(0, _format.formatJapaneseDate)(valuation.createdAt)}
              {valuation.updatedAt && <>（更新日: {(0, _format.formatJapaneseDate)(valuation.updatedAt)}）</>}
            </p>
            <p className="valuation-list__score">{valuation.scoreLabel}</p>
            <p className="valuation-list__comment">{valuation.comment}</p>
            {(valuation.purchasePrice || valuation.purchaseStore) && <p className="valuation-list__purchase">
                {valuation.purchasePrice && <>購入金額: {valuation.purchasePrice}円 </>}
                {valuation.purchaseStore && <>購入店舗: {valuation.purchaseStore}</>}
              </p>}
            {user && valuation.userId === user.id && <p className="valuation-list__actions">
                <_reactRouterDom.Link to={`/${user.id}/valuation/post?productId=${valuation.productId}`}>編集</_reactRouterDom.Link>{' '}
                <button type="button" onClick={() => handleDeleteClick(valuation.id)}>
                  削除
                </button>
              </p>}
            {user && valuation.userId !== user.id && <p className="valuation-list__actions">
                <_ValuationReportButton.default valuationId={valuation.id} reporterUserId={user.id} isReported={reportedIds.has(valuation.id)} onReported={markReported} />
              </p>}
          </li>)}
      </ul>
    </div>;
}
var _default = exports.default = ProductPage;