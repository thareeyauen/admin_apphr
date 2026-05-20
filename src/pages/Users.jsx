import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MdAdd, MdDelete, MdSearch, MdClose, MdSave,
  MdAccountCircle, MdRefresh, MdVisibility, MdVisibilityOff, MdContentCopy,
  MdLockReset,
} from 'react-icons/md'
import Layout from '../components/Layout'
import { getUsers, addUser, updateUser, deleteUser } from '../store/store'
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

export default function Users() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    getUsers().then(setUsers).catch(() => setUsers([]))
  }, [])
  const [modal, setModal] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showPw, setShowPw] = useState(false)
  const [copied, setCopied] = useState(false)

  // Reset password modal state
  const [resetPw, setResetPw] = useState(null) // { id, name, password }
  const [showResetPw, setShowResetPw] = useState(false)
  const [copiedReset, setCopiedReset] = useState(false)

  const filtered = users.filter((u) => {
    const q = query.toLowerCase()
    if (!q) return true
    const nameTh = (u.nameTh || '').toLowerCase()
    const empId = (u.employeeId || '').toLowerCase()
    const dept = (u.department || '').toLowerCase()
    return nameTh.includes(q) || empId.includes(q) || dept.includes(q)
  })

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, password: generatePassword() })
    setShowPw(false)
    setCopied(false)
    setModal({ mode: 'add' })
  }
  const copyPassword = () => {
    navigator.clipboard.writeText(form.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const closeModal = () => setModal(null)
  const handleSave = async () => {
    if (!form.nameTh.trim() || !form.employeeId.trim()) return
    const next = await addUser({ ...form, initial: getInitials(form.nameEn || form.nameTh) })
    setUsers(next)
    closeModal()
  }
  const handleDeleteUser = async () => {
    const next = await deleteUser(toDelete)
    setUsers(next)
    setToDelete(null)
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

  const openResetPw = (u) => {
    setResetPw({ id: u.id, name: u.nameTh, password: generatePassword() })
    setShowResetPw(false)
    setCopiedReset(false)
  }
  const copyResetPassword = () => {
    navigator.clipboard.writeText(resetPw.password)
    setCopiedReset(true)
    setTimeout(() => setCopiedReset(false), 2000)
  }
  const confirmReset = async () => {
    const next = await updateUser(resetPw.id, { password: resetPw.password })
    setUsers(next)
    setResetPw(null)
  }

  return (
    <Layout title="จัดการพนักงาน">
      <div className="users-toolbar">
        <div className="users-search">
          <MdSearch />
          <input placeholder="ค้นหาชื่อ, รหัส, แผนก..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={openAdd}><MdAdd /> เพิ่มพนักงาน</button>
      </div>

      <div className="users-card">
        <table className="users-table">
          <thead>
            <tr>
              <th>พนักงาน</th><th>รหัส</th><th>ตำแหน่ง / แผนก</th>
              <th>ระดับ</th><th>วันที่เริ่ม</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="user-name-cell">
                    <span className="user-avatar">{u.initial || getInitials(u.nameEn || u.nameTh)}</span>
                    <div>
                      <p className="user-name-th">{u.nameTh}</p>
                      <p className="user-name-en">{u.nameEn}</p>
                    </div>
                  </div>
                </td>
                <td className="td-mono">{u.employeeId}</td>
                <td><p>{u.role}</p><p className="td-sub">{u.department}</p></td>
                <td><span className={`level-badge level-badge--${u.employeeLevel.replace(' ', '-').toLowerCase()}`}>{u.employeeLevel}</span></td>
                <td className="td-sub">{u.startDate}</td>
                <td>
                  <div className="row-actions">
                    <button className="act-btn act-btn--acct" title="ดูข้อมูล Account" onClick={() => navigate('/users/' + u.employeeId)}><MdAccountCircle /></button>
                    <button className="act-btn act-btn--edit" title="Reset Password" onClick={() => openResetPw(u)}><MdLockReset /></button>
                    <button className="act-btn act-btn--del"  onClick={() => setToDelete(u.id)}><MdDelete /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="table-empty">ไม่พบพนักงาน</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Add employee modal */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>เพิ่มพนักงาน</h3>
              <button className="modal-close" onClick={closeModal}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div className="uf-grid">
                {field('employeeId', 'รหัสพนักงาน')}
                {field('nameTh', 'ชื่อ-นามสกุล')}
                {field('nicknameTh', 'ชื่อเล่น')}
                {field('email', 'อีเมล', 'email')}
                {field('employeeLevel', 'ระดับการเข้าถึง', 'text', USER_LEVELS)}
                <label className="uf-field uf-field--full">
                  <span>รหัสผ่านเริ่มต้น</span>
                  <div className="pw-gen-row">
                    <div className="pw-gen-input-wrap">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                        className="pw-gen-input"
                      />
                      <button type="button" className="pw-eye" onClick={() => setShowPw((v) => !v)}>
                        {showPw ? <MdVisibilityOff /> : <MdVisibility />}
                      </button>
                    </div>
                    <button type="button" className="pw-action-btn" title="สุ่มใหม่" onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}>
                      <MdRefresh />
                    </button>
                    <button type="button" className={'pw-action-btn' + (copied ? ' pw-action-btn--copied' : '')} title="คัดลอก" onClick={copyPassword}>
                      <MdContentCopy />
                      {copied && <span className="pw-copied-label">คัดลอกแล้ว</span>}
                    </button>
                  </div>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" onClick={handleSave}><MdSave /> บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetPw && (
        <div className="modal-overlay" onClick={() => setResetPw(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Reset Password</h3>
              <button className="modal-close" onClick={() => setResetPw(null)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '14px', color: 'var(--ink-2)', fontSize: '14px' }}>
                รีเซ็ตรหัสผ่านสำหรับ <strong style={{ color: 'var(--ink-1)' }}>{resetPw.name}</strong>
              </p>
              <label className="uf-field uf-field--full">
                <span>รหัสผ่านใหม่</span>
                <div className="pw-gen-row">
                  <div className="pw-gen-input-wrap">
                    <input
                      type={showResetPw ? 'text' : 'password'}
                      value={resetPw.password}
                      onChange={(e) => setResetPw((r) => ({ ...r, password: e.target.value }))}
                      className="pw-gen-input"
                    />
                    <button type="button" className="pw-eye" onClick={() => setShowResetPw((v) => !v)}>
                      {showResetPw ? <MdVisibilityOff /> : <MdVisibility />}
                    </button>
                  </div>
                  <button type="button" className="pw-action-btn" title="สุ่มใหม่" onClick={() => setResetPw((r) => ({ ...r, password: generatePassword() }))}>
                    <MdRefresh />
                  </button>
                  <button type="button" className={'pw-action-btn' + (copiedReset ? ' pw-action-btn--copied' : '')} title="คัดลอก" onClick={copyResetPassword}>
                    <MdContentCopy />
                    {copiedReset && <span className="pw-copied-label">คัดลอกแล้ว</span>}
                  </button>
                </div>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setResetPw(null)}>ยกเลิก</button>
              <button className="btn-primary" onClick={confirmReset}><MdLockReset /> ยืนยัน Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {toDelete && (
        <div className="modal-overlay" onClick={() => setToDelete(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>ลบพนักงาน</h3>
              <button className="modal-close" onClick={() => setToDelete(null)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <p>ต้องการลบพนักงานนี้ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setToDelete(null)}>ยกเลิก</button>
              <button className="btn-danger" onClick={handleDeleteUser}>ลบ</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
