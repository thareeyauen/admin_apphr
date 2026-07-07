import { useEffect, useMemo, useState } from 'react'
import {
  MdBusiness, MdHome, MdExplore, MdBeachAccess,
  MdCalendarToday, MdChevronLeft, MdChevronRight,
} from 'react-icons/md'
import Layout from '../components/Layout'
import { getUsers, getRequests, getCheckins } from '../store/store'
import './Dashboard.css'

const LEAVE_TYPES = [
  'Annual Leave', 'Sick Leave', 'Personal Leave', 'Maternity Leave',
  'Compensation Leave', 'Ordination Leave', 'Unpaid Leave', 'Sterilization Leave',
  'Training Leave', 'Military Leave', 'Paternity Leave',
]
const TYPE_LABEL = {
  'Annual Leave': 'ลาพักร้อน',
  'Sick Leave': 'ลาป่วย',
  'Personal Leave': 'ลากิจ',
  'Maternity Leave': 'ลาคลอด',
  'Compensation Leave': 'ลาชดเชยทำงานวันหยุด',
  'Ordination Leave': 'ลาบวช',
  'Unpaid Leave': 'ลาไม่รับค่าจ้าง',
  'Sterilization Leave': 'ลาทำหมัน',
  'Training Leave': 'ลาฝึกอบรม',
  'Military Leave': 'ลาราชการทหาร',
  'Paternity Leave': 'ลาคลอด (พนักงานชาย)',
  'Overtime': 'ทำงานล่วงเวลา',
  'Work Outside': 'ทำงานนอกสถานที่',
  'Work Outsides': 'ทำงานนอกสถานที่',
  'Request Documents': 'ขอเอกสาร',
}

// Matches the tone colors used on the user app's Landing page.
const STATUSES = {
  office:  { label: 'ออฟฟิศ',       color: '#2F7D4D' }, // green
  wfh:     { label: 'WFH',           color: '#1F6FA8' }, // blue
  offsite: { label: 'นอกสถานที่',    color: '#C4895A' }, // orange (accent)
  leave:   { label: 'ลา',            color: '#B43A3A' }, // red
  idle:    { label: 'ยังไม่เช็คอิน', color: '#7C7568' }, // gray
}

const THAI_WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

const dateKeyFor = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const dateFromKey = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const formatThaiLong = (d) =>
  `วัน${THAI_WEEKDAYS[d.getDay()]}ที่ ${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`

const todayKey = dateKeyFor(new Date())

const KNOWN_OFFICE_LOCATIONS = new Set([
  'hand se thonglor',
  'krac chulalongkorn university',
])

function detectCheckinKind(record) {
  const loc = record?.location
  if (!loc || typeof loc === 'object') return 'office'
  const lower = loc.toLowerCase()
  if (lower === 'wfh' || lower.includes('บ้าน') || lower.includes('home')) return 'wfh'
  if (KNOWN_OFFICE_LOCATIONS.has(lower)) return 'office'
  // Any other non-empty string came from the Offsite flow
  return 'offsite'
}

function isActiveOnDate(req, dateKey) {
  const startKey = req.startDateKey || req.dateKey
  const endKey = req.endDateKey || startKey
  if (!startKey) return false
  return dateKey >= startKey && dateKey <= endKey
}

// Status rules (mirrors the user app's Landing logic):
// 1. Approved leave covering this date  →  'leave'  (employee is off, no check-in expected)
// 2. Has a check-in for this date       →  derive office/wfh/offsite from the check-in location
// 3. Otherwise                          →  'idle' (not checked in yet)
// Work Outside requests do NOT change status — the employee still has to check in to confirm presence.
function getStatusForEmployee(emp, checkinsByOwner, requestsByOwner, dateKey) {
  const empKey = emp.employeeId
  const reqs = requestsByOwner.get(empKey) || []
  if (reqs.some((r) => r.status === 'approved' && LEAVE_TYPES.includes(r.type) && isActiveOnDate(r, dateKey))) {
    return 'leave'
  }
  const checkins = (checkinsByOwner.get(empKey) || []).filter((c) => c.dateKey === dateKey)
  if (checkins.length === 0) return 'idle'
  const recent = checkins[0]
  return detectCheckinKind(recent)
}

