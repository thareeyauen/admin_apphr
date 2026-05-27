import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MdSave, MdArrowBack, MdRefresh, MdVisibility, MdVisibilityOff, MdContentCopy,
  MdLockOutline, MdClose, MdCheckCircle, MdErrorOutline,
} from 'react-icons/md'
import Layout from '../components/Layout'
import { addUser, getUsers, getAllUserIds } from '../store/store'
import { getFieldError } from '../utils/validation'
import './Users.css'

const USER_LEVELS = ['Project Level', 'Board Level', 'Director Level']
const DEPARTMENTS = [
  'Board of Directors',
  'Good Governance Research and Learning Department',
  'Collaboration and Coordination Department',
  'Accounting and Finance Department',
  'Open Data for Transparency & Participation Department',
]
const EMPTY_FORM = {
  employeeId: '', nameTh: '', nameEn: '', nicknameTh: '',
  email: '', employeeLevel: 'Project Level',
  department: '', roleTh: '', startDate: '',
  password: '',
}

function suggestEmployeeId(existingIds) {
  const set = new Set(existingIds.map((id) => id.toUpperCase()))
  const nums = existingIds
    .map((id) => { const m = id.match(/^H(\d+)$/i); return m ? parseInt(m[1], 10) : null })
    .filter((n) => n !== null)
  let next = Math.max(nums.length ? Math.max(...nums) + 1 : 47, 47)
  while (set.has('H' + String(next).padStart(4, '0'))) next++
  return 'H' + String(next).padStart(4, '0')
}

function generatePassword() {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower   = 'abcdefghjkmnpqrstuvwxyz'
  const digits  = '23456789'
  const special = '@#$!%'
  const all = upper + lower + digits + special
  const pick = (s) => s[Math.floor(Math.random() * s.length)]
  const chars = [pick(upper), pick(lower), pick(digits), pick(special)]
  for (let i = 4; i < 10; i++) chars.push(pick(all))
  return chars.sort(() => Math.random() - 0.5).join('')
}

function getInitials(name = '') {
  return name.trim().split(' ').map((w) => w[0] || '').join('').slice(0, 2).toUpperCase() || '?'
}

