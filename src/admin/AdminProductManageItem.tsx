import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CategoryRecord } from '../category/data.ts'
import { getCategoryPath, isCategoryPathComplete } from '../category/data.ts'
import CategoryCascadeSelect from '../components/CategoryCascadeSelect.tsx'
import { deleteManagedProductPhoto, updateManagedProduct } from './productManage.ts'
import type { ManagedProductSummary } from './productManage.ts'

// 商品 管理で切り替えられるのは公開(approved)/非公開(private)のみ
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'approved', label: '公開' },
  { value: 'private', label: '非公開' },
]

const STATUS_LABELS: Record<string, string> = {
  pending: '申請中',
  approved: '公開',
  private: '非公開',
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
  const [status, setStatus] = useState(product.status)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deletingPhotoId, setDeletingPhotoId] = useState<number | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const itemRef = useRef<HTMLLIElement>(null)

  /** キャンセル: 編集フォームを閉じ、この .item の位置までスクロールする */
  const handleCancelEditing = () => {
    setIsEditing(false)
    // フォームが閉じて高さが変わった後の位置で計算するため、描画後に実行する
    requestAnimationFrame(() => {
      const item = itemRef.current
      if (!item) {
        return
      }
      // 固定ヘッダーに隠れないよう、ヘッダーの高さ分だけ手前にずらす
      const headerHeight = document.getElementById('l-header')?.offsetHeight ?? 0
      const top = item.getBoundingClientRect().top + window.scrollY - headerHeight
      window.scrollTo({ top, behavior: 'smooth' })
    })
  }

  const handleStartEditing = () => {
    setName(product.name)
    setCategory1Path(getCategoryPath(categories, product.category1).map((category) => category.slug))
    setCategory2Path(getCategoryPath(categories, product.category2).map((category) => category.slug))
    setDistributor(product.distributor)
    setManufacturing(product.manufacturing ?? '')
    setSaveError(null)
    setStatus(product.status)
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
    <li className="item" ref={itemRef}>
			<div className="inner">
				<p className="elem-name">
					<Link to={`/product/${product.id}`}>{product.name}</Link>
					<span className={`elem-status -${product.status}`}>（{statusLabel}）</span>
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
							<p className="elem-label"><label htmlFor={`manage-name-${product.id}`}>商品名</label></p>
							<div className="elem-parts">
								<input
									id={`manage-name-${product.id}`}
									type="text"
									value={name}
									onChange={(event) => setName(event.target.value)}
								/>
							</div>
						</div>

						<div className="stack-formRow">
							<p className="elem-label"><label htmlFor={`manage-cat1-${product.id}`}>カテゴリー1</label></p>
							<div className="elem-parts">
								<CategoryCascadeSelect
									idPrefix={`manage-cat1-${product.id}`}
									categories={categories}
									path={category1Path}
									onChange={setCategory1Path}
								/>
							</div>
						</div>

						<div className="stack-formRow">
							<p className="elem-label"><label htmlFor={`manage-cat2-${product.id}`}>カテゴリー2</label></p>
							<div className="elem-parts">
								<CategoryCascadeSelect
									idPrefix={`manage-cat2-${product.id}`}
									categories={categories}
									path={category2Path}
									onChange={setCategory2Path}
								/>
							</div>
						</div>

						<div className="stack-formRow">
							<p className="elem-label"><label htmlFor={`manage-distributor-${product.id}`}>販売会社</label></p>
							<div className="elem-parts">
								<input
									id={`manage-distributor-${product.id}`}
									type="text"
									value={distributor}
									onChange={(event) => setDistributor(event.target.value)}
								/>
							</div>
						</div>

						<div className="stack-formRow">
							<p className="elem-label"><label htmlFor={`manage-manufacturing-${product.id}`}>製造会社</label></p>
							<div className="elem-parts">
								<input
									id={`manage-manufacturing-${product.id}`}
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
					<button type="button" className="elem-button -typeA" onClick={handleCancelEditing} disabled={isSaving}>
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
						編集する
					</button>
				</div>
			)}
    </li>
  )
}

export default AdminProductManageItem
