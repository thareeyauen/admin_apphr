import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdVisibility, MdVisibilityOff } from 'react-icons/md'
import { login } from '../store/store'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const session = login(email.trim(), password)
    if (session) {
      navigate('/dashboard')
    } else {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo">HR</span>
          <div>
            <p className="login-app">AppHR</p>
            <p className="login-sub">Admin Panel</p>
          </div>
        </div>

        <h2>เข้าสู่ระบบแอดมิน</h2>
        <p className="login-desc">สำหรับผู้ดูแลระบบเท่านั้น</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span>อีเมล</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@apphr.test"
              required
            />
          </label>
          <label className="login-field">
            <span>รหัสผ่าน</span>
            <div className="login-pw-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button type="button" className="login-pw-eye" onClick={() => setShowPw((v) => !v)}>
                {showPw ? <MdVisibilityOff /> : <MdVisibility />}
              </button>
            </div>
          </label>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-submit">เข้าสู่ระบบ</button>
        </form>
      </div>
    </div>
  )
}
