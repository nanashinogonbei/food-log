import { PURCHASE_TYPE_LABELS } from './data.ts'
import type { ValuationSummary } from './data.ts'

type PurchasePlaceFields = Pick<
  ValuationSummary,
  'purchaseType' | 'purchaseStore' | 'purchaseBranch' | 'purchaseUrl' | 'purchaseDetail'
>

/**
 * 評価の「購入場所」を表示する。種別に応じて表示内容が変わる。
 *   店舗: 店舗 店名 支店名 / 自販機: 自販機 場所 / ネット・通販: ネット・通販 店名（URLはリンク） / その他: その他 内容
 */
function PurchasePlace({ valuation }: { valuation: PurchasePlaceFields }) {
  const { purchaseType, purchaseStore, purchaseBranch, purchaseUrl, purchaseDetail } = valuation

  if (purchaseType === null) {
    return null
  }

  return (
    <>
      購入場所: {PURCHASE_TYPE_LABELS[purchaseType]}
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
      {(purchaseType === 'vending' || purchaseType === 'other') && <> {purchaseDetail}</>}
    </>
  )
}

export default PurchasePlace
