import { useEffect, useMemo, useState } from 'react'
import {
  MdEdit, MdSave, MdClose,
  MdPerson, MdFamilyRestroom, MdAssignment, MdMoreHoriz, MdCheckCircle,
  MdEventRepeat,
} from 'react-icons/md'
import Layout from '../components/Layout'
import LeaveEmployeeList from '../components/LeaveEmployeeList'
import LeaveGroups from '../components/LeaveGroups'
import { getUsers, getLeaveTypes, getEntitlements, getEntitlementForUser, updateEntitlement, getRequests, snapshotAnnualCarry } from '../store/store'
import './LeaveEntitlement.css'

// Group leave types into 4 logical sections for the detail panel.
// Any type not listed here lands in "อื่นๆ" automatically.
const GROUPS = [
  { id: 'basic',  label: 'พื้นฐาน',         icon: <MdPerson />,         types: ['personal', 'sick', 'annual'] },
  { id: 'family', label: 'ครอบครัว / สุขภาพ', icon: <MdFamilyRestroom />, types: ['maternity', 'paternity', 'sterilization'] },
  { id: 'duty',   label: 'หน้าที่ / พัฒนาตน', icon: <MdAssignment />,    types: ['ordination', 'military', 'training'] },
  { id: 'other',  label: 'อื่น ๆ',            icon: <MdMoreHoriz />,      types: ['compensation', 'unpaid'] },
]

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
  const [saveError, setSaveError] = useState('')
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
    setSaveError('')
    // Annual is auto-computed as tier + carryOver on the backend; don't send the
    // computed quota as an "override" or it will lock the value and stop
    // recalculating with tenure or carry changes.
    const { annual: _ignoreAnnual, _annualBase, _annualCarryOver, ...rest } = draft
    const payload = { ...rest, _annualCarryOver: Math.max(0, Math.min(20, Number(carryDraft) || 0)) }
    try {
      const next = await updateEntitlement(selected.id, payload)
      setEntitlementsMap(next || {})
      const fresh = await getEntitlementForUser(selected.id).catch(() => null)
      if (fresh) setSelectedUserEnt(fresh)
      setEditing(false)
      setDraft({})
      setCarryDraft(0)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    } catch (err) {
      setSaveError(err.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่')
    }
  }

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
        <LeaveEmployeeList
          query={query}
          onQueryChange={setQuery}
          users={users}
          filtered={filtered}
          selectedUserId={selectedUserId}
          onSelectUser={selectUser}
          editing={editing}
        />

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
                  {saveError && (
                    <span style={{ fontSize: 12, color: 'var(--red, #c62828)' }}>{saveError}</span>
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

              <LeaveGroups
                sections={sections}
                typeById={typeById}
                selectedUserEnt={selectedUserEnt}
                editing={editing}
                draft={draft}
                setDraft={setDraft}
                carryDraft={carryDraft}
                setCarryDraft={setCarryDraft}
                defaults={defaults}
                selectedEnt={selectedEnt}
                usedFor={usedFor}
              />
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
