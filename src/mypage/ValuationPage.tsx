import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { fetchProductById } from '../product/data.ts'
import type { ProductSummary } from '../product/data.ts'
import { useProductSearch } from '../product/useProducts.ts'
import { submitValuation, VALUATION_SCORE_OPTIONS } from '../valuation/data.ts'
import type { ValuationScore } from '../valuation/data.ts'
import { useUserValuations } from '../valuation/useValuations.ts'
import { toHalfWidthDigits } from '../valuation/format.ts'

const COMMENT_MIN_LENGTH = 10
const COMMENT_MAX_LENGTH = 2000
const PURCHASE_PRICE_MAX_LENGTH = 10
const PURCHASE_STORE_MAX_LENGTH = 50
const PRODUCT_NAME_MIN_LENGTH = 3

function ValuationPage() {
  const { userId } = useParams<{ userId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const preselectedProductId = searchParams.get('productId')

  // --- 商品選択 ---
  const [productName, setProductName] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ProductSummary | null>(null)
  const [isLoadingPreselected, setIsLoadingPreselected] = useState(Boolean(preselectedProductId))
  const [preselectedError, setPreselectedError] = useState<string | null>(null)

  // 商品名が確定済み商品と一致している間は検索を行わない
  const trimmedProductName = productName.trim()
  const isProductConfirmed = selectedProduct !== null && selectedProduct.name === trimmedProductName
  const { candidates, isSearching } = useProductSearch(isProductConfirmed ? '' : productName)

  // --- 評価項目 ---
  const [score, setScore] = useState<ValuationScore | ''>('')
  const [comment, setComment] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseStore, setPurchaseStore] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const { valuations, isLoading: isValuationsLoading, error: valuationsError, reload: reloadValuations } =
    useUserValuations(userId)

  // 製品ページから ?productId=xxx 付きで遷移してきた場合、商品を事前選択する
  useEffect(() => {
    if (!preselectedProductId) {
      return
    }

    let isMounted = true
    // preselectedProductId(URLのproductIdクエリ)が変わるたびに読み込み中表示をリセットする。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingPreselected(true)
    setPreselectedError(null)

    fetchProductById(preselectedProductId)
      .then((product) => {
        if (!isMounted) {
          return
        }
        if (product) {
          setSelectedProduct(product)
          setProductName(product.name)
        } else {
          setPreselectedError('指定された商品が見つかりませんでした。商品名を入力して選び直してください。')
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setPreselectedError(err instanceof Error ? err.message : '商品の取得に失敗しました')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingPreselected(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [preselectedProductId])

  // 商品名が完全一致する候補が見つかったら自動で確定し、
  // 確定済みの商品名と入力内容がずれたら選択を解除する
  useEffect(() => {
    if (selectedProduct && selectedProduct.name === trimmedProductName) {
      return
    }

    const exactMatch = candidates.find((candidate) => candidate.name === trimmedProductName)

    // 入力内容が候補と完全一致したら自動確定し、確定済みの商品名とずれたら選択を解除する。
    if (exactMatch) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedProduct(exactMatch)
    } else if (selectedProduct) {
      setSelectedProduct(null)
    }
  }, [candidates, trimmedProductName, selectedProduct])

  const handleProductNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setProductName(event.target.value)
  }

  const handleSelectCandidate = (candidate: ProductSummary) => {
    setSelectedProduct(candidate)
    setProductName(candidate.name)
  }

  const handlePurchasePriceChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPurchasePrice(toHalfWidthDigits(event.target.value).slice(0, PURCHASE_PRICE_MAX_LENGTH))
  }

  const commentLength = Array.from(comment).length
  const showCandidateList = !isProductConfirmed && trimmedProductName.length >= PRODUCT_NAME_MIN_LENGTH

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!userId) {
      return
    }

    if (!selectedProduct) {
      setSubmitError('評価する商品を選択してください。')
      return
    }

    if (score === '') {
      setSubmitError('評価を選択してください。')
      return
    }

    if (commentLength < COMMENT_MIN_LENGTH || commentLength > COMMENT_MAX_LENGTH) {
      setSubmitError(`コメントは${COMMENT_MIN_LENGTH}文字以上${COMMENT_MAX_LENGTH}文字以内で入力してください。`)
      return
    }

    if (purchaseStore.length > PURCHASE_STORE_MAX_LENGTH) {
      setSubmitError(`購入店舗は${PURCHASE_STORE_MAX_LENGTH}文字以内で入力してください。`)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      await submitValuation({
        userId,
        productId: selectedProduct.id,
        score,
        comment,
        purchasePrice: purchasePrice || undefined,
        purchaseStore: purchaseStore || undefined,
      })

      setSubmitSuccess(true)
      setProductName('')
      setSelectedProduct(null)
      setScore('')
      setComment('')
      setPurchasePrice('')
      setPurchaseStore('')
      setSearchParams({}, { replace: true })
      reloadValuations()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '商品評価の投稿に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page">
      <h1 className="page__title">商品評価</h1>

      {isLoadingPreselected && <p>選択中の商品を読み込んでいます...</p>}
      {preselectedError && <p>{preselectedError}</p>}
      {submitSuccess && <p>評価を投稿しました。ご協力ありがとうございます。</p>}
      {submitError && <p>{submitError}</p>}

      <form className="valuation-form" onSubmit={handleSubmit}>
        <div className="valuation-form__field autocomplete">
          <label htmlFor="productName">商品名【必須】</label>
          <input
            id="productName"
            type="text"
            value={productName}
            onChange={handleProductNameChange}
            autoComplete="off"
            required
          />
          <p className="field-hint">3文字以上入力すると候補が表示されます。</p>

          {selectedProduct && isProductConfirmed && (
            <div className="selected-product">
              {selectedProduct.photos[0] && <img src={`http://production-null.work/food-log${selectedProduct.photos[0]}`} alt={selectedProduct.name} />}
              <span>「{selectedProduct.name}」を選択中</span>
            </div>
          )}

          {showCandidateList && (
            <>
              {isSearching && <p className="field-hint">検索中...</p>}
              {!isSearching && candidates.length === 0 && (
                <p className="field-hint">一致する商品が見つかりません。</p>
              )}
              {candidates.length > 0 && (
                <ul className="autocomplete__list">
                  {candidates.map((candidate) => (
                    <li
                      key={candidate.id}
                      className="autocomplete__item"
                      onClick={() => handleSelectCandidate(candidate)}
                    >
                      {candidate.photos[0] && <img src={`http://production-null.work/food-log${candidate.photos[0]}`} alt={candidate.name} />}
                      <span className="autocomplete__item-name">{candidate.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="valuation-form__field">
          <span>評価【必須】</span>
          <div className="score-options">
            {VALUATION_SCORE_OPTIONS.map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  name="score"
                  value={option.value}
                  checked={score === option.value}
                  onChange={() => setScore(option.value)}
                  required
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="valuation-form__field">
          <label htmlFor="comment">コメント【必須】</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={6}
            required
          />
          <p className="field-hint">
            {commentLength} / {COMMENT_MAX_LENGTH}文字（{COMMENT_MIN_LENGTH}文字以上必須）
          </p>
        </div>

        <div className="valuation-form__field">
          <label htmlFor="purchasePrice">購入金額</label>
		  <div>
			  <input
				id="purchasePrice"
				type="text"
				inputMode="numeric"
				value={purchasePrice}
				onChange={handlePurchasePriceChange}
				maxLength={PURCHASE_PRICE_MAX_LENGTH}
			  />
			  円
		  </div>
          <p className="field-hint">数字{PURCHASE_PRICE_MAX_LENGTH}桁以内（全角数字は自動で半角に変換されます）</p>
        </div>

        <div className="valuation-form__field">
          <label htmlFor="purchaseStore">購入場所</label>
          <input
            id="purchaseStore"
            type="text"
            value={purchaseStore}
            onChange={(event) => setPurchaseStore(event.target.value)}
            maxLength={PURCHASE_STORE_MAX_LENGTH}
			placeholder="例）成城石井 グランゲート東京駅店 or 東京都渋谷区"
          />
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '送信中...' : '評価を投稿する'}
        </button>
      </form>

    </div>
  )
}

export default ValuationPage
