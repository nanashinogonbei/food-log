import { useUser } from '@clerk/clerk-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCategories } from '../category/useCategories.ts'
import { isCategoryPathComplete } from '../category/data.ts'
import CategoryCascadeSelect from '../components/CategoryCascadeSelect.tsx'
import PhotoPicker from '../components/PhotoPicker.tsx'
import { revokePhotoPreviews } from '../components/photoItems.ts'
import type { PhotoItem } from '../components/photoItems.ts'
import { submitProductRequest } from '../product/data.ts'
import type { ProductSummary } from '../product/data.ts'
import { useProductSearch } from '../product/useProducts.ts'
import { useBodyId } from '../components/useBodyId.ts'

function RequestPostPage() {
  useBodyId('MYPAGE')
  const { userId: publicId } = useParams<{ userId: string }>()
  const { user } = useUser()
  // APIには（URLの公開用IDではなく）ClerkのユーザーIDを渡す
  const userId = user?.id
  const navigate = useNavigate()
  const { categories, isLoading: isCategoriesLoading, error: categoriesError } = useCategories()

  const [name, setName] = useState('')
  const [category1Path, setCategory1Path] = useState<string[]>([])
  const [category2Path, setCategory2Path] = useState<string[]>([])
  const [distributor, setDistributor] = useState('')
  const [manufacturing, setManufacturing] = useState('')
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submittedProductId, setSubmittedProductId] = useState<number | null>(null)

  // 商品名が3文字以上になったら、登録済みの商品を「こちらの商品ですか？」と候補表示する（重複申請の防止）
  const { candidates } = useProductSearch(name)
  const trimmedName = name.trim()
  const hasDuplicateName = candidates.some((candidate) => candidate.name === trimmedName)

  // 商品名の入力欄（div.elem-parts）の外側をクリックしたら候補を閉じる。入力欄に触れると再び開く
  const [isCandidateOpen, setIsCandidateOpen] = useState(true)
  const nameParts = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (nameParts.current && !nameParts.current.contains(event.target as Node)) {
        setIsCandidateOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // 候補を選ぶと、その商品の評価投稿ページへ移動する
  const handleSelectCandidate = (candidate: ProductSummary) => {
    navigate(`/mypage/${publicId}/valuation/post?productId=${candidate.id}`)
  }

  // アンマウント時にプレビュー用URLを解放するため、最新の一覧を保持する
  const photosRef = useRef<PhotoItem[]>([])

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(() => {
    return () => revokePhotoPreviews(photosRef.current)
  }, [])

  const clearPhotos = () => {
    revokePhotoPreviews(photosRef.current)
    setPhotos([])
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = event.currentTarget

    if (!userId) {
      return
    }

    if (hasDuplicateName) {
      setSubmitError('同じ商品名の商品がすでに登録されています。下の候補から選択してください。')
      return
    }

    if (!isCategoryPathComplete(categories, category1Path)) {
      setSubmitError('カテゴリー1を最後の階層まで選択してください。')
      return
    }

    if (category2Path.length > 0 && !isCategoryPathComplete(categories, category2Path)) {
      setSubmitError('カテゴリー2を最後の階層まで選択するか、未選択にしてください。')
      return
    }

    if (photos.length === 0) {
      setSubmitError('商品写真を1枚以上選択してください。')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      const result = await submitProductRequest({
        userId,
        name,
        category1: category1Path[category1Path.length - 1],
        category2: category2Path.length > 0 ? category2Path[category2Path.length - 1] : undefined,
        distributor,
        manufacturing: manufacturing || undefined,
        photos: photos.map((photo) => photo.file),
      })

      setSubmitSuccess(true)
      setSubmittedProductId(result.id)
      setName('')
      setCategory1Path([])
      setCategory2Path([])
      setDistributor('')
      setManufacturing('')
      clearPhotos()
      form.reset()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '商品申請に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div id="l-content">
      <div id="l-breadcrumb">
        <Link to="/">HOME</Link> &gt;{' '}
        <Link to={`/mypage/${publicId}`}>マイページ</Link> &gt;{' '}
        <Link to={`/mypage/${publicId}/request`}>商品申請</Link> &gt;{' '}
        商品申請 投稿
      </div>

      <h1 className="heading -typeA">商品申請 投稿</h1>
      <p><Link to={`/mypage/${publicId}/request`} className="elem-link -typeA">申請一覧に戻る</Link></p>

			<section className="product-content">

				{submitSuccess && (
					<>
						<p className="heading -typeD">商品を申請しました。ご協力ありがとうございます。</p>
						{submittedProductId !== null && (
							<p>
								<Link to={`/mypage/${publicId}/valuation/post?productId=${submittedProductId}`} className="elem-link -typeA">
									この商品の評価を投稿する
								</Link>
							</p>
						)}
					</>
				)}

				{!submitSuccess && (
				<form className="product-form" onSubmit={handleSubmit}>
					
					<div className="stack-formRow">
						<p className="elem-label"><label htmlFor="name"><img className="icon-required" src="/assets/img/icon-required.png" />商品名</label></p>
						<div className="elem-parts" ref={nameParts}>
							<input
								id="name"
								type="text"
								value={name}
								onChange={(event) => {
									setName(event.target.value)
									setIsCandidateOpen(true)
								}}
								onFocus={() => setIsCandidateOpen(true)}
								autoComplete="off"
								required
							/>
								{isCandidateOpen && candidates.length > 0 && (
									<ul className="list-autocomplete">
										<p className="heading">こちらの商品ですか？</p>
										{candidates.map((candidate) => (
											<li key={candidate.id} className="item" onClick={() => handleSelectCandidate(candidate)}>
												{candidate.photos[0] && <img src={`http://production-null.work/food-log${candidate.photos[0]}`} alt={candidate.name} />}
												<span className="name">
													{candidate.name}
													{candidate.status === 'pending' && <>（保留中）</>}
													を評価する
												</span>
											</li>
										))}
									</ul>

								)}
								{hasDuplicateName && <p className="stack-error">同じ商品名の商品がすでに登録されています。</p>}
						</div>
					</div>

					<div className="stack-formRow">
						<p className="elem-label"><label htmlFor="category1"><img className="icon-required" src="/assets/img/icon-required.png" />カテゴリー1</label></p>
						<div className="elem-parts">
							<CategoryCascadeSelect
								idPrefix="category1"
								categories={categories}
								path={category1Path}
								onChange={setCategory1Path}
								disabled={isCategoriesLoading}
							/>
						</div>
					</div>

					<div className="stack-formRow">
						<p className="elem-label"><label htmlFor="category2">カテゴリー2</label></p>
						<div className="elem-parts">
							<CategoryCascadeSelect
								idPrefix="category2"
								categories={categories}
								path={category2Path}
								onChange={setCategory2Path}
								disabled={isCategoriesLoading}
							/>
						</div>
					</div>

					<div className="stack-formRow">
						<p className="elem-label"><label htmlFor="distributor"><img className="icon-required" src="/assets/img/icon-required.png" />販売会社</label></p>
						<div className="elem-parts">
							<input
								id="distributor"
								type="text"
								value={distributor}
								onChange={(event) => setDistributor(event.target.value)}
								required
							/>
						</div>
					</div>

					<div className="stack-formRow">
						<p className="elem-label"><label htmlFor="manufacturing">製造会社</label></p>
						<div className="elem-parts">
							<input
								id="manufacturing"
								type="text"
								value={manufacturing}
								onChange={(event) => setManufacturing(event.target.value)}
							/>
						</div>
					</div>

					<div className="stack-formRow">
						<p className="elem-label"><label htmlFor="photo"><img className="icon-required" src="/assets/img/icon-required.png" />商品写真（複数）</label></p>
						<PhotoPicker value={photos} onChange={setPhotos} />

					</div>

					{categoriesError && <p className="stack-error">{categoriesError}</p>}
					{submitError && <p className="stack-error">{submitError}</p>}

					<div className="stack-button">
						<button type="submit" className="elem-button -typeA" disabled={isSubmitting}>
							{isSubmitting ? '送信中...' : '申請する'}
						</button>
					</div>
					
				</form>
				)}
			</section>
			
    </div>
  )
}

export default RequestPostPage
