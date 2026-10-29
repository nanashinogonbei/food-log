import { useState } from 'react'
import type { CategoryRecord } from '../category/data.ts'
import { getCategoryPath, isCategoryPathComplete } from '../category/data.ts'
import CategoryCascadeSelect from '../components/CategoryCascadeSelect.tsx'
import { deleteAdminProductPhoto, updateAdminProduct } from './productApproval.ts'
import type { AdminProductStatus, AdminProductSummary } from './productApproval.ts'

const STATUS_OPTIONS: { value: AdminProductStatus; label: string }[] = [
  { value: 'approved', label: '承認済み' },
  { value: 'rejected', label: '却下' },
]

const STATUS_LABELS: Record<string, string> = {
  pending: '申請中',
  approved: '承認済み',
  rejected: '却下',
}

interface AdminProductApprovalItemProps {
  product: AdminProductSummary
  categories: CategoryRecord[]
  /** カテゴリー一覧の読み込み中は、カテゴリーを送信する編集操作を無効化する */
  categoriesLoading: boolean
  adminUserId: string
  /** 更新・削除が成功したら、一覧の再取得を親に依頼する */
  onUpdated: () => void
}

/** 商品申請 管理画面の1件分: 確認表示、編集フォーム、不適切な写真の削除を扱う */
function AdminProductApprovalItem({ product, categories, categoriesLoading, adminUserId, onUpdated }: AdminProductApprovalItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(product.name)
  // カテゴリー一覧は非同期に読み込まれるため、マウント時点ではまだ空のことがある。
  // そのためcategory1Path/category2Pathはここでは同期保持せず、
  // 「編集を開始する時」に実際に必要になったタイミングで都度計算する
  // （categoriesLoading中は編集ボタンを無効化して保護する）。
  const [category1Path, setCategory1Path] = useState<string[]>([])
  const [category2Path, setCategory2Path] = useState<string[]>([])
  const [distributor, setDistributor] = useState(product.distributor)
  const [manufacturing, setManufacturing] = useState(product.manufacturing ?? '')
  const [status, setStatus] = useState<AdminProductStatus>(product.status as AdminProductStatus)
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
    setStatus(product.status as AdminProductStatus)
    setSaveError(null)
    setIsEditing(true)
  }

  const save = async () => {
    if (status === 'pending') {
      setSaveError('承認または却下を選択してください。')
      return
    }

    const isRejecting = status === 'rejected'

    // 却下する場合は、カテゴリーが正しく選択されているかを気にする必要がないため、
    // 選択状態のチェックをスキップし、登録済みのカテゴリーをそのまま使って更新する。
    if (!isRejecting && !isCategoryPathComplete(categories, category1Path)) {
      setSaveError('カテゴリー1を最後の階層まで選択してください。')
      return
    }

    const category1Value = isRejecting ? (product.category1 ?? '') : category1Path[category1Path.length - 1]
    const category2Value = isRejecting
      ? (product.category2 ?? undefined)
      : category2Path.length > 0
        ? category2Path[category2Path.length - 1]
        : undefined

    setIsSaving(true)
    setSaveError(null)

    try {
      await updateAdminProduct({
        adminUserId,
        productId: product.id,
        name,
        category1: category1Value,
        category2: category2Value,
        distributor,
        manufacturing: manufacturing || undefined,
        status,
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
      await deleteAdminProductPhoto(adminUserId, photoId)
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
    <li className="item">
			<div className="inner">
				<p className="elem-name">
					{product.name}
					<span className={`elem-status -${product.status}`}>（{statusLabel}）</span>
				</p>
				<p className="elem-metaUser">
					申請者: {product.requestedBy} / 申請日: {product.createdAt}
				</p>
				<p className="elem-metaCompany">
					販売会社: {product.distributor}
					{product.manufacturing && <> / 製造会社: {product.manufacturing}</>}
				</p>
				{product.photos.length > 0 && (
					<>
						{photoError && <p>{photoError}</p>}
						<ul className="stack-photos">
							{product.photos.map((photo) => (
								<li key={photo.id} className="item">
									<img src={`http://production-null.work/food-log${photo.url}`} alt={product.name} />
									<button
										type="button"
										className="button-remove"
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

				{isEditing && (
					<div className="product-form">
						<div className="stack-formRow">
							<p className="elem-label"><label htmlFor={`admin-name-${product.id}`}>商品名</label></p>
							<div className="elem-parts">
								<input
									id={`admin-name-${product.id}`}
									type="text"
									value={name}
									onChange={(event) => setName(event.target.value)}
								/>
							</div>
						</div>

						<div className="stack-formRow">
							<p className="elem-label"><label htmlFor={`admin-cat1-${product.id}`}>カテゴリー1</label></p>
							<div className="elem-parts">
								<CategoryCascadeSelect
									idPrefix={`admin-cat1-${product.id}`}
									categories={categories}
									path={category1Path}
									onChange={setCategory1Path}
								/>
							</div>
						</div>

						<div className="stack-formRow">
							<p className="elem-label"><label htmlFor={`admin-cat2-${product.id}`}>カテゴリー2</label></p>
							<div className="elem-parts">
								<CategoryCascadeSelect
									idPrefix={`admin-cat2-${product.id}`}
									categories={categories}
									path={category2Path}
									onChange={setCategory2Path}
								/>
							</div>
						</div>

						<div className="stack-formRow">
							<p className="elem-label"><label htmlFor={`admin-distributor-${product.id}`}>販売会社</label></p>
							<div className="elem-parts">
								<input
									id={`admin-distributor-${product.id}`}
									type="text"
									value={distributor}
									onChange={(event) => setDistributor(event.target.value)}
								/>
							</div>
						</div>

						<div className="stack-formRow">
							<p className="elem-label"><label htmlFor={`admin-manufacturing-${product.id}`}>製造会社</label></p>
							<div className="elem-parts">
								<input
									id={`admin-manufacturing-${product.id}`}
									type="text"
									value={manufacturing}
									onChange={(event) => setManufacturing(event.target.value)}
								/>
							</div>
						</div>

						<div className="stack-formRow">
							<p className="elem-label">ステータス</p>
							<div className="elem-parts" role="group" aria-label="ステータス">
								{STATUS_OPTIONS.map((option) => (
									<button
										key={option.value}
										type="button"
										className={`elem-button -typeA${status === option.value ? ' -active' : ''}`}
										onClick={() => setStatus(option.value)}
										disabled={isSaving}
										aria-pressed={status === option.value}
									>
										{option.label}
									</button>
								))}
							</div>
						</div>

						{saveError && <p className="stack-error">{saveError}</p>}

					</div>
				)}
			
			</div>

			{isEditing && (
				<div className="stack-button">
					<button type="button" className="elem-button -typeA" onClick={() => void save()} disabled={isSaving}>
						{isSaving ? '保存中...' : '保存する'}
					</button>{' '}
					<button type="button" className="elem-button -typeA" onClick={() => setIsEditing(false)} disabled={isSaving}>
						キャンセル
					</button>
				</div>
			)}			
      {!isEditing && (
        <div className="stack-button">
          <button
            type="button"
						className="elem-button -typeA"
            onClick={handleStartEditing}
            disabled={isEditActionDisabled}
            title={categoriesLoading ? 'カテゴリー情報を読み込み中です' : undefined}
          >
            確認・編集する
          </button>
        </div>
      )}
			
    </li>
  )
}

export default AdminProductApprovalItem
