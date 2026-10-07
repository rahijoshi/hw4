import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, login as loginRequest } from '../api'
import { useAuth } from '../auth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.includes('@')) return setError('That does not look like an email address.')
    if (!password) return setError('Enter your password.')

    setSubmitting(true)
    try {
      const user = await loginRequest({ email, password })
      login(user)
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the shop API.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="section">
      <div className="container">
        <div className="form-card">
          <p className="eyebrow" style={{ textAlign: 'center' }}>
            Welcome back
          </p>
          <h1 style={{ fontSize: '1.8rem', textAlign: 'center' }}>Log in</h1>
          <p
            style={{
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: '0.92rem',
              marginBottom: '1.8rem',
            }}
          >
            So the shop assistant knows who it is talking to.
          </p>

          {error && <div className="notice">{error}</div>}

          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yale.edu"
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <button className="btn btn-block" type="submit" disabled={submitting}>
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="form-note">
            New here? <Link to="/create-account">Create an account</Link>
          </p>
        </div>
      </div>
    </section>
  )
}
