import { useEffect, useMemo, useState } from 'react'
import {
  MdEdit, MdSave, MdClose, MdSearch,
  MdPerson, MdFamilyRestroom, MdAssignment, MdMoreHoriz, MdCheckCircle,
} from 'react-icons/md'
import Layout from '../components/Layout'
import { getUsers, getLeaveTypes, getEntitlements, updateEntitlement } from '../store/store'
import './LeaveEntitlement.css'

// Reasonable upper bounds for the numeric input.
const MAX_BY_ID = {
  annual: 30, sick: 60, personal: 30, maternity: 180, paternity: 30,
  compensation: 30, ordination: 60, unpaid: 365, sterilization: 30,
  training: 90, military: 365,
}

// Group leave types into 4 logical sections for the detail panel.
// Any type not listed here lands in "อื่นๆ" automatically.
const GROUPS = [
  { id: 'basic',  label: 'พื้นฐาน',         icon: <MdPerson />,         types: ['personal', 'sick', 'annual'] },
  { id: 'family', label: 'ครอบครัว / สุขภาพ', icon: <MdFamilyRestroom />, types: ['maternity', 'paternity', 'sterilization'] },
  { id: 'duty',   label: 'หน้าที่ / พัฒนาตน', icon: <MdAssignment />,    types: ['ordination', 'military', 'training'] },
  { id: 'other',  label: 'อื่น ๆ',            icon: <MdMoreHoriz />,      types: ['compensation', 'unpaid'] },
]

const hintFor = (t) => {
  if (t.id === 'annual') return 'คำนวณจากอายุงาน (1–3 ปี: 7 / 3–5 ปี: 10 / >5 ปี: 15)'
  if (t.id === 'compensation') return 'ขึ้นกับวันที่ทำงานวันหยุด'
  if (t.minTenureYears) return `ใช้สิทธิเมื่ออายุงาน ≥ ${t.minTenureYears} ปี`
  return null
}

