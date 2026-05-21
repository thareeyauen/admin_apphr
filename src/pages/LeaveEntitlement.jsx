import { useEffect, useMemo, useState } from 'react'
import {
  MdEdit, MdSave, MdClose, MdSearch,
  MdPerson, MdFamilyRestroom, MdAssignment, MdMoreHoriz, MdCheckCircle,
  MdEventRepeat,
} from 'react-icons/md'
import Layout from '../components/Layout'
import { getUsers, getLeaveTypes, getEntitlements, getEntitlementForUser, updateEntitlement, getRequests, snapshotAnnualCarry } from '../store/store'
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
  if (t.id === 'annual') return 'อายุงาน 1–3 ปี: 7 / 3–5 ปี: 10 / >5 ปี: 15 · ส่วนที่ไม่ได้ใช้สะสมข้ามปี (สูงสุด 20) ส่วนเกินจ่ายคืนเป็นเงิน'
  if (t.id === 'compensation') return 'ขึ้นกับวันที่ทำงานวันหยุด'
  if (t.minTenureYears) return `ใช้สิทธิเมื่ออายุงาน ≥ ${t.minTenureYears} ปี`
  return null
}

export default function LeaveEntitlement() {
  const [users, setUsers] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [entitlementsMap, setEntitlementsMap] = useState({})
  const [selectedUserEnt, setSelectedUserEnt] = useState({})
  const [requests, setRequests] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({})
  const [carryDraft, setCarryDraft] = useState(0)
  const [justSaved, setJustSaved] = useState(false)
  const [snapshotState, setSnapshotState] = useState(null) // 'confirm' | 'running' | { result }

  useEffect(() => {
    Promise.all([getUsers(), getLeaveTypes(), getEntitlements(), getRequests()])
      .then(([u, types, m, reqs]) => {
        // Board Level members don't use the leave system — exclude them here so
        // they never appear in the list and can't be selected.
        const manageable = (u || []).filter((x) => x.employeeLevel !== 'Board Level')
        setUsers(manageable)
        setLeaveTypes(types || [])
        setEntitlementsMap(m || {})
        setRequests(reqs || [])
        if (manageable.length > 0) setSelectedUserId(manageable[0].id)
      })
      .catch(() => { setUsers([]); setLeaveTypes([]); setEntitlementsMap({}); setRequests([]) })
  }, [])

  // Fetch the merged entitlement for the selected user. Goes through the per-user
  // endpoint so the backend can compute annual leave from tenure even for users
  // who don't have an entitlements row yet.
  useEffect(() => {
    if (!selectedUserId) { setSelectedUserEnt({}); return }
    getEntitlementForUser(selectedUserId)
      .then((data) => setSelectedUserEnt(data || {}))
      .catch(() => setSelectedUserEnt({}))
  }, [selectedUserId])

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
    // Per-user fetch is authoritative (includes tenure-based annual). Fall back to
    // the bulk map when the per-user value hasn't loaded yet, then to defaults.
    const perUser = id === selectedUserId ? selectedUserEnt : null
    const stored = perUser && Object.keys(perUser).length > 0 ? perUser : (entitlementsMap[id] || {})
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

  // Sum approved + pending leave days per user, per leave-label, for the current calendar year.
  const usedByUserByLabel = useMemo(() => {
    const yearPrefix = String(new Date().getFullYear())
    const map = {}
    for (const r of requests) {
      if (!['approved', 'pending'].includes(r.status)) continue
      if (!(r.startDateKey || '').startsWith(yearPrefix)) continue
      const uid = r.userId || r.ownerId
      const label = r.type
      if (!uid || !label) continue
      if (!map[uid]) map[uid] = {}
      map[uid][label] = (map[uid][label] || 0) + (Number(r.days) || 0)
    }
    return map
  }, [requests])

  const usedForSelected = selected ? (usedByUserByLabel[selected.id] || {}) : {}
  const usedFor = (t) => usedForSelected[t.label] || 0

  const selectUser = (id) => {
    if (editing) return // don't drop unsaved draft silently
    setSelectedUserId(id)
  }

  const startEdit = () => {
    setDraft({ ...selectedEnt })
    setCarryDraft(Number(selectedUserEnt._annualCarryOver) || 0)
    setEditing(true)
  }
  const cancelEdit = () => {
    setEditing(false)
    setDraft({})
    setCarryDraft(0)
  }
  const save = async () => {
    if (!selected) return
    // Annual is auto-computed as tier + carryOver on the backend; don't send the
    // computed quota as an "override" or it will lock the value and stop
    // recalculating with tenure or carry changes.
    const { annual: _ignoreAnnual, _annualBase, _annualCarryOver, ...rest } = draft
    const payload = { ...rest, annualCarryOver: Math.max(0, Math.min(20, Number(carryDraft) || 0)) }
    const next = await updateEntitlement(selected.id, payload)
    setEntitlementsMap(next || {})
    const fresh = await getEntitlementForUser(selected.id).catch(() => null)
    if (fresh) setSelectedUserEnt(fresh)
    setEditing(false)
    setDraft({})
    setCarryDraft(0)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  // Sticky totals shown in detail header
  const totalDays = useMemo(() => {
    const src = editing ? draft : selectedEnt
    return Object.values(src).reduce((s, v) => s + (Number(v) || 0), 0)
  }, [editing, draft, selectedEnt])

  const totalUsed = useMemo(
    () => leaveTypes.reduce((s, t) => s + (usedForSelected[t.label] || 0), 0),
    [leaveTypes, usedForSelected]
  )
  const totalRemaining = Math.max(totalDays - totalUsed, 0)

  const runSnapshot = async () => {
    setSnapshotState('running')
    try {
      const result = await snapshotAnnualCarry()
      // Refresh everything so the new carry shows immediately
      const [m, reqs] = await Promise.all([getEntitlements(), getRequests()])
      setEntitlementsMap(m || {})
      setRequests(reqs || [])
      if (selectedUserId) {
        const fresh = await getEntitlementForUser(selectedUserId).catch(() => null)
        if (fresh) setSelectedUserEnt(fresh)
      }
      setSnapshotState({ result })
    } catch (err) {
      setSnapshotState({ error: err.message || 'ไม่สามารถดำเนินการได้' })
    }
  }

  return (
    <Layout title="จัดการสิทธิ์วันลา">
      <div className="le-page-actions">
        <button
          className="btn-ghost le-snapshot-btn"
          onClick={() => setSnapshotState('confirm')}
          title="คำนวณยอดสะสมพักร้อนของทุกคน จากวันคงเหลือปัจจุบัน (ใช้ตอนปลายปี)"
        >
          <MdEventRepeat /> ตั้งยอดสะสมประจำปี
        </button>
      </div>
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
                <div className="le-summary-item">
                  <p className="le-summary-label">ใช้ไปแล้ว</p>
                  <p className="le-summary-value">{totalUsed} <span>วัน</span></p>
                </div>
                <div className="le-summary-item">
                  <p className="le-summary-label">คงเหลือ</p>
                  <p className="le-summary-value le-summary-value--ok">{totalRemaining} <span>วัน</span></p>
                </div>
                <div className="le-summary-item le-summary-item--carry">
                  <p className="le-summary-label">ยอดสะสมพักร้อน</p>
                  <p className="le-summary-value le-summary-value--carry">{editing ? carryDraft : (Number(selectedUserEnt._annualCarryOver) || 0)} <span>วัน (จากปีก่อน · ไม่เกิน 20)</span></p>
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
                          const isAnnual = t.id === 'annual'
                          const annualBase = Number(selectedUserEnt._annualBase) || 0
                          const storedCarry = Number(selectedUserEnt._annualCarryOver) || 0
                          const liveCarry = editing && isAnnual ? carryDraft : storedCarry
                          const value = isAnnual
                            ? (annualBase + liveCarry)
                            : (editing ? (draft[t.id] ?? defaults[t.id]) : selectedEnt[t.id])
                          const isComputed = t.quota === null
                          const used = usedFor(t)
                          const remaining = Math.max((Number(value) || 0) - used, 0)
                          const max = MAX_BY_ID[t.id] ?? 365
                          return (
                            <div key={t.id} className={`le-tile ${isComputed ? 'is-computed' : ''}`}>
                              <p className="le-tile-label">{t.labelTh}</p>
                              {/* Quota row: input for non-annual edit; read-only otherwise */}
                              {editing && !isAnnual ? (
                                <div className="le-tile-input-row">
                                  <input
                                    type="number"
                                    min={0}
                                    max={max}
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
                                  {value} <span>วัน{isAnnual ? '/ปี' : ''}</span>
                                </p>
                              )}

                              {/* Annual breakdown line: tier-base + carry (editable in edit mode) */}
                              {isAnnual && (
                                <p className="le-tile-breakdown">
                                  ฐาน <strong>{annualBase}</strong> + สะสม{' '}
                                  {editing ? (
                                    <input
                                      type="number"
                                      min={0}
                                      max={20}
                                      value={carryDraft}
                                      onChange={(e) => {
                                        const v = Math.max(0, Math.min(20, Number(e.target.value) || 0))
                                        setCarryDraft(v)
                                        setDraft((d) => ({ ...d, annual: annualBase + v }))
                                      }}
                                      className="le-tile-carry-input"
                                      title="ยอดสะสมจากปีก่อน (สูงสุด 20 วัน)"
                                    />
                                  ) : (
                                    <strong className="le-tile-breakdown-carry">{storedCarry}</strong>
                                  )}
                                  {' '}วัน
                                </p>
                              )}

                              {/* Usage row: remaining input for non-annual edit; read-only otherwise */}
                              {editing && !isAnnual ? (
                                <p className="le-tile-usage">
                                  ใช้ <strong>{used}</strong> · คงเหลือ{' '}
                                  <input
                                    type="number"
                                    min={0}
                                    max={max}
                                    value={remaining}
                                    onChange={(e) => {
                                      const r = Math.max(0, Number(e.target.value) || 0)
                                      setDraft((d) => ({ ...d, [t.id]: r + used }))
                                    }}
                                    className="le-tile-remaining-input"
                                    title="แก้ไขวันคงเหลือ — quota จะปรับเป็น คงเหลือ + ใช้ไป"
                                  />{' '}
                                  วัน
                                </p>
                              ) : (
                                <p className="le-tile-usage">
                                  ใช้ <strong>{used}</strong> · คงเหลือ <strong className="le-tile-usage-remaining">{remaining}</strong> วัน
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

      {/* Year-end snapshot modal */}
      {snapshotState === 'confirm' && (
        <div className="modal-overlay" onClick={() => setSnapshotState(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>ตั้งยอดสะสมพักร้อนประจำปี</h3>
              <button className="modal-close" onClick={() => setSnapshotState(null)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <p>การกระทำนี้จะคำนวณ <strong>ยอดสะสมพักร้อนใหม่</strong> ให้พนักงานทุกคน:</p>
              <ul className="le-snapshot-list">
                <li>คำนวณจาก <em>วันคงเหลือปัจจุบัน</em> ของลาพักร้อน</li>
                <li>สะสมได้สูงสุด <strong>20 วัน</strong> ส่วนเกินตัดจ่ายเป็นเงิน (ระบบจะระบุยอดเกิน)</li>
                <li>ยอดสะสมเดิมจะถูก <strong>แทนที่</strong></li>
              </ul>
              <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--ink-3)' }}>
                ⚠️ ควรรันหลังจากปิดรอบคำขอลาของปีนี้แล้ว เพื่อให้ยอดคงเหลือเป็นค่าสุดท้าย
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setSnapshotState(null)}>ยกเลิก</button>
              <button className="btn-primary" onClick={runSnapshot}><MdEventRepeat /> ดำเนินการ</button>
            </div>
          </div>
        </div>
      )}

      {snapshotState === 'running' && (
        <div className="modal-overlay">
          <div className="modal modal--sm">
            <div className="modal-body">
              <p style={{ textAlign: 'center', padding: '20px' }}>กำลังคำนวณยอดสะสม...</p>
            </div>
          </div>
        </div>
      )}

      {snapshotState && typeof snapshotState === 'object' && snapshotState.result && (
        <div className="modal-overlay" onClick={() => setSnapshotState(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-head">
              <h3>ผลการตั้งยอดสะสม ปี {snapshotState.result.year}</h3>
              <button className="modal-close" onClick={() => setSnapshotState(null)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '12px' }}>
                ดำเนินการเรียบร้อย <strong>{snapshotState.result.count}</strong> คน
              </p>
              <div className="le-snapshot-table">
                <div className="le-snapshot-row le-snapshot-row--head">
                  <div>พนักงาน</div>
                  <div>quota</div>
                  <div>ใช้ไป</div>
                  <div>คงเหลือ</div>
                  <div>carry เดิม</div>
                  <div>carry ใหม่</div>
                  <div>ส่วนเกิน</div>
                </div>
                {snapshotState.result.summary.map((row) => (
                  <div key={row.userId} className="le-snapshot-row">
                    <div>
                      <div className="le-snapshot-name">{row.nameTh}</div>
                      <div className="le-snapshot-emp">{row.employeeId}</div>
                    </div>
                    <div>{row.quota}</div>
                    <div>{row.used}</div>
                    <div>{row.remaining}</div>
                    <div>{row.previousCarry}</div>
                    <div className="le-snapshot-new">{row.newCarry}</div>
                    <div className={row.excess > 0 ? 'le-snapshot-excess' : ''}>{row.excess}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setSnapshotState(null)}>ปิด</button>
            </div>
          </div>
        </div>
      )}

      {snapshotState && typeof snapshotState === 'object' && snapshotState.error && (
        <div className="modal-overlay" onClick={() => setSnapshotState(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>เกิดข้อผิดพลาด</h3>
              <button className="modal-close" onClick={() => setSnapshotState(null)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--red)' }}>{snapshotState.error}</p>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setSnapshotState(null)}>ปิด</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
