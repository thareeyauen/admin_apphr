import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MdSave, MdArrowBack, MdRefresh, MdVisibility, MdVisibilityOff, MdContentCopy,
  MdLockOutline, MdClose, MdCheckCircle, MdErrorOutline,
} from 'react-icons/md'
import Layout from '../components/Layout'
import { addUser, getUsers } from '../store/store'
import './Users.css'

const USER_LEVELS = ['Project Level', 'Board Level', 'Director Level']
const EMPTY_FORM = {
  nameTh: '', nicknameTh: '', employeeId: '', email: '', employeeLevel: 'Project Level', password: '',
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
  const [saving, setSaving] = useState(false)
  const [existingIds, setExistingIds] = useState([])

  useEffect(() => {
    getUsers()
      .then((users) => setExistingIds(users.map((u) => (u.employeeId || '').trim())))
      .catch(() => setExistingIds([]))
  }, [])

  const trimmedId = form.employeeId.trim()
  const idIsDuplicate = trimmedId !== '' && existingIds.includes(trimmedId)
  const canSave = !saving && form.nameTh.trim() !== '' && trimmedId !== '' && !idIsDuplicate

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
    try {
      await addUser({ ...form, employeeId: trimmedId, initial: getInitials(form.nameEn || form.nameTh) })
      navigate('/users')
    } finally {
      setSaving(false)
    }
  }

  const field = (key, label, type = 'text', options) => (
    <label className="uf-field">
      <span>{label}</span>
      {options ? (
        <select value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
      )}
    </label>
  )

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

      <div className="acct-card">
        <div className="uf-grid">
          <label className="uf-field">
            <span>รหัสพนักงาน</span>
            <input
              type="text"
              value={form.employeeId}
              onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
              className={idIsDuplicate ? 'uf-input--error' : ''}
            />
            {idIsDuplicate && (
              <span className="uf-error"><MdErrorOutline /> รหัสพนักงานนี้มีในระบบแล้ว</span>
            )}
          </label>
          {field('nameTh', 'ชื่อ-นามสกุล')}
          {field('nicknameTh', 'ชื่อเล่น')}
          {field('email', 'อีเมล', 'email')}
          {field('employeeLevel', 'ระดับการเข้าถึง', 'text', USER_LEVELS)}
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
    </Layout>
  )
}
