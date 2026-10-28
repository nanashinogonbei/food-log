import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCategories } from '../category/useCategories.ts'
import { isCategoryPathComplete } from '../category/data.ts'
import CategoryCascadeSelect from '../components/CategoryCascadeSelect.tsx'
import { submitProductRequest } from '../product/data.ts'
import { useBodyId } from '../components/useBodyId.ts'

interface PhotoItem {
  id: string
  file: File
  previewUrl: string
}

const createPhotoId = (file: File) => `${file.name}-${file.size}-${file.lastModified}`

function RequestPostPage() {
  useBodyId('MYPAGE')
  const { userId } = useParams<{ userId: string }>()
  const { categories, isLoading: isCategoriesLoading, error: categoriesError } = useCategories()

  const [name, setName] = useState('')
  const [category1Path, setCategory1Path] = useState<string[]>([])
  const [category2Path, setCategory2Path] = useState<string[]>([])
  const [distributor, setDistributor] = useState('')
  const [manufacturing, setManufacturing] = useState('')
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submittedProductId, setSubmittedProductId] = useState<number | null>(null)

  const photoInputRef = useRef<HTMLInputElement>(null)
  // アンマウント時にプレビュー用URLを解放するため、最新の一覧を保持する
  const photosRef = useRef<PhotoItem[]>([])

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
    }
  }, [])

  const addPhotoFiles = (files: File[]) => {
    if (files.length === 0) {
      return
    }

    const imageFiles = files.filter((file) => file.type.startsWith('image/'))
    setPhotoError(
      imageFiles.length < files.length ? '画像ファイル以外は登録できません。' : null,
    )

    setPhotos((current) => {
      const knownIds = new Set(current.map((photo) => photo.id))
      const added: PhotoItem[] = []

      imageFiles.forEach((file) => {
        const id = createPhotoId(file)
        if (knownIds.has(id)) {
          return
        }
        knownIds.add(id)
        added.push({ id, file, previewUrl: URL.createObjectURL(file) })
      })

      return added.length > 0 ? [...current, ...added] : current
    })
  }

  const removePhoto = (id: string) => {
    photos.filter((photo) => photo.id === id).forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
    setPhotos((current) => current.filter((photo) => photo.id !== id))
  }

  const clearPhotos = () => {
    photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
    setPhotos([])
    setPhotoError(null)
  }

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    addPhotoFiles(event.target.files ? Array.from(event.target.files) : [])
    // 同じファイルを続けて選択し直せるように値をリセットする
    event.target.value = ''
  }

  const handleDropZoneDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDragging(true)
  }

  const handleDropZoneDragLeave = (event: DragEvent<HTMLDivElement>) => {
    // 子要素への移動ではハイライトを解除しない
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return
    }
    setIsDragging(false)
  }

  const handleDropZoneDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    addPhotoFiles(Array.from(event.dataTransfer.files))
  }

  const handleDropZoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      photoInputRef.current?.click()
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = event.currentTarget

    if (!userId) {
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
        <Link to={`/${userId}`}>マイページ</Link> &gt;{' '}
        <Link to={`/${userId}/request`}>商品申請</Link> &gt;{' '}
        商品申請 投稿
      </div>

      <h1 className="heading -typeA">商品申請 投稿</h1>
      <p><Link to={`/${userId}/request`} className="elem-link -typeB">申請一覧に戻る</Link></p>


			<section className="product-content">
			
				{categoriesError && <p>{categoriesError}</p>}
				{submitSuccess && (
					<>
						<p className="heading -typeD">商品を申請しました。ご協力ありがとうございます。</p>
						{submittedProductId !== null && (
							<p>
								<Link to={`/${userId}/valuation/post?productId=${submittedProductId}`} className="elem-link -typeA">
									この商品の評価を投稿する
								</Link>
							</p>
						)}
					</>
				)}
				{submitError && <p>{submitError}</p>}

				{!submitSuccess && (
				<form className="product-form" onSubmit={handleSubmit}>
					
					<div className="stack-formRow">
						<p className="elem-label"><label htmlFor="name"><img className="icon-required" src="/assets/img/icon-required.png" />商品名</label></p>
						<div className="elem-parts">
							<input
								id="name"
								type="text"
								value={name}
								onChange={(event) => setName(event.target.value)}
								required
							/>
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
						<p className="elem-label"><label htmlFor="photo">商品写真（複数）【必須】</label></p>
						<div className="elem-parts stack-photoPost">
							{photoError && <p className="photo-dropzone__error">{photoError}</p>}
							{photos.length > 0 && (
								<ul className="cluster-listThumbs">
									{photos.map((photo) => (
										<li key={photo.id} className="item">
											<img src={photo.previewUrl} alt={photo.file.name} title={photo.file.name} />
											<button
												type="button"
												className="button-remove"
												aria-label={`${photo.file.name} を削除`}
												onClick={() => removePhoto(photo.id)}
											>
												×
											</button>
										</li>
									))}
								</ul>
							)}
							<div
								className={`stack-dropzone${isDragging ? ' -active' : ''}`}
								role="button"
								tabIndex={0}
								aria-label="商品写真を選択またはドラッグ&ドロップで追加"
								onClick={() => photoInputRef.current?.click()}
								onKeyDown={handleDropZoneKeyDown}
								onDragEnter={handleDropZoneDragOver}
								onDragOver={handleDropZoneDragOver}
								onDragLeave={handleDropZoneDragLeave}
								onDrop={handleDropZoneDrop}
							>
								<img src="/assets/img/icon-img.svg" width="50px" />
								<p>ここに画像をドラッグ&amp;ドロップ<br />またはクリックしてファイルを選択</p>
								<input
									ref={photoInputRef}
									id="photo"
									className="elem-input"
									type="file"
									accept="image/*"
									multiple
									onChange={handlePhotoChange}
									onClick={(event) => event.stopPropagation()}
								/>
							</div>
						</div>

					</div>

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
