import type { CategoryRecord } from '../category/data.ts'
import { getChildCategories } from '../category/data.ts'

interface CategoryCascadeSelectProps {
  /** 先頭(1階層目)の <select> に付与するid。ラベルのhtmlForと対応させる */
  idPrefix: string
  categories: CategoryRecord[]
  /** 選択済みのslugを大→中→小→細区分の順に並べたもの */
  path: string[]
  onChange: (path: string[]) => void
  disabled?: boolean
  /** 最大階層数（大/中/小/細区分の4階層） */
  maxLevels?: number
}

/**
 * 大→中→小→細区分の最大4階層のカテゴリーを、選択済みの階層に応じて
 * プルダウンを1つずつ追加表示しながら選択させるコンポーネント。
 * 子カテゴリーが存在しない階層まで選択し終えたら、それ以上プルダウンは表示しない。
 */
function CategoryCascadeSelect({
  idPrefix,
  categories,
  path,
  onChange,
  disabled = false,
  maxLevels = 4,
}: CategoryCascadeSelectProps) {
  const levels: { options: CategoryRecord[]; value: string }[] = []
  let parentSlug: string | null = null

  for (let level = 0; level < maxLevels; level++) {
    const options = getChildCategories(categories, parentSlug)

    if (options.length === 0) {
      break
    }

    const value = path[level] ?? ''
    levels.push({ options, value })

    if (!value) {
      break
    }

    parentSlug = value
  }

  const handleChange = (level: number, value: string) => {
    // 上位階層を変更した場合、対応しなくなった下位階層の選択は破棄する
    const next = path.slice(0, level)
    if (value) {
      next.push(value)
    }
    onChange(next)
  }

  return (
    <div className="category-cascade">
      {levels.map((levelInfo, level) => (
        <select
          key={`${idPrefix}-${level}`}
          id={level === 0 ? idPrefix : undefined}
          value={levelInfo.value}
          onChange={(event) => handleChange(level, event.target.value)}
          disabled={disabled}
        >
          <option value="">選択してください</option>
          {levelInfo.options.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      ))}
    </div>
  )
}

export default CategoryCascadeSelect
