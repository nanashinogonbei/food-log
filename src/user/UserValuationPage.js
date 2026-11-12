"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = require("react");
var _reactRouterDom = require("react-router-dom");
var _useBodyId = require("../components/useBodyId.ts");
var _useValuations = require("../valuation/useValuations.ts");
var _PurchasePlace = _interopRequireDefault(require("../valuation/PurchasePlace.tsx"));
var _data = require("../valuation/data.ts");
var _format = require("../valuation/format.ts");
var _data2 = require("./data.ts");
var _NotFoundPage = _interopRequireDefault(require("../NotFoundPage.tsx"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const PAGE_SIZE = 10;

/** ユーザーページ (/user/[userID]): そのユーザーが評価した商品の一覧を、誰でも見られる */
function UserValuationPage() {
  (0, _useBodyId.useBodyId)('MYPAGE');
  const {
    userId: publicId
  } = (0, _reactRouterDom.useParams)();
  const {
    valuations,
    isLoading,
    error
  } = (0, _useValuations.usePublicUserValuations)(publicId);
  const [visibleCount, setVisibleCount] = (0, _react.useState)(PAGE_SIZE);

  // undefined: 取得中 / null: 該当ユーザーなし
  const [profile, setProfile] = (0, _react.useState)(undefined);
  const [profileError, setProfileError] = (0, _react.useState)(null);
  (0, _react.useEffect)(() => {
    if (!publicId) {
      return;
    }
    let isMounted = true;
    (0, _data2.fetchPublicUserProfile)(publicId).then(data => {
      if (isMounted) {
        setProfile(data);
      }
    }).catch(err => {
      if (isMounted) {
        setProfileError(err instanceof Error ? err.message : 'ユーザー情報の取得に失敗しました');
      }
    });
    return () => {
      isMounted = false;
    };
  }, [publicId]);
  if (profile === null) {
    return <_NotFoundPage.default />;
  }
  const userName = profile?.displayName || 'ユーザー';
  const visibleValuations = valuations.slice(0, visibleCount);
  const hasMore = visibleCount < valuations.length;
  return <div id="l-content">
      <div id="l-breadcrumb">
        <_reactRouterDom.Link to="/">HOME</_reactRouterDom.Link> &gt;{' '}
        {userName}さんの評価一覧
      </div>

      <h1 className="heading -typeA">{userName}さんの評価一覧</h1>

      <section className="product-content">
        <h2 className="heading -typeB">
          投稿した評価
          {!isLoading && !error && <span className="count">（全{valuations.length}件）</span>}
        </h2>
        {isLoading && <p>読み込み中...</p>}
        {(error || profileError) && <p>{error ?? profileError}</p>}
        {!isLoading && !error && valuations.length === 0 && <p>まだ評価が投稿されていません。</p>}

        <ul className="product-listValuation">
          {visibleValuations.map(valuation => <li key={valuation.id} className="item">
              <figure className="elem-img">
                {valuation.productPhoto && <img src={`http://production-null.work/food-log${valuation.productPhoto}`} alt={valuation.productName} />}
              </figure>
              <p className="elem-name"><_reactRouterDom.Link to={`/product/${valuation.productId}`} className="elem-link -typeA">{valuation.productName}</_reactRouterDom.Link></p>
              <p className="elem-date">
                投稿日: {(0, _format.formatJapaneseDate)(valuation.createdAt)}
                {valuation.updatedAt && <>（更新日: {(0, _format.formatJapaneseDate)(valuation.updatedAt)}）</>}
              </p>
              {valuation.purchasePrice && <p className="elem-price">購入金額: {valuation.purchasePrice}円</p>}
              {(0, _data.hasPurchasePlace)(valuation) && <p className="elem-store"><_PurchasePlace.default valuation={valuation} /></p>}
              <p className="elem-score">{valuation.scoreLabel}</p>
              <p className="elem-comment">{valuation.comment}</p>
            </li>)}
        </ul>

        {hasMore && <p>
            <button type="button" className="elem-button -typeA" onClick={() => setVisibleCount(count => count + PAGE_SIZE)}>
              もっと見る
            </button>
          </p>}
      </section>
    </div>;
}
var _default = exports.default = UserValuationPage;