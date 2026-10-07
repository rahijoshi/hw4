import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, signup } from '../api'
import { useAuth } from '../auth'

export default function CreateAccount() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.firstName.trim() || !form.lastName.trim()) return setError('Tell us your name.')
    if (!form.email.includes('@')) return setError('That does not look like an email address.')
    if (form.password.length < 8) return setError('Use at least 8 characters for your password.')
    if (form.password !== form.confirm) return setError('The two passwords do not match.')

    setSubmitting(true)
    try {
      const user = await signup({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email,
        password: form.password,
        confirm_password: form.confirm,
      })
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
            Join the shop
          </p>
          <h1 style={{ fontSize: '1.8rem', textAlign: 'center' }}>Create an account</h1>
          <p
            style={{
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: '0.92rem',
              marginBottom: '1.8rem',
            }}
          >
            Keep your conversations with the assistant, and skip retyping your details.
          </p>

          {error && <div className="notice">{error}</div>}

          <form onSubmit={onSubmit}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="firstName">First name</label>
                <input id="firstName" value={form.firstName} onChange={set('firstName')} />
              </div>
              <div className="field">
                <label htmlFor="lastName">Last name</label>
                <input id="lastName" value={form.lastName} onChange={set('lastName')} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="newEmail">Email</label>
              <input
                id="newEmail"
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="you@yale.edu"
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="newPassword">Password</label>
              <input
                id="newPassword"
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                type="password"
                value={form.confirm}
                onChange={set('confirm')}
                autoComplete="new-password"
              />
            </div>
            <button className="btn btn-block" type="submit" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="form-note">
            Already have one? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </section>
  )
}
