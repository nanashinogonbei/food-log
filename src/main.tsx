import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { jaJP } from '@clerk/localizations'
import './index.css'
import './App.css'
import Header from './components/Header.tsx'
import RequireAuth from './components/RequireAuth.tsx'
import CategoryListPage from './category/CategoryListPage.tsx'
import CategoryPage from './category/CategoryPage.tsx'
import SubCategoryPage from './category/SubCategoryPage.tsx'
import { useCategories } from './category/useCategories.ts'
import { getMainCategories } from './category/data.ts'
import ProductPage from './product/ProductPage.tsx'
import MyPage from './mypage/MyPage.tsx'
import RequestPage from './mypage/RequestPage.tsx'
import ValuationPage from './mypage/ValuationPage.tsx'
import NotFoundPage from './NotFoundPage.tsx'

// TODO: 実データ取得(API/DB)に置き換える
const products = [
  { id: '1', name: '商品A' },
  { id: '2', name: '商品B' },
  { id: '3', name: '商品C' },
]

// トップページ (/)
function TopPage() {
  const { categories, isLoading, error } = useCategories()
  const mainCategories = getMainCategories(categories)

  return (
    <div className="page">
      <h1 className="page__title">トップページ</h1>
      <p>不特定多数が商品を評価するコミュニティサイトです。</p>

      <h2>
        カテゴリーから探す <Link to="/category">（一覧を見る）</Link>
      </h2>
      {isLoading && <p>読み込み中...</p>}
      {error && <p>{error}</p>}
      <div className="card-grid">
        {mainCategories.map((category) => (
          <Link key={category.slug} to={`/category/${category.slug}`}>
            {category.label}
          </Link>
        ))}
      </div>

      <h2>注目の商品</h2>
      <div className="card-grid">
        {products.map((product) => (
          <Link key={product.id} to={`/product/${product.id}`}>
            {product.name}
          </Link>
        ))}
      </div>
    </div>
  )
}

function App() {
  return (
    <>
      <Header />
      <Routes>
        {/* トップページ */}
        <Route path="/" element={<TopPage />} />
        {/* カテゴリー一覧ページ */}
        <Route path="/category" element={<CategoryListPage />} />
        {/* カテゴリーページ */}
        <Route path="/category/:categoryId" element={<CategoryPage />} />
        {/* 小カテゴリーページ */}
        <Route path="/category/:categoryId/:subCategoryId" element={<SubCategoryPage />} />
        {/* 詳細ページ */}
        <Route path="/product/:productId" element={<ProductPage />} />
        {/* マイページ（要ログイン） */}
        <Route
          path="/:userId"
          element={
            <RequireAuth>
              <MyPage />
            </RequireAuth>
          }
        />
        {/* 商品申請（要ログイン） */}
        <Route
          path="/:userId/request"
          element={
            <RequireAuth>
              <RequestPage />
            </RequireAuth>
          }
        />
        {/* 商品評価（要ログイン） */}
        <Route
          path="/:userId/valuation"
          element={
            <RequireAuth>
              <ValuationPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} localization={jaJP}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
