// TODO: 実データ取得(API/DB)に置き換える

export interface SubCategory {
  id: string
  name: string
  products: { id: string; name: string }[]
}

export interface Category {
  id: string
  name: string
  subCategories: SubCategory[]
}

export const categories: Category[] = [
  {
    id: 'drink',
    name: '飲料',
    subCategories: [
      {
        id: 'soda',
        name: '清涼飲料',
        products: [
          { id: '1', name: 'サイダーA' },
          { id: '2', name: 'コーラB' },
        ],
      },
      {
        id: 'tea',
        name: 'お茶',
        products: [
          { id: '3', name: '緑茶C' },
          { id: '4', name: '烏龍茶D' },
        ],
      },
      {
        id: 'coffee',
        name: 'コーヒー',
        products: [
          { id: '5', name: 'ブラックコーヒーE' },
          { id: '6', name: 'カフェオレF' },
        ],
      },
    ],
  },
  {
    id: 'sweets',
    name: 'スイーツ',
    subCategories: [
      {
        id: 'chocolate',
        name: 'チョコレート',
        products: [{ id: '7', name: '板チョコG' }],
      },
      {
        id: 'cookie',
        name: 'クッキー',
        products: [{ id: '8', name: 'クッキーH' }],
      },
    ],
  },
  {
    id: 'snack',
    name: 'スナック',
    subCategories: [
      {
        id: 'potato',
        name: 'ポテト系',
        products: [{ id: '9', name: 'ポテトチップスI' }],
      },
    ],
  },
]

export function findCategory(categoryId: string | undefined) {
  return categories.find((category) => category.id === categoryId)
}

export function findSubCategory(categoryId: string | undefined, subCategoryId: string | undefined) {
  return findCategory(categoryId)?.subCategories.find((subCategory) => subCategory.id === subCategoryId)
}
