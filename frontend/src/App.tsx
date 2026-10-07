import { Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import NavBar from './components/NavBar'
import Footer from './components/Footer'
import ChatWidget from './components/ChatWidget'
import MatchShelf from './components/MatchShelf'
import Marquee from './components/Marquee'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetailPage from './pages/ProductDetailPage'
import About from './pages/About'
import Login from './pages/Login'
import CreateAccount from './pages/CreateAccount'

/** Router keeps scroll position between pages otherwise.
 *  Braces matter: an effect must return a cleanup function or nothing. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <div className="app">
      <ScrollToTop />
      <NavBar />
      <Marquee />
      <MatchShelf />
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:productId" element={<ProductDetailPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="*" element={<p className="state">Page not found.</p>} />
        </Routes>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
