import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-cols">
          <div>
            <h4>Campus Customs</h4>
            <p style={{ margin: 0 }}>
              57 Broadway
              <br />
              New Haven, CT 06511
            </p>
            <p style={{ marginBottom: 0 }}>Open seven days a week, right across from campus.</p>
          </div>
          <div>
            <h4>Shop</h4>
            <p style={{ margin: 0 }}>
              <Link to="/products">All Products</Link>
              <br />
              <Link to="/products?category=Hoodies">Hoodies</Link>
              <br />
              <Link to="/products?category=Crewnecks">Crewnecks</Link>
              <br />
              <Link to="/products?category=T-Shirts">T-Shirts</Link>
            </p>
          </div>
          <div>
            <h4>Visit</h4>
            <p style={{ margin: 0 }}>
              <Link to="/about">Our Story</Link>
              <br />
              <Link to="/login">Log In</Link>
              <br />
              <Link to="/create-account">Create Account</Link>
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          Officially licensed Yale University merchandise. Printed and stitched in New Haven since
          1975. &nbsp;·&nbsp; Student project for MGT 409.
        </div>
      </div>
    </footer>
  )
}
