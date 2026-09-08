import { Route, Routes } from 'react-router-dom'
import './App.css'
import Header from './components/Header.tsx'
import TopPage from './pages/TopPage.tsx'
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
        {/* カテゴリーページ */}
        <Route path="/category/:categoryId" element={<CategoryPage />} />
        {/* 詳細ページ */}
        <Route path="/product/:productId" element={<ProductPage />} />
        {/* マイページ */}
        <Route path="/:userId" element={<MyPage />} />
        {/* 商品申請 */}
        <Route path="/:userId/request" element={<RequestPage />} />
        {/* 商品評価 */}
        <Route path="/:userId/valuation" element={<ValuationPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default App
