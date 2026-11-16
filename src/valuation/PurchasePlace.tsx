import { PURCHASE_TYPE_LABELS } from './data.ts'
import type { ValuationSummary } from './data.ts'

type PurchasePlaceFields = Pick<
  ValuationSummary,
  'purchaseRegion' | 'purchaseType' | 'purchaseStore' | 'purchaseBranch' | 'purchaseUrl' | 'purchaseDetail'
>

/**
 * 購入場所の内容（種別ラベル＋詳細）。種別に応じて表示内容が変わる。ページごとのマークアップで使えるよう公開している。
 *   店舗: 店舗 店名 支店名 / 自販機: 自販機 / ネット・通販: ネット・通販 店名（URLはリンク） / その他: その他 内容
 */
export function PlaceValue({ valuation }: { valuation: PurchasePlaceFields }) {
  const { purchaseType, purchaseStore, purchaseBranch, purchaseUrl, purchaseDetail } = valuation

  if (purchaseType === null) {
    return null
  }

  return (
    <>
      {purchaseType === 'store' && <> {[purchaseStore, purchaseBranch].filter(Boolean).join(' ')}</>}
			{purchaseType === 'online' && (
        <>
          {' '}
          {purchaseUrl ? (
            // ユーザーが入力したURLなので、サーバー側でhttp/httpsのみ許可している。念のため参照元情報も渡さない
            <a href={purchaseUrl} className="elem-link" target="_blank" rel="noopener noreferrer nofollow ugc">
              {purchaseStore}
            </a>
          ) : (
            purchaseStore
          )}
        </>
      )}
      {purchaseType === 'other' && <> {purchaseDetail}</>}
			（{PURCHASE_TYPE_LABELS[purchaseType]}）
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

export default PurchasePlace
