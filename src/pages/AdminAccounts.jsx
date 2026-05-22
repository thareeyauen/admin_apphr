import { useEffect, useState } from 'react'
import {
  MdAdd, MdDelete, MdLockReset, MdSave, MdClose,
  MdVisibility, MdVisibilityOff, MdRefresh, MdContentCopy,
  MdErrorOutline, MdAdminPanelSettings,
} from 'react-icons/md'
import Layout from '../components/Layout'
import { getAdmins, addAdmin, deleteAdminAccount, resetAdminPassword, getSession } from '../store/store'
import './AdminAccounts.css'

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
  return name.trim().split(' ').map((w) => w[0] || '').join('').slice(0, 2).toUpperCase() || 'A'
}

const EMPTY_ADD = { nameTh: '', email: '', password: '' }

export default function AdminAccounts() {
  const session = getSession()
  const [admins, setAdmins]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [pageError, setPageError] = useState('')

  // ── Add modal ──────────────────────────────────────────────────────────────
  const [addOpen, setAddOpen]       = useState(false)
  const [addForm, setAddForm]       = useState(EMPTY_ADD)
  const [addPwVisible, setAddPwVisible] = useState(false)
  const [addCopied, setAddCopied]   = useState(false)
  const [addSaving, setAddSaving]   = useState(false)
  const [addError, setAddError]     = useState('')

  // ── Change-password modal ──────────────────────────────────────────────────
  const [pwModal, setPwModal]   = useState(null)   // { id, name }
  const [pwNew, setPwNew]       = useState('')
  const [pwVisible, setPwVisible] = useState(false)
  const [pwCopied, setPwCopied] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError]   = useState('')

  // ── Delete confirm ─────────────────────────────────────────────────────────
  const [toDelete, setToDelete] = useState(null)   // { id, name }
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getAdmins()
      .then(setAdmins)
      .catch(() => setPageError('โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoading(false))
  }, [])

  // ── Add ────────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setAddForm({ ...EMPTY_ADD, password: generatePassword() })
    setAddPwVisible(false); setAddCopied(false); setAddError('')
    setAddOpen(true)
  }

  const handleAdd = async () => {
    if (!addForm.nameTh.trim() || !addForm.email.trim() || !addForm.password) return
    setAddSaving(true); setAddError('')
    try {
      await addAdmin(addForm)
      setAdmins(await getAdmins())
      setAddOpen(false)
    } catch (err) {
      setAddError(err.message || 'เกิดข้อผิดพลาด')
    } finally {
      setAddSaving(false)
    }
  }

  // ── Change password ────────────────────────────────────────────────────────
  const openPw = (a) => {
    setPwModal({ id: a.id, name: a.nameTh || a.email })
    setPwNew(generatePassword())
    setPwVisible(false); setPwCopied(false); setPwError('')
  }

  const handlePwSave = async () => {
    if (pwNew.length < 8) { setPwError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return }
    setPwSaving(true); setPwError('')
    try {
      await resetAdminPassword(pwModal.id, pwNew)
      setPwModal(null)
    } catch (err) {
      setPwError(err.message || 'เกิดข้อผิดพลาด')
    } finally {
      setPwSaving(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteAdminAccount(toDelete.id)
      setAdmins(await getAdmins())
      setToDelete(null)
    } catch (err) {
      setPageError(err.message || 'ลบไม่สำเร็จ')
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const isSelf = (a) => session?.user?.id === a.id || session?.email === a.email

  return (
    <Layout title="จัดการ Admin">
      <div className="admin-toolbar">
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)' }}>
          Account ผู้ดูแลระบบ — เพิ่ม ลบ และเปลี่ยนรหัสผ่านได้ที่นี่
        </p>
        <button className="btn-primary" onClick={openAdd}>
          <MdAdd /> เพิ่ม Admin
        </button>
      </div>

      {pageError && (
        <div className="uf-error-banner" style={{ marginBottom: 14 }}>
          <MdErrorOutline /> {pageError}
        </div>
      )}

      <div className="admin-card">
        {loading ? (
          <p className="table-empty">กำลังโหลด...</p>
        ) : admins.length === 0 ? (
          <p className="table-empty">ไม่มีข้อมูล Admin</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>อีเมล</th>
                <th style={{ width: 180 }}></th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="admin-name-cell">
                      <span className="admin-avatar"><MdAdminPanelSettings /></span>
                      <div>
                        <div className="admin-name">{a.nameTh || '—'}</div>
                        {isSelf(a) && <span className="self-badge">คุณ</span>}
                      </div>
                    </div>
                  </td>
                  <td className="td-sub">{a.email}</td>
                  <td>
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => openPw(a)}>
                        <MdLockReset /> เปลี่ยนรหัสผ่าน
                      </button>
                      <button
                        className="act-btn act-btn--del"
                        onClick={() => setToDelete({ id: a.id, name: a.nameTh || a.email })}
                        disabled={isSelf(a)}
                        title={isSelf(a) ? 'ไม่สามารถลบตัวเองได้' : 'ลบ'}
                      >
                        <MdDelete />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add Admin Modal ──────────────────────────────────────────────────── */}
      {addOpen && (
        <div className="modal-overlay" onClick={() => setAddOpen(false)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>เพิ่ม Admin ใหม่</h3>
              <button className="modal-close" onClick={() => setAddOpen(false)}><MdClose /></button>
            </div>
            <div className="modal-body">
              {addError && <div className="uf-error-banner"><MdErrorOutline /> {addError}</div>}
              <label className="uf-field uf-field--full">
                <span>ชื่อ-นามสกุล *</span>
                <input type="text" value={addForm.nameTh} onChange={(e) => setAddForm(f => ({ ...f, nameTh: e.target.value }))} placeholder="ชื่อผู้ดูแลระบบ" />
              </label>
              <label className="uf-field uf-field--full" style={{ marginTop: 10 }}>
                <span>อีเมล *</span>
                <input type="email" value={addForm.email} onChange={(e) => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@example.com" />
              </label>
              <label className="uf-field uf-field--full" style={{ marginTop: 10 }}>
                <span>รหัสผ่านเริ่มต้น *</span>
                <div className="pw-gen-row">
                  <div className="pw-gen-input-wrap">
                    <input
                      type={addPwVisible ? 'text' : 'password'}
                      value={addForm.password}
                      onChange={(e) => setAddForm(f => ({ ...f, password: e.target.value }))}
                      className="pw-gen-input"
                    />
                    <button type="button" className="pw-eye" onClick={() => setAddPwVisible(v => !v)}>
                      {addPwVisible ? <MdVisibilityOff /> : <MdVisibility />}
                    </button>
                  </div>
                  <button type="button" className="pw-action-btn" title="สุ่มใหม่" onClick={() => setAddForm(f => ({ ...f, password: generatePassword() }))}>
                    <MdRefresh />
                  </button>
                  <button
                    type="button"
                    className={'pw-action-btn' + (addCopied ? ' pw-action-btn--copied' : '')}
                    title="คัดลอก"
                    onClick={() => { navigator.clipboard.writeText(addForm.password); setAddCopied(true); setTimeout(() => setAddCopied(false), 2000) }}
                  >
                    <MdContentCopy />
                    {addCopied && <span className="pw-copied-label">คัดลอกแล้ว</span>}
                  </button>
                </div>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setAddOpen(false)}>ยกเลิก</button>
              <button
                className="btn-primary"
                onClick={handleAdd}
                disabled={addSaving || !addForm.nameTh.trim() || !addForm.email.trim() || !addForm.password}
              >
                <MdSave /> {addSaving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password Modal ────────────────────────────────────────────── */}
      {pwModal && (
        <div className="modal-overlay" onClick={() => setPwModal(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>เปลี่ยนรหัสผ่าน — {pwModal.name}</h3>
              <button className="modal-close" onClick={() => setPwModal(null)}><MdClose /></button>
            </div>
            <div className="modal-body">
              {pwError && <div className="uf-error-banner"><MdErrorOutline /> {pwError}</div>}
              <label className="uf-field uf-field--full">
                <span>รหัสผ่านใหม่</span>
                <div className="pw-gen-row">
                  <div className="pw-gen-input-wrap">
                    <input
                      type={pwVisible ? 'text' : 'password'}
                      value={pwNew}
                      onChange={(e) => setPwNew(e.target.value)}
                      className="pw-gen-input"
                    />
                    <button type="button" className="pw-eye" onClick={() => setPwVisible(v => !v)}>
                      {pwVisible ? <MdVisibilityOff /> : <MdVisibility />}
                    </button>
                  </div>
                  <button type="button" className="pw-action-btn" title="สุ่มใหม่" onClick={() => setPwNew(generatePassword())}>
                    <MdRefresh />
                  </button>
                  <button
                    type="button"
                    className={'pw-action-btn' + (pwCopied ? ' pw-action-btn--copied' : '')}
                    title="คัดลอก"
                    onClick={() => { navigator.clipboard.writeText(pwNew); setPwCopied(true); setTimeout(() => setPwCopied(false), 2000) }}
                  >
                    <MdContentCopy />
                    {pwCopied && <span className="pw-copied-label">คัดลอกแล้ว</span>}
                  </button>
                </div>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setPwModal(null)}>ยกเลิก</button>
              <button className="btn-primary" onClick={handlePwSave} disabled={pwSaving}>
                <MdSave /> {pwSaving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      {toDelete && (
        <div className="modal-overlay" onClick={() => setToDelete(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>ยืนยันการลบ</h3>
              <button className="modal-close" onClick={() => setToDelete(null)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <p>ต้องการลบ <strong>{toDelete.name}</strong> ออกจากระบบหรือไม่?</p>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setToDelete(null)}>ยกเลิก</button>
              <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'กำลังลบ...' : 'ลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
