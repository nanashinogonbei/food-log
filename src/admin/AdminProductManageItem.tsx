import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CategoryRecord } from '../category/data.ts'
import { getCategoryPath, isCategoryPathComplete } from '../category/data.ts'
import CategoryCascadeSelect from '../components/CategoryCascadeSelect.tsx'
import { deleteManagedProductPhoto, updateManagedProduct } from './productManage.ts'
import type { ManagedProductSummary } from './productManage.ts'

const STATUS_LABELS: Record<string, string> = {
  pending: '申請中',
  approved: '承認済み',
  rejected: '却下',
}

interface AdminProductManageItemProps {
  product: ManagedProductSummary
  categories: CategoryRecord[]
  /** カテゴリー一覧の読み込み中は、カテゴリーを送信する編集操作を無効化する */
  categoriesLoading: boolean
  adminUserId: string
  /** 更新・削除が成功したら、一覧の再取得を親に依頼する */
  onUpdated: () => void
}

/** 商品 管理画面の1件分: 商品情報（名前・カテゴリー・会社名）の編集と、写真の削除を扱う */
function AdminProductManageItem({
  product,
  categories,
  categoriesLoading,
  adminUserId,
  onUpdated,
}: AdminProductManageItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(product.name)
  // カテゴリー一覧は非同期に読み込まれるため、マウント時点ではまだ空のことがある。
  // そのため「編集を開始する時」に実際に必要になったタイミングで都度計算する。
  const [category1Path, setCategory1Path] = useState<string[]>([])
  const [category2Path, setCategory2Path] = useState<string[]>([])
  const [distributor, setDistributor] = useState(product.distributor)
  const [manufacturing, setManufacturing] = useState(product.manufacturing ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deletingPhotoId, setDeletingPhotoId] = useState<number | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const handleStartEditing = () => {
    setName(product.name)
    setCategory1Path(getCategoryPath(categories, product.category1).map((category) => category.slug))
    setCategory2Path(getCategoryPath(categories, product.category2).map((category) => category.slug))
    setDistributor(product.distributor)
    setManufacturing(product.manufacturing ?? '')
    setSaveError(null)
    setIsEditing(true)
  }

  const save = async () => {
    if (!isCategoryPathComplete(categories, category1Path)) {
      setSaveError('カテゴリー1を最後の階層まで選択してください。')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      await updateManagedProduct({
        adminUserId,
        productId: product.id,
        name,
        category1: category1Path[category1Path.length - 1],
        category2: category2Path.length > 0 ? category2Path[category2Path.length - 1] : undefined,
        distributor,
        manufacturing: manufacturing || undefined,
      })
      setIsEditing(false)
      onUpdated()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '更新に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeletePhoto = async (photoId: number) => {
    if (!window.confirm('この写真を削除しますか？削除すると元に戻せません。')) {
      return
    }

    setDeletingPhotoId(photoId)
    setPhotoError(null)

    try {
      await deleteManagedProductPhoto(adminUserId, photoId)
      onUpdated()
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : '写真の削除に失敗しました')
    } finally {
      setDeletingPhotoId(null)
    }
  }

  const isEditActionDisabled = isSaving || categoriesLoading
  const statusLabel = STATUS_LABELS[product.status] ?? product.status

  return (
    <li className="admin-product-list__item">
      <p className="admin-product-list__name">
        <Link to={`/product/${product.id}`}>{product.name}</Link>
        <span className={`product-list__status product-list__status--${product.status}`}>{statusLabel}</span>
      </p>
      <p className="admin-product-list__meta">
        販売会社: {product.distributor}
        {product.manufacturing && <> / 製造会社: {product.manufacturing}</>}
      </p>

      {product.photos.length > 0 && (
        <>
          {photoError && <p>{photoError}</p>}
          <ul className="admin-product-list__photos">
            {product.photos.map((photo) => (
              <li key={photo.id} className="admin-product-list__photo">
                <img src={`http://production-null.work/food-log${photo.url}`} alt={product.name} />
                <button
                  type="button"
                  className="admin-product-list__photo-delete"
                  onClick={() => void handleDeletePhoto(photo.id)}
                  disabled={deletingPhotoId === photo.id}
                  aria-label="この写真を削除"
                  title="この写真を削除"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {!isEditing && (
        <p>
          <button
            type="button"
            onClick={handleStartEditing}
            disabled={isEditActionDisabled}
            title={categoriesLoading ? 'カテゴリー情報を読み込み中です' : undefined}
          >
            編集する
          </button>
        </p>
      )}

      {isEditing && (
        <div className="admin-product-list__edit">
          <label htmlFor={`manage-name-${product.id}`}>商品名</label>
          <br />
          <input
            id={`manage-name-${product.id}`}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <br />
          <br />

          <label htmlFor={`manage-cat1-${product.id}`}>カテゴリー1</label>
          <br />
          <CategoryCascadeSelect
            idPrefix={`manage-cat1-${product.id}`}
            categories={categories}
            path={category1Path}
            onChange={setCategory1Path}
          />
          <br />

          <label htmlFor={`manage-cat2-${product.id}`}>カテゴリー2</label>
          <br />
          <CategoryCascadeSelect
            idPrefix={`manage-cat2-${product.id}`}
            categories={categories}
            path={category2Path}
            onChange={setCategory2Path}
          />
          <br />

          <label htmlFor={`manage-distributor-${product.id}`}>販売会社</label>
          <br />
          <input
            id={`manage-distributor-${product.id}`}
            type="text"
            value={distributor}
            onChange={(event) => setDistributor(event.target.value)}
          />
          <br />
          <br />

          <label htmlFor={`manage-manufacturing-${product.id}`}>製造会社</label>
          <br />
          <input
            id={`manage-manufacturing-${product.id}`}
            type="text"
            value={manufacturing}
            onChange={(event) => setManufacturing(event.target.value)}
          />
          <br />
          <br />

          {saveError && <p>{saveError}</p>}

          <button type="button" onClick={() => void save()} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存する'}
          </button>{' '}
          <button type="button" onClick={() => setIsEditing(false)} disabled={isSaving}>
            キャンセル
          </button>
        </div>
      )}
    </li>
  )
}

export default AdminProductManageItem
