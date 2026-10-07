import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'nav-link active' : 'nav-link'

export default function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">Campus Customs</span>
          <span className="brand-sub">Bulldog Blue</span>
        </Link>

        <nav className="nav-links">
          <NavLink to="/" className={linkClass} end>
            Home
          </NavLink>
          <NavLink to="/products" className={linkClass}>
            Products
          </NavLink>
          <NavLink to="/about" className={linkClass}>
            About Us
          </NavLink>

          {user ? (
            <>
              <span className="nav-link" aria-live="polite">
                Hi, {user.first_name}
              </span>
              <button
                className="nav-link nav-cta"
                onClick={() => {
                  logout()
                  navigate('/')
                }}
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClass}>
                Log In
              </NavLink>
              <NavLink to="/create-account" className="nav-link nav-cta">
                Create Account
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