export default function Dashboard() {
  const [users, setUsers] = useState([])
  const [requests, setRequests] = useState([])
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey)

  const refresh = async () => {
    try {
      const [u, r, c] = await Promise.all([getUsers(), getRequests(), getCheckins()])
      setUsers(u || [])
      setRequests(r || [])
      setCheckins(c || [])
    } catch {
      setUsers([]); setRequests([]); setCheckins([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  // ─── Derived data (depends on selectedDateKey) ─────────────────────────────
  // Dashboard tracks Director Level + Project Level employees only.
  const trackedLevels = ['Director Level', 'Project Level']
  const trackedEmployees = useMemo(
    () => users.filter((u) => trackedLevels.includes(u.employeeLevel)),
    [users]
  )
  const totalEmployees = trackedEmployees.length

  const checkinsByOwner = useMemo(() => {
    const map = new Map()
    for (const c of checkins) {
      const key = c.employeeId || c.ownerKey
      if (!key) continue
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(c)
    }
    return map
  }, [checkins])

  const requestsByOwner = useMemo(() => {
    const map = new Map()
    for (const r of requests) {
      const key = r.employeeId || r.ownerKey
      if (!key) continue
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }
    return map
  }, [requests])

  const statusByEmployee = useMemo(() => {
    const map = new Map()
    for (const e of trackedEmployees) {
      map.set(e.employeeId, getStatusForEmployee(e, checkinsByOwner, requestsByOwner, selectedDateKey))
    }
    return map
  }, [trackedEmployees, checkinsByOwner, requestsByOwner, selectedDateKey])

  const counts = useMemo(() => {
    const c = { office: 0, wfh: 0, offsite: 0, leave: 0, idle: 0 }
    for (const s of statusByEmployee.values()) c[s] = (c[s] || 0) + 1
    return c
  }, [statusByEmployee])

  const checkedInTotal = counts.office + counts.wfh
  const checkedInPct = totalEmployees > 0
    ? Math.round((checkedInTotal / totalEmployees) * 100)
    : 0

  const departments = useMemo(() => {
    const map = new Map()
    for (const e of trackedEmployees) {
      const d = e.department || 'ไม่ระบุแผนก'
      if (!map.has(d)) map.set(d, [])
      map.get(d).push(e)
    }
    return Array.from(map.entries()).map(([name, members]) => ({
      name,
      members: members.sort((a, b) => (a.nameTh || '').localeCompare(b.nameTh || '', 'th')),
    }))
  }, [trackedEmployees])

  // Pending list shows only requests that involve the selected date.
  const pendingRequests = useMemo(
    () =>
      requests
        .filter((r) => r.status === 'pending' && isActiveOnDate(r, selectedDateKey))
        .slice(0, 8),
    [requests, selectedDateKey]
  )

  // ─── Date controls ─────────────────────────────────────────────────────────
  const selectedDate = useMemo(() => dateFromKey(selectedDateKey), [selectedDateKey])
  const isToday = selectedDateKey === todayKey

  const shiftDay = (delta) => {
    const d = dateFromKey(selectedDateKey)
    d.setDate(d.getDate() + delta)
    setSelectedDateKey(dateKeyFor(d))
  }

  // ─── Cards ─────────────────────────────────────────────────────────────────
  const cards = [
    {
      key: 'checkedIn',
      label: isToday ? 'เช็คอินแล้ววันนี้' : 'เช็คอินแล้ว',
      value: checkedInTotal,
      sub: `${checkedInPct}% ของพนักงาน`,
      tint: 'office',
      icon: <MdBusiness />,
    },
    { key: 'wfh',     label: 'WFH',         value: counts.wfh,     tint: 'wfh',     icon: <MdHome /> },
    { key: 'offsite', label: 'นอกสถานที่', value: counts.offsite, tint: 'offsite', icon: <MdExplore /> },
    { key: 'leave',   label: 'ลา',          value: counts.leave,   tint: 'leave',   icon: <MdBeachAccess /> },
  ]

  return (
    <Layout title="Dashboard">
      {/* ─── Date header ───────────────────────────────────────────── */}
      <div className="dash-date">
        <div className="dash-date__main">
          <MdCalendarToday />
          <div>
            <p className="dash-date__title">{formatThaiLong(selectedDate)}</p>
            <p className="dash-date__sub">
              {isToday ? 'แสดงสถานะของวันนี้' : 'แสดงสถานะของวันที่เลือก'}
            </p>
          </div>
        </div>
        <div className="dash-date__controls">
          <button className="dash-date__nav" onClick={() => shiftDay(-1)} title="วันก่อนหน้า">
            <MdChevronLeft />
          </button>
          <input
            type="date"
            className="dash-date__input"
            value={selectedDateKey}
            onChange={(e) => setSelectedDateKey(e.target.value || todayKey)}
          />
          <button className="dash-date__nav" onClick={() => shiftDay(1)} title="วันถัดไป">
            <MdChevronRight />
          </button>
          {!isToday && (
            <button className="dash-date__today" onClick={() => setSelectedDateKey(todayKey)}>
              กลับไปยังวันที่ปัจจุบัน
            </button>
          )}
        </div>
      </div>

      {/* ─── Summary cards ─────────────────────────────────────────── */}
      <div className="dash-stats">
        {cards.map((c) => (
          <div key={c.key} className={`stat-card stat-card--${c.tint}`}>
            <div className="stat-card__total">/{totalEmployees}</div>
            <span className="stat-icon-large"><span>{c.icon}</span></span>
            <div className="stat-body">
              <p className="stat-value">{c.value}</p>
              <p className="stat-label">{c.label}</p>
              {c.sub && <p className="stat-sub">{c.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Dot grid + pending ────────────────────────────────────── */}
      <div className="dash-grid">
        <section className="dash-card">
          <div className="dash-card-head">
            <h3 className="dash-card-title">สถานะทีม — ตามแผนก</h3>
            <span className="dash-card-meta">{selectedDateKey}</span>
          </div>

          <div className="dot-grid">
            {departments.length === 0 && (
              <div className="dash-empty">ยังไม่มีข้อมูลพนักงาน</div>
            )}
            {departments.map((dept) => (
              <div key={dept.name} className="dot-row">
                <div className="dot-row__name">
                  <p className="dot-row__name-main">{dept.name}</p>
                  <p className="dot-row__name-sub">{dept.members.length} คน</p>
                </div>
                <div className="dot-row__dots">
                  {dept.members.map((m) => {
                    const status = statusByEmployee.get(m.employeeId) || 'idle'
                    const meta = STATUSES[status]
                    return (
                      <span
                        key={m.id}
                        className="dot"
                        style={{ background: meta.color }}
                        title={`${m.nameTh} · ${meta.label}`}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="dot-legend">
            {['office', 'wfh', 'offsite', 'leave', 'idle'].map((k) => (
              <span key={k} className="legend-item">
                <span className="legend-dot" style={{ background: STATUSES[k].color }} />
                {STATUSES[k].label}
              </span>
            ))}
          </div>
        </section>

        <section className="dash-side">
          <div className="dash-card dash-card--tight">
            <div className="dash-card-head">
              <h3 className="dash-card-title">รออนุมัติ {isToday ? '(วันนี้)' : ''}</h3>
              <span className="pending-pill">{pendingRequests.length}</span>
            </div>

            {pendingRequests.length === 0 && (
              <div className="dash-empty dash-empty--sm">ไม่มีคำขอที่เกี่ยวข้องในวันนี้</div>
            )}

            <div className="pending-list">
              {pendingRequests.map((r) => (
                <article key={r.id} className="pending-card">
                  <div className="pending-card__head">
                    <div>
                      <p className="pending-card__owner">{r.ownerName || r.userName || '—'}</p>
                      <p className="pending-card__owner-id">{r.ownerKey || r.employeeId || ''}</p>
                    </div>
                    <span className={`pending-type pending-type--${r.type?.toLowerCase().replace(/\s+/g, '-')}`}>
                      {TYPE_LABEL[r.type] || r.type}
                    </span>
                  </div>
                  <p className="pending-card__detail">{r.detail || '—'}</p>
                  <div className="pending-card__actions">
                    <span className="pending-card__date">{r.date || r.dateKey || ''}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      {loading && (
        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-3)' }}>กำลังโหลด…</p>
      )}
    </Layout>
  )
}
