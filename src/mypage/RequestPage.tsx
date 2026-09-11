import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useCategories } from '../category/useCategories.ts'
import { isCategoryPathComplete } from '../category/data.ts'
import CategoryCascadeSelect from '../components/CategoryCascadeSelect.tsx'
import { submitProductRequest } from '../product/data.ts'

function RequestPage() {
  const { userId } = useParams<{ userId: string }>()
  const { categories, isLoading: isCategoriesLoading, error: categoriesError } = useCategories()

  const [name, setName] = useState('')
  const [category1Path, setCategory1Path] = useState<string[]>([])
  const [category2Path, setCategory2Path] = useState<string[]>([])
  const [distributor, setDistributor] = useState('')
  const [manufacturing, setManufacturing] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPhotos(event.target.files ? Array.from(event.target.files) : [])
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
      await submitProductRequest({
        userId,
        name,
        category1: category1Path[category1Path.length - 1],
        category2: category2Path.length > 0 ? category2Path[category2Path.length - 1] : undefined,
        distributor,
        manufacturing: manufacturing || undefined,
        photos,
      })

      setSubmitSuccess(true)
      setName('')
      setCategory1Path([])
      setCategory2Path([])
      setDistributor('')
      setManufacturing('')
      setPhotos([])
      form.reset()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '商品申請に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page">
      <h1 className="page__title">商品申請</h1>

      {categoriesError && <p>{categoriesError}</p>}
      {submitSuccess && <p>商品を申請しました。ご協力ありがとうございます。</p>}
      {submitError && <p>{submitError}</p>}

      <form onSubmit={handleSubmit}>
        <label htmlFor="name">商品名【必須】</label>
        <br />
        <input
          id="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <br />
        <br />

        <label htmlFor="category1">カテゴリー1【必須】</label>
        <br />
        <CategoryCascadeSelect
          idPrefix="category1"
          categories={categories}
          path={category1Path}
          onChange={setCategory1Path}
          disabled={isCategoriesLoading}
        />
        <br />

        <label htmlFor="category2">カテゴリー2</label>
        <br />
        <CategoryCascadeSelect
          idPrefix="category2"
          categories={categories}
          path={category2Path}
          onChange={setCategory2Path}
          disabled={isCategoriesLoading}
        />
        <br />

        <label htmlFor="distributor">販売会社【必須】</label>
        <br />
        <input
          id="distributor"
          type="text"
          value={distributor}
          onChange={(event) => setDistributor(event.target.value)}
          required
        />
        <br />
        <br />

        <label htmlFor="manufacturing">製造会社</label>
        <br />
        <input
          id="manufacturing"
          type="text"
          value={manufacturing}
          onChange={(event) => setManufacturing(event.target.value)}
        />
        <br />
        <br />

        <label htmlFor="photo">商品写真（複数）【必須】</label>
        <br />
        <input id="photo" type="file" accept="image/*" multiple onChange={handlePhotoChange} required />
        {photos.length > 0 && (
          <ul>
            {photos.map((photo) => (
              <li key={`${photo.name}-${photo.lastModified}`}>{photo.name}</li>
            ))}
          </ul>
        )}
        <br />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '送信中...' : '申請する'}
        </button>
      </form>
    </div>
  )
}

export default RequestPage
