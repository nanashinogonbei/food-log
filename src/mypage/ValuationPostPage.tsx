import { useUser } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { fetchProductById } from '../product/data.ts'
import type { ProductSummary } from '../product/data.ts'
import { useProductSearch } from '../product/useProducts.ts'
import {
  PURCHASE_BRANCH_MAX_LENGTH,
  PURCHASE_DETAIL_MAX_LENGTH,
  PURCHASE_REGION_MAX_LENGTH,
  PURCHASE_STORE_MAX_LENGTH,
  PURCHASE_TYPE_OPTIONS,
  PURCHASE_URL_MAX_LENGTH,
  submitValuation,
  VALUATION_SCORE_OPTIONS,
} from '../valuation/data.ts'
import type { PurchaseType, ValuationScore } from '../valuation/data.ts'
import { useUserValuations } from '../valuation/useValuations.ts'
import { toHalfWidthDigits } from '../valuation/format.ts'
import { useBodyId } from '../components/useBodyId.ts'

const COMMENT_MIN_LENGTH = 10
const COMMENT_MAX_LENGTH = 2000
const PURCHASE_PRICE_MAX_LENGTH = 10
const PRODUCT_NAME_MIN_LENGTH = 3

function ValuationPostPage() {
  useBodyId('MYPAGE')
  const { userId: publicId } = useParams<{ userId: string }>()
  const { user } = useUser()
  // APIには（URLの公開用IDではなく）ClerkのユーザーIDを渡す
  const userId = user?.id
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
  // 購入場所: 種別ごとに入力欄が変わる（店舗=店名+支店名 / 自販機=場所 / ネット・通販=店名+URL / その他=内容）
  const [purchaseType, setPurchaseType] = useState<PurchaseType | ''>('')
  const [purchaseStore, setPurchaseStore] = useState('')
  const [purchaseBranch, setPurchaseBranch] = useState('')
  const [purchaseUrl, setPurchaseUrl] = useState('')
  const [purchaseRegion, setPurchaseRegion] = useState('')
  const [purchaseDetail, setPurchaseDetail] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // 投稿完了時のみ 'created' | 'updated' が入り、完了メッセージの出し分けに使う
  const [submitSuccessAction, setSubmitSuccessAction] = useState<'created' | 'updated' | null>(null)

  const { valuations, reload: reloadValuations } = useUserValuations(userId)

  // 選択中の商品について、このユーザーが投稿済みの評価（あれば1件のみ存在する）
  const existingValuation =
    selectedProduct !== null ? valuations.find((v) => v.productId === selectedProduct.id) ?? null : null
  const isEditingExisting = existingValuation !== null

  // 製品ページから ?productId=xxx 付きで遷移してきた場合、商品を事前選択する。
  // userId を渡すことで、自分が申請した商品であれば pending（承認待ち）でも取得できる。
  useEffect(() => {
    if (!preselectedProductId) {
      return
    }

    let isMounted = true
    // preselectedProductId(URLのproductIdクエリ)が変わるたびに読み込み中表示をリセットする。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingPreselected(true)
    setPreselectedError(null)

    fetchProductById(preselectedProductId, userId)
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
  }, [preselectedProductId, userId])

  // 確定済みの商品名と入力内容がずれたら選択を解除する
  useEffect(() => {
    if (selectedProduct && selectedProduct.name !== trimmedProductName) {
      setSelectedProduct(null)
    }
  }, [trimmedProductName, selectedProduct])

  // 商品選択が変わったタイミングで評価項目を同期する。
  // 既にその商品を評価済みなら投稿内容を読み込んで「修正」できるようにし、
  // 未評価ならフォームをクリアして新規投稿の状態にする。
  useEffect(() => {
    if (!selectedProduct) {
      return
    }

    if (existingValuation) {
      setScore(existingValuation.score)
      setComment(existingValuation.comment)
      setPurchasePrice(existingValuation.purchasePrice ?? '')
      setPurchaseType(existingValuation.purchaseType ?? '')
      setPurchaseStore(existingValuation.purchaseStore ?? '')
      setPurchaseBranch(existingValuation.purchaseBranch ?? '')
      setPurchaseUrl(existingValuation.purchaseUrl ?? '')
      setPurchaseRegion(existingValuation.purchaseRegion ?? '')
      setPurchaseDetail(existingValuation.purchaseDetail ?? '')
    } else {
      setScore('')
      setComment('')
      setPurchasePrice('')
      setPurchaseType('')
      setPurchaseStore('')
      setPurchaseBranch('')
      setPurchaseUrl('')
      setPurchaseRegion('')
      setPurchaseDetail('')
    }
  }, [selectedProduct, existingValuation])

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

  /** 購入場所の入力内容を検証し、問題があればエラーメッセージを返す（api/valuations.php と同じ規則） */
  const validatePurchasePlace = (): string | null => {
    if (purchaseType === 'store' || purchaseType === 'online') {
      if (purchaseStore.trim() === '') {
        return '店名を入力してください。'
      }
    }

    if (purchaseType === 'online' && purchaseUrl.trim() !== '' && !/^https?:\/\/\S+$/i.test(purchaseUrl.trim())) {
      return 'URLは http:// または https:// から始まる形式で入力してください。'
    }

    if (purchaseType === 'other' && purchaseDetail.trim() === '') {
      return '購入場所の内容を入力してください。'
    }

    return null
  }

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

    const purchasePlaceError = validatePurchasePlace()
    if (purchasePlaceError) {
      setSubmitError(purchasePlaceError)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccessAction(null)

    try {
      const result = await submitValuation({
        userId,
        productId: selectedProduct.id,
        score,
        comment,
        purchasePrice: purchasePrice || undefined,
        // 種別に関係のない入力欄の値は送らない（サーバー側でも破棄される）
        purchaseRegion: purchaseRegion.trim() || undefined,
        purchaseType: purchaseType || undefined,
        purchaseStore: purchaseType === 'store' || purchaseType === 'online' ? purchaseStore.trim() || undefined : undefined,
        purchaseBranch: purchaseType === 'store' ? purchaseBranch.trim() || undefined : undefined,
        purchaseUrl: purchaseType === 'online' ? purchaseUrl.trim() || undefined : undefined,
        purchaseDetail: purchaseType === 'other' ? purchaseDetail.trim() || undefined : undefined,
      })

      setSubmitSuccessAction(result.action)
      setProductName('')
      setSelectedProduct(null)
      setScore('')
      setComment('')
      setPurchasePrice('')
      setPurchaseType('')
      setPurchaseStore('')
      setPurchaseBranch('')
      setPurchaseUrl('')
      setPurchaseRegion('')
      setPurchaseDetail('')
      setSearchParams({}, { replace: true })
      reloadValuations()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '商品評価の投稿に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div id="l-content">
			<div id="l-breadcrumb">
				<Link to="/">HOME</Link> &gt;{' '}
				<Link to={`/mypage/${publicId}`}>マイページ</Link> &gt;{' '}
				<Link to={`/mypage/${publicId}/valuation`}>商品評価</Link> &gt;{' '}
				商品評価 投稿
			</div>

			<h1 className="heading -typeA">商品評価 投稿</h1>

      <p><Link to={`/mypage/${publicId}/valuation`} className="elem-link -typeB">評価一覧に戻る</Link></p>

			<section className="product-content">
				{isLoadingPreselected && <p className="stack-load">選択中の商品を読み込んでいます...</p>}
				{preselectedError && <p className="stack-error">{preselectedError}</p>}
				{submitSuccessAction === 'created' && (
					<>
						<p className="_mb10">評価を投稿しました。ご協力ありがとうございます。</p>
						<p><Link to={`/mypage/${publicId}`} className="elem-link -typeB">マイページに戻る</Link></p>
					</>
				)}
				{submitSuccessAction === 'updated' && (
					<>
						<p className="_mb10">評価を修正しました。ご協力ありがとうございます。</p>
						<p><Link to={`/mypage/${publicId}`} className="elem-link -typeB">マイページに戻る</Link></p>
					</>
				)}
				{submitError && <p className="stack-error">{submitError}</p>}

				{!submitSuccessAction && (
				<form className="product-form" onSubmit={handleSubmit}>
				
					<div className="stack-formRow">
						<p className="elem-label"><label htmlFor="productName"><img className="icon-required" src="/assets/img/icon-required.png" />商品名</label></p>
						<div className="elem-parts">
							<input
								id="productName"
								type="text"
								value={productName}
								onChange={handleProductNameChange}
								autoComplete="off"
								required
							/>
							<p className="elem-notes -typeA">3文字以上入力すると候補が表示されます。</p>
							{selectedProduct && isProductConfirmed && (
								<div className="stack-selectedProduct">
									{selectedProduct.photos[0] && <figure className="elem-img"><img src={`http://production-null.work/food-log${selectedProduct.photos[0]}`} alt={selectedProduct.name} /></figure>}
									<span>
										「{selectedProduct.name}
										{selectedProduct.status === 'pending' && <>（保留中）</>}」を選択中
									</span>
									{isEditingExisting && (
										<p className="elem-alert">（この商品はすでに評価済みです。内容を修正して再投稿できます。）</p>
									)}
								</div>
							)}
							{showCandidateList && (
								<>
									{isSearching && <p className="field-hint">検索中...</p>}
									{!isSearching && candidates.length === 0 && (
										<p className="field-hint">一致する商品が見つかりません。</p>
									)}
									{candidates.length > 0 && (
										<ul className="list-autocomplete">
											{candidates.map((candidate) => (
												<li
													key={candidate.id}
													className="item"
													onClick={() => handleSelectCandidate(candidate)}
												>
													{candidate.photos[0] && <img src={`http://production-null.work/food-log${candidate.photos[0]}`} alt={candidate.name} />}
													<span className="name">
														{candidate.name}
														{candidate.status === 'pending' && <>（保留中）</>}
													</span>
												</li>
											))}
										</ul>
									)}
								</>
							)}
						</div>
					</div>

					<div className="stack-formRow">
						<p className="elem-label"><img className="icon-required" src="/assets/img/icon-required.png" />評価</p>
						<div className="elem-parts stack-selectUI">
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

					<div className="stack-formRow">
						<p className="elem-label"><label htmlFor="purchasePrice">購入金額</label></p>
						<div className="elem-parts">
							<input
								id="purchasePrice"
								className="input-10em"
								type="text"
								inputMode="numeric"
								value={purchasePrice}
								onChange={handlePurchasePriceChange}
								maxLength={PURCHASE_PRICE_MAX_LENGTH}
							/>
							円
							<p className="elem-notes -typeA">数字{PURCHASE_PRICE_MAX_LENGTH}桁以内（全角数字は自動で半角に変換されます）</p>
						</div>
					</div>

					<div className="stack-formRow">
						<p className="elem-label"><label htmlFor="purchaseRegion">購入地域</label></p>
						<div className="elem-parts">
							<input
								id="purchaseRegion"
								type="text"
								value={purchaseRegion}
								onChange={(event) => setPurchaseRegion(event.target.value)}
								maxLength={PURCHASE_REGION_MAX_LENGTH}
								placeholder="例）東京都千代田区"
							/>
							<p className="elem-notes -typeA">◯◯県〇〇市〇〇区の形式で入力してください（任意）</p>
						</div>
					</div>

					<div className="stack-formRow">
						<p className="elem-label"><label htmlFor="purchaseType">購入場所</label></p>
						<div className="elem-parts">
							<select
								id="purchaseType"
								value={purchaseType}
								onChange={(event) => setPurchaseType(event.target.value as PurchaseType | '')}
							>
								<option value="">選択してください</option>
								{PURCHASE_TYPE_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>{option.label}</option>
								))}
							</select>
						</div>
					</div>

					{(purchaseType === 'store' || purchaseType === 'online') && (
						<div className="stack-formRow">
							<p className="elem-label"><label htmlFor="purchaseStore"><img className="icon-required" src="/assets/img/icon-required.png" />店名</label></p>
							<div className="elem-parts">
								<input
									id="purchaseStore"
									type="text"
									value={purchaseStore}
									onChange={(event) => setPurchaseStore(event.target.value)}
									maxLength={PURCHASE_STORE_MAX_LENGTH}
									placeholder={purchaseType === 'store' ? '例）◯×マート' : '例）◯×ネットショップ'}
								/>
							</div>
						</div>
					)}

					{purchaseType === 'store' && (
						<div className="stack-formRow">
							<p className="elem-label"><label htmlFor="purchaseBranch">支店名</label></p>
							<div className="elem-parts">
								<input
									id="purchaseBranch"
									type="text"
									value={purchaseBranch}
									onChange={(event) => setPurchaseBranch(event.target.value)}
									maxLength={PURCHASE_BRANCH_MAX_LENGTH}
									placeholder="例）東京駅店"
								/>
							</div>
						</div>
					)}

					{purchaseType === 'online' && (
						<div className="stack-formRow">
							<p className="elem-label"><label htmlFor="purchaseUrl">URL</label></p>
							<div className="elem-parts">
								<input
									id="purchaseUrl"
									type="url"
									value={purchaseUrl}
									onChange={(event) => setPurchaseUrl(event.target.value)}
									maxLength={PURCHASE_URL_MAX_LENGTH}
									placeholder="https://example.com/..."
								/>
							</div>
						</div>
					)}

					{purchaseType === 'other' && (
						<div className="stack-formRow">
							<p className="elem-label">
								<label htmlFor="purchaseDetail">
									<img className="icon-required" src="/assets/img/icon-required.png" />
									購入場所の内容
								</label>
							</p>
							<div className="elem-parts">
								<input
									id="purchaseDetail"
									type="text"
									value={purchaseDetail}
									onChange={(event) => setPurchaseDetail(event.target.value)}
									maxLength={PURCHASE_DETAIL_MAX_LENGTH}
									placeholder="例）友人からもらった、イベント会場など"
								/>
							</div>
						</div>
					)}

					<div className="stack-formRow">
						<p className="elem-label"><label htmlFor="comment"><img className="icon-required" src="/assets/img/icon-required.png" />コメント</label></p>
						<div className="elem-parts">
							<textarea
								id="comment"
								value={comment}
								onChange={(event) => setComment(event.target.value)}
								rows={4}
								required
							/>
							<p className="elem-notes -typeA">{commentLength} / {COMMENT_MAX_LENGTH}文字（{COMMENT_MIN_LENGTH}文字以上必須）</p>
						</div>
					</div>

					<div className="stack-button">
						<button type="submit" className="elem-button -typeA" disabled={isSubmitting}>
							{isSubmitting ? '送信中...' : isEditingExisting ? '評価を修正する' : '評価を投稿する'}
						</button>
					</div>
					
				</form>
				)}
				
			</section>

    </div>
  )
}

export default ValuationPostPage