export default function LeaveEntitlement() {
  const [users, setUsers] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [entitlementsMap, setEntitlementsMap] = useState({})
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({})
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    Promise.all([getUsers(), getLeaveTypes(), getEntitlements()])
      .then(([u, types, m]) => {
        setUsers(u || [])
        setLeaveTypes(types || [])
        setEntitlementsMap(m || {})
        if ((u || []).length > 0) setSelectedUserId(u[0].id)
      })
      .catch(() => { setUsers([]); setLeaveTypes([]); setEntitlementsMap({}) })
  }, [])

  const typeById = useMemo(() => {
    const m = {}
    for (const t of leaveTypes) m[t.id] = t
    return m
  }, [leaveTypes])

  // Section "Other" auto-collects anything not explicitly placed in another group.
  const sections = useMemo(() => {
    const placed = new Set(GROUPS.flatMap((g) => g.types))
    const extras = leaveTypes.filter((t) => !placed.has(t.id)).map((t) => t.id)
    return GROUPS.map((g) =>
      g.id === 'other' ? { ...g, types: [...g.types, ...extras] } : g
    )
  }, [leaveTypes])

  const defaults = useMemo(() => {
    const d = {}
    for (const t of leaveTypes) d[t.id] = t.quota ?? 0
    return d
  }, [leaveTypes])

  const entForUser = (id) => {
    const stored = entitlementsMap[id] || {}
    const merged = {}
    for (const t of leaveTypes) merged[t.id] = stored[t.id] ?? defaults[t.id]
    return merged
  }

  const filtered = users.filter((u) => {
    const q = query.toLowerCase()
    if (!q) return true
    return (u.nameTh || '').toLowerCase().includes(q)
      || (u.employeeId || '').toLowerCase().includes(q)
      || (u.department || '').toLowerCase().includes(q)
  })

  const selected = users.find((u) => u.id === selectedUserId)
  const selectedEnt = selected ? entForUser(selected.id) : {}

  const selectUser = (id) => {
    if (editing) return // don't drop unsaved draft silently
    setSelectedUserId(id)
  }

  const startEdit = () => {
    setDraft({ ...selectedEnt })
    setEditing(true)
  }
  const cancelEdit = () => {
    setEditing(false)
    setDraft({})
  }
  const save = async () => {
    if (!selected) return
    const next = await updateEntitlement(selected.id, draft)
    setEntitlementsMap(next || {})
    setEditing(false)
    setDraft({})
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  // Sticky totals shown in detail header
  const totalDays = useMemo(() => {
    const src = editing ? draft : selectedEnt
    return Object.values(src).reduce((s, v) => s + (Number(v) || 0), 0)
  }, [editing, draft, selectedEnt])

  return (
    <Layout title="จัดการสิทธิ์วันลา">
      <div className="le-shell">
        {/* ─── LEFT: Employee list ─────────────────────────────── */}
        <aside className="le-list-panel">
          <div className="le-list-search">
            <MdSearch />
            <input
              placeholder="ค้นหา ชื่อ / รหัส / แผนก"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="le-list-meta">
            แสดง <strong>{filtered.length}</strong> / {users.length} พนักงาน
          </div>
          <div className="le-list-body">
            {filtered.map((u) => (
              <button
                key={u.id}
                className={`le-list-item ${selectedUserId === u.id ? 'is-active' : ''}`}
                onClick={() => selectUser(u.id)}
                title={editing ? 'บันทึก/ยกเลิกก่อนเปลี่ยนพนักงาน' : ''}
              >
                <span className="le-list-avatar">{u.initial || '?'}</span>
                <span className="le-list-info">
                  <span className="le-list-name">{u.nameTh}</span>
                  <span className="le-list-role">{u.role || u.employeeLevel || '—'}</span>
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="le-empty">ไม่พบพนักงาน</p>
            )}
          </div>
        </aside>

        {/* ─── RIGHT: Detail panel ─────────────────────────────── */}
        <section className="le-detail-panel">
          {!selected ? (
            <div className="le-empty-detail">เลือกพนักงานเพื่อจัดการสิทธิ์วันลา</div>
          ) : (
            <>
              <header className="le-detail-head">
                <div className="le-detail-user">
                  <span className="le-detail-avatar">{selected.initial || '?'}</span>
                  <div>
                    <p className="le-detail-name">{selected.nameTh}</p>
                    <p className="le-detail-sub">
                      {selected.employeeId} · {selected.role || selected.employeeLevel || '—'} · {selected.department || 'ไม่ระบุแผนก'}
                    </p>
                  </div>
                </div>
                <div className="le-detail-actions">
                  {justSaved && (
                    <span className="le-saved-pill"><MdCheckCircle /> บันทึกแล้ว</span>
                  )}
                  {editing ? (
                    <>
                      <button className="btn-ghost" onClick={cancelEdit}>
                        <MdClose /> ยกเลิก
                      </button>
                      <button className="btn-primary" onClick={save}>
                        <MdSave /> บันทึก
                      </button>
                    </>
                  ) : (
                    <button className="btn-primary" onClick={startEdit}>
                      <MdEdit /> แก้ไข
                    </button>
                  )}
                </div>
              </header>

              <div className="le-summary">
                <div className="le-summary-item">
                  <p className="le-summary-label">จำนวนประเภท</p>
                  <p className="le-summary-value">{leaveTypes.length}</p>
                </div>
                <div className="le-summary-item">
                  <p className="le-summary-label">รวมสิทธิ์ทั้งหมด</p>
                  <p className="le-summary-value">{totalDays} <span>วัน/ปี</span></p>
                </div>
              </div>

              <div className="le-groups">
                {sections.map((g) => {
                  const groupTypes = g.types
                    .map((id) => typeById[id])
                    .filter(Boolean)
                  if (groupTypes.length === 0) return null
                  return (
                    <section key={g.id} className="le-group">
                      <header className="le-group-head">
                        <span className="le-group-icon">{g.icon}</span>
                        <h3>{g.label}</h3>
                        <span className="le-group-count">{groupTypes.length} ประเภท</span>
                      </header>
                      <div className="le-group-grid">
                        {groupTypes.map((t) => {
                          const value = editing
                            ? (draft[t.id] ?? defaults[t.id])
                            : selectedEnt[t.id]
                          const isComputed = t.quota === null
                          return (
                            <div key={t.id} className={`le-tile ${isComputed ? 'is-computed' : ''}`}>
                              <p className="le-tile-label">{t.labelTh}</p>
                              {editing ? (
                                <div className="le-tile-input-row">
                                  <input
                                    type="number"
                                    min={0}
                                    max={MAX_BY_ID[t.id] ?? 365}
                                    value={value}
                                    onChange={(e) =>
                                      setDraft((d) => ({ ...d, [t.id]: Number(e.target.value) }))
                                    }
                                    className="le-tile-input"
                                  />
                                  <span className="le-tile-unit">วัน/ปี</span>
                                </div>
                              ) : (
                                <p className="le-tile-value">
                                  {value} <span>วัน</span>
                                </p>
                              )}
                              {hintFor(t) && (
                                <p className="le-tile-hint">{hintFor(t)}</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </Layout>
  )
}
