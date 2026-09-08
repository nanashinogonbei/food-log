import { Route, Routes } from 'react-router-dom'
import './App.css'
import Header from './components/Header.tsx'
import RequireAuth from './components/RequireAuth.tsx'
import TopPage from './pages/TopPage.tsx'
import CategoryListPage from './pages/CategoryListPage.tsx'
import CategoryPage from './pages/CategoryPage.tsx'
import ProductPage from './pages/ProductPage.tsx'
import MyPage from './pages/MyPage.tsx'
import RequestPage from './pages/RequestPage.tsx'
import ValuationPage from './pages/ValuationPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'

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

export default App
