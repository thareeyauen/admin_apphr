import { useEffect, useMemo, useState } from 'react'
import {
  MdSearch, MdEdit, MdSave, MdClose, MdCheckCircle,
  MdAccountTree, MdPersonOff,
} from 'react-icons/md'
import Layout from '../components/Layout'
import { getUsers, updateApprovers } from '../store/store'
import './Approvals.css'

// Eligible approver levels per requester level — admin can only pick from these.
const ELIGIBLE_APPROVER_LEVELS = {
  'Project Level':  ['Director Level', 'Board Level'],
  'Director Level': ['Board Level'],
  // Board Level: empty array (no requests, no approver needed)
}

function getInitials(name = '') {
  return name.trim().split(' ').map((w) => w[0] || '').join('').slice(0, 2).toUpperCase() || '?'
}

export default function Approvals() {
  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState([''])
  const [justSaved, setJustSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getUsers()
      .then((u) => {
        const list = u || []
        setUsers(list)
        // Default-select the first non-Board user since Board has no approver
        const first = list.find((x) => x.employeeLevel !== 'Board Level')
        if (first) setSelectedUserId(first.id)
      })
      .catch(() => setUsers([]))
  }, [])

  const usersById = useMemo(() => {
    const m = {}
    for (const u of users) m[u.id] = u
    return m
  }, [users])

  const filtered = users.filter((u) => {
    if (u.employeeLevel === 'Board Level') return false
    const q = query.toLowerCase()
    if (!q) return true
    return (u.nameTh || '').toLowerCase().includes(q)
      || (u.employeeId || '').toLowerCase().includes(q)
      || (u.department || '').toLowerCase().includes(q)
  })

  const selected = users.find((u) => u.id === selectedUserId)
  const eligibleLevels = selected ? (ELIGIBLE_APPROVER_LEVELS[selected.employeeLevel] || []) : []
  const candidates = users.filter((u) => eligibleLevels.includes(u.employeeLevel))

  const currentApprovers = selected?.approverUserIds || []

  const selectUser = (id) => {
    if (editing) return
    setSelectedUserId(id)
  }

  const startEdit = () => {
    setDraft([currentApprovers[0] || ''])
    setEditing(true)
  }
  const cancelEdit = () => {
    setEditing(false)
    setDraft([''])
  }
  const save = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const ids = draft.filter(Boolean)
      // Disallow duplicates
      const uniq = Array.from(new Set(ids))
      const next = await updateApprovers(selected.id, uniq)
      setUsers(next || [])
      setEditing(false)
      setDraft(['', ''])
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const setSlot = (idx, value) => {
    setDraft((d) => {
      const next = [...d]
      next[idx] = value
      // Prevent same person in both slots
      if (idx === 0 && value && next[1] === value) next[1] = ''
      if (idx === 1 && value && next[0] === value) next[0] = ''
      return next
    })
  }

  const renderApproverChip = (id) => {
    const u = usersById[id]
    if (!u) return <span className="ap-chip ap-chip--missing"><MdPersonOff /> ไม่พบ ({id})</span>
    return (
      <span className="ap-chip">
        <span className="ap-chip-avatar">{u.initial || getInitials(u.nameEn || u.nameTh)}</span>
        <span>
          <span className="ap-chip-name">{u.nameTh}</span>
          <span className="ap-chip-role">{u.employeeLevel}</span>
        </span>
      </span>
    )
  }

  return (
    <Layout title="จัดการสายการอนุมัติ">
      <div className="ap-shell">
        {/* LEFT: list */}
        <aside className="ap-list-panel">
          <div className="ap-list-search">
            <MdSearch />
            <input
              placeholder="ค้นหา ชื่อ / รหัส / แผนก"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="ap-list-meta">
            แสดง <strong>{filtered.length}</strong> / {users.filter(u => u.employeeLevel !== 'Board Level').length} พนักงาน
          </div>
          <div className="ap-list-body">
            {filtered.map((u) => {
              const count = (u.approverUserIds || []).length
              return (
                <button
                  key={u.id}
                  className={`ap-list-item ${selectedUserId === u.id ? 'is-active' : ''}`}
                  onClick={() => selectUser(u.id)}
                  title={editing ? 'บันทึก/ยกเลิกก่อนเปลี่ยนพนักงาน' : ''}
                >
                  <span className="ap-list-avatar">{u.initial || '?'}</span>
                  <span className="ap-list-info">
                    <span className="ap-list-name">{u.nameTh}</span>
                    <span className="ap-list-role">{u.employeeLevel}</span>
                  </span>
                  <span className={`ap-list-count ${count === 0 ? 'is-empty' : ''}`}>
                    {count > 0 ? count : '—'}
                  </span>
                </button>
              )
            })}
            {filtered.length === 0 && <p className="ap-empty">ไม่พบพนักงาน</p>}
          </div>
        </aside>

        {/* RIGHT: detail */}
        <section className="ap-detail-panel">
          {!selected ? (
            <div className="ap-empty-detail">เลือกพนักงานเพื่อจัดการสายอนุมัติ</div>
          ) : (
            <>
              <header className="ap-detail-head">
                <div className="ap-detail-user">
                  <span className="ap-detail-avatar">{selected.initial || '?'}</span>
                  <div>
                    <p className="ap-detail-name">{selected.nameTh}</p>
                    <p className="ap-detail-sub">
                      {selected.employeeId} · {selected.role || selected.employeeLevel} · {selected.department || 'ไม่ระบุแผนก'}
                    </p>
                  </div>
                </div>
                <div className="ap-detail-actions">
                  {justSaved && (
                    <span className="ap-saved-pill"><MdCheckCircle /> บันทึกแล้ว</span>
                  )}
                  {editing ? (
                    <>
                      <button className="btn-ghost" onClick={cancelEdit} disabled={saving}>
                        <MdClose /> ยกเลิก
                      </button>
                      <button className="btn-primary" onClick={save} disabled={saving}>
                        <MdSave /> {saving ? 'กำลังบันทึก…' : 'บันทึก'}
                      </button>
                    </>
                  ) : (
                    <button className="btn-primary" onClick={startEdit}>
                      <MdEdit /> แก้ไข
                    </button>
                  )}
                </div>
              </header>

              <div className="ap-info-card">
                <p className="ap-info-label">ระดับผู้อนุมัติที่กำหนดได้</p>
                <p className="ap-info-value">
                  {eligibleLevels.length > 0 ? eligibleLevels.join(' / ') : '— (ระดับนี้ไม่ใช้งานระบบคำขอ)'}
                </p>
              </div>

              {eligibleLevels.length === 0 ? (
                <div className="ap-empty-detail" style={{ marginTop: 16 }}>
                  Board Level ไม่ต้องกำหนดผู้อนุมัติ
                </div>
              ) : (
                <div className="ap-slots">
                  <div className="ap-slot">
                    <p className="ap-slot-label">ผู้อนุมัติ</p>
                    {editing ? (
                      <select
                        className="ap-slot-select"
                        value={draft[0]}
                        onChange={(e) => setSlot(0, e.target.value)}
                      >
                        <option value="">— ไม่ระบุ —</option>
                        {candidates.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nameTh} ({c.employeeLevel}) · {c.department}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="ap-slot-display">
                        {currentApprovers[0]
                          ? renderApproverChip(currentApprovers[0])
                          : <span className="ap-slot-empty">— ยังไม่ได้กำหนด —</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!editing && currentApprovers.length === 0 && eligibleLevels.length > 0 && (
                <div className="ap-warning">
                  <MdAccountTree />
                  <span>
                    ยังไม่ได้กำหนดผู้อนุมัติ — คำขอของพนักงานคนนี้จะแสดงให้แอดมินอนุมัติเท่านั้น
                  </span>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </Layout>
  )
}
