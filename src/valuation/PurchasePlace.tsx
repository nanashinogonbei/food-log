import { PURCHASE_TYPE_LABELS } from './data.ts'
import type { ValuationSummary } from './data.ts'
import { formatJapaneseDate } from './format.ts'

type PurchasePlaceFields = Pick<
  ValuationSummary,
  'purchaseRegion' | 'purchaseType' | 'purchaseStore' | 'purchaseBranch' | 'purchaseUrl' | 'purchaseDetail'
>

type PurchaseTableFields = PurchasePlaceFields &
  Pick<ValuationSummary, 'purchasePrice' | 'createdAt' | 'updatedAt'>

/**
 * 購入場所の内容（種別ラベル＋詳細）。種別に応じて表示内容が変わる。
 *   店舗: 店舗 店名 支店名 / 自販機: 自販機 / ネット・通販: ネット・通販 店名（URLはリンク） / その他: その他 内容
 */
function PlaceValue({ valuation }: { valuation: PurchasePlaceFields }) {
  const { purchaseType, purchaseStore, purchaseBranch, purchaseUrl, purchaseDetail } = valuation

  if (purchaseType === null) {
    return null
  }

  return (
    <>
      {PURCHASE_TYPE_LABELS[purchaseType]}
      {purchaseType === 'store' && <> {[purchaseStore, purchaseBranch].filter(Boolean).join(' ')}</>}
      {purchaseType === 'online' && (
        <>
          {' '}
          {purchaseUrl ? (
            // ユーザーが入力したURLなので、サーバー側でhttp/httpsのみ許可している。念のため参照元情報も渡さない
            <a href={purchaseUrl} target="_blank" rel="noopener noreferrer nofollow ugc">
              {purchaseStore}
            </a>
          ) : (
            purchaseStore
          )}
        </>
      )}
      {purchaseType === 'other' && <> {purchaseDetail}</>}
    </>
  )
}

/**
 * 評価の「購入地域」「購入場所」を1行のテキストで表示する（製品ページ・ユーザーページ用）。
 */
function PurchasePlace({ valuation }: { valuation: PurchasePlaceFields }) {
  const { purchaseRegion, purchaseType } = valuation

  if (purchaseType === null && !purchaseRegion) {
    return null
  }

  return (
    <>
      {purchaseRegion && <>購入地域: {purchaseRegion}</>}
      {purchaseRegion && purchaseType !== null && ' / '}
      {purchaseType !== null && (
        <>
          購入場所: <PlaceValue valuation={valuation} />
        </>
      )}
    </>
  )
}

/**
 * 評価の「投稿日」「購入金額」「購入地域」「購入場所」をテーブルで表示する（マイページの評価一覧用）。
 * 投稿日は常に表示し、それ以外は入力がある項目のみ行を出す。
 */
export function PurchaseTable({ valuation }: { valuation: PurchaseTableFields }) {
  const { purchasePrice, purchaseRegion, purchaseType, createdAt, updatedAt } = valuation

  return (
    <table className="table -typeB">
      <tbody>
        <tr>
          <th>投稿日</th>
          <td>
            {formatJapaneseDate(createdAt)}
            {updatedAt && <>（更新日: {formatJapaneseDate(updatedAt)}）</>}
          </td>
        </tr>
        {purchasePrice && (
          <tr>
            <th>購入金額</th>
            <td>{purchasePrice}円</td>
          </tr>
        )}
        {purchaseRegion && (
          <tr>
            <th>購入地域</th>
            <td>{purchaseRegion}</td>
          </tr>
        )}
        {purchaseType !== null && (
          <tr>
            <th>購入場所</th>
            <td>
              <PlaceValue valuation={valuation} />
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

export default PurchasePlace