export default function Adduser() {
  const navigate = useNavigate()
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, password: generatePassword() }))
  const [touched, setTouched] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [existingIds, setExistingIds] = useState([])
  const [createdCredentials, setCreatedCredentials] = useState(null) // { email, password }
  const [showCreatedPw, setShowCreatedPw] = useState(false)
  const [copiedCreated, setCopiedCreated] = useState(false)

  useEffect(() => {
    getAllUserIds()
      .then((ids) => {
        const trimmed = ids.map((id) => (id || '').trim()).filter(Boolean)
        setExistingIds(trimmed)
        setForm((f) => ({ ...f, employeeId: f.employeeId || suggestEmployeeId(trimmed) }))
      })
      .catch(() => setExistingIds([]))
  }, [])

  const trimmedId = form.employeeId.trim()
  const idIsDuplicate = trimmedId !== '' && existingIds.includes(trimmedId)
  const emailError = getFieldError('email', form.email)
  const nameEnError = getFieldError('nameEn', form.nameEn)
  const canSave = !saving
    && trimmedId !== '' && !idIsDuplicate
    && form.nameTh.trim() !== ''
    && !emailError
    && !nameEnError
    && form.department !== ''
    && form.roleTh.trim() !== ''
    && form.startDate !== ''

  // Password modal state
  const [pwOpen, setPwOpen] = useState(false)
  const [pwDraft, setPwDraft] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [copied, setCopied] = useState(false)

  const openPwModal = () => {
    setPwDraft(form.password)
    setShowPw(false)
    setCopied(false)
    setPwOpen(true)
  }
  const closePwModal = () => setPwOpen(false)
  const confirmPw = () => {
    setForm((f) => ({ ...f, password: pwDraft }))
    setPwOpen(false)
  }
  const copyPassword = () => {
    navigator.clipboard.writeText(pwDraft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setSaveError('')
    const savedEmail = form.email.trim().toLowerCase()
    const savedPassword = form.password
    try {
      await addUser({ ...form, employeeId: trimmedId, initial: getInitials(form.nameEn || form.nameTh) })
      setCreatedCredentials({ email: savedEmail, password: savedPassword })
    } catch (err) {
      setSaveError(err.message || 'เกิดข้อผิดพลาด ไม่สามารถบันทึกได้')
    } finally {
      setSaving(false)
    }
  }

  const copyCreatedPassword = () => {
    navigator.clipboard.writeText(createdCredentials?.password || '')
    setCopiedCreated(true)
    setTimeout(() => setCopiedCreated(false), 2000)
  }

  const field = (key, label, type = 'text', options) => {
    const error = getFieldError(key, form[key])
    const showError = !!(touched[key] && error)
    const markTouched = () => setTouched((t) => (t[key] ? t : { ...t, [key]: true }))
    return (
      <label className="uf-field">
        <span>{label}</span>
        {options ? (
          <select
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            onBlur={markTouched}
          >
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type={type}
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            onBlur={markTouched}
            className={showError ? 'uf-input--error' : undefined}
          />
        )}
        {showError && (
          <span className="uf-error"><MdErrorOutline /> {error}</span>
        )}
      </label>
    )
  }

  return (
    <Layout title="เพิ่มพนักงาน">
      <div className="acct-header">
        <button className="acct-back" onClick={() => navigate('/users')}>
          <MdArrowBack /> กลับ
        </button>
        <div className="acct-info">
          <div className="acct-name">เพิ่มพนักงานใหม่</div>
          <div className="acct-role">กรอกข้อมูลเพื่อเพิ่มพนักงานเข้าระบบ</div>
        </div>
        <div className="acct-actions">
          <button className="btn-ghost" onClick={() => navigate('/users')}>ยกเลิก</button>
          <button className="btn-primary" onClick={handleSave} disabled={!canSave}>
            <MdSave /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="uf-error-banner"><MdErrorOutline /> {saveError}</div>
      )}

      <div className="acct-card">
        <div className="uf-grid">
          <label className="uf-field">
            <span>รหัสพนักงาน</span>
            <input
              type="text"
              value={form.employeeId}
              readOnly
              className="uf-input--readonly"
            />
          </label>
          {field('nameTh',      'ชื่อ-นามสกุล (TH) *')}
          {field('nameEn',      'ชื่อ-นามสกุล (EN)')}
          {field('nicknameTh',  'ชื่อเล่น')}
          {field('email',       'อีเมล *', 'email')}
          {field('department',  'แผนก *', 'text', ['', ...DEPARTMENTS])}
          {field('roleTh',      'ตำแหน่งงาน *')}
          {field('employeeLevel', 'ระดับพนักงาน *', 'text', USER_LEVELS)}
          {field('startDate',   'วันเริ่มงาน *', 'date')}
          <div className="uf-field uf-field--full">
            <span>รหัสผ่านเริ่มต้น</span>
            <button type="button" className="pw-set-btn" onClick={openPwModal}>
              <MdLockOutline />
              <span className="pw-set-btn-label">
                {form.password ? 'รหัสผ่านเริ่มต้น' : 'ตั้งรหัสผ่านเริ่มต้น'}
              </span>
              {form.password && (
                <span className="pw-set-btn-status"><MdCheckCircle /> ตั้งค่าแล้ว</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {pwOpen && (
        <div className="modal-overlay" onClick={closePwModal}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>ตั้งรหัสผ่านเริ่มต้น</h3>
              <button className="modal-close" onClick={closePwModal}><MdClose /></button>
            </div>
            <div className="modal-body">
              <label className="uf-field uf-field--full">
                <span>รหัสผ่าน</span>
                <div className="pw-gen-row">
                  <div className="pw-gen-input-wrap">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={pwDraft}
                      onChange={(e) => setPwDraft(e.target.value)}
                      className="pw-gen-input"
                    />
                    <button type="button" className="pw-eye" onClick={() => setShowPw((v) => !v)}>
                      {showPw ? <MdVisibilityOff /> : <MdVisibility />}
                    </button>
                  </div>
                  <button type="button" className="pw-action-btn" title="สุ่มใหม่" onClick={() => setPwDraft(generatePassword())}>
                    <MdRefresh />
                  </button>
                  <button type="button" className={'pw-action-btn' + (copied ? ' pw-action-btn--copied' : '')} title="คัดลอก" onClick={copyPassword}>
                    <MdContentCopy />
                    {copied && <span className="pw-copied-label">คัดลอกแล้ว</span>}
                  </button>
                </div>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={closePwModal}>ยกเลิก</button>
              <button className="btn-primary" onClick={confirmPw}><MdSave /> ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {/* Success: show credentials modal */}
      {createdCredentials && (
        <div className="modal-overlay">
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3><MdCheckCircle style={{ color: 'var(--green, #16a34a)', marginRight: 6 }} /> เพิ่มพนักงานสำเร็จ</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 14 }}>
                บันทึกข้อมูลเข้าสู่ระบบสำเร็จ กรุณาแจ้งข้อมูลเข้าสู่ระบบให้พนักงาน
              </p>
              <label className="uf-field uf-field--full">
                <span>อีเมล</span>
                <div className="pw-gen-row">
                  <div className="pw-gen-input-wrap" style={{ flex: 1 }}>
                    <input type="text" value={createdCredentials.email} readOnly className="pw-gen-input" />
                  </div>
                </div>
              </label>
              <label className="uf-field uf-field--full" style={{ marginTop: 10 }}>
                <span>รหัสผ่านเริ่มต้น</span>
                <div className="pw-gen-row">
                  <div className="pw-gen-input-wrap">
                    <input
                      type={showCreatedPw ? 'text' : 'password'}
                      value={createdCredentials.password}
                      readOnly
                      className="pw-gen-input"
                    />
                    <button type="button" className="pw-eye" onClick={() => setShowCreatedPw((v) => !v)}>
                      {showCreatedPw ? <MdVisibilityOff /> : <MdVisibility />}
                    </button>
                  </div>
                  <button type="button" className={'pw-action-btn' + (copiedCreated ? ' pw-action-btn--copied' : '')} title="คัดลอก" onClick={copyCreatedPassword}>
                    <MdContentCopy />
                    {copiedCreated && <span className="pw-copied-label">คัดลอกแล้ว</span>}
                  </button>
                </div>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => navigate('/users')}>ตกลง</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
