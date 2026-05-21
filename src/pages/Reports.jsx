import { useEffect, useMemo, useState } from 'react'
import {
  MdDownload, MdFilterList, MdAccessTime, MdAssignment,
  MdLocationOn, MdSearch,
} from 'react-icons/md'
import * as XLSX from 'xlsx'
import Layout from '../components/Layout'
import { getUsers, getRequests, getCheckins } from '../store/store'
import './Reports.css'

const TABS = [
  { key: 'checkins', label: 'ประวัติเช็คอิน', icon: <MdAccessTime /> },
  { key: 'requests', label: 'คำขอ',           icon: <MdAssignment /> },
]

const STATUS_LABEL = { pending: 'รอดำเนินการ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธแล้ว' }
const TYPE_LABEL = {
  'Annual Leave': 'ลาพักร้อน',
  'Sick Leave': 'ลาป่วย',
  'Personal Leave': 'ลากิจ',
  'Maternity Leave': 'ลาคลอด',
  'Paternity Leave': 'ลาคลอด (ชาย)',
  'Compensation Leave': 'ลาชดเชยทำงานวันหยุด',
  'Ordination Leave': 'ลาบวช',
  'Unpaid Leave': 'ลาไม่รับค่าจ้าง',
  'Sterilization Leave': 'ลาทำหมัน',
  'Training Leave': 'ลาฝึกอบรม',
  'Military Leave': 'ลาราชการทหาร',
  'Overtime': 'ทำงานล่วงเวลา',
  'Work Outside': 'ทำงานนอกสถานที่',
  'Work Outsides': 'ทำงานนอกสถานที่',
}

const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const daysAgoKey = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Convert a row's date_key (YYYY-MM-DD) to a Date for range comparisons.
const dateKeyOf = (record) =>
  record?.dateKey || record?.startDateKey || (record?.createdAt || '').slice(0, 10) || ''

// Backend returns checkin.location as either a string or { lat, lng, address }.
const locText = (c) => {
  if (!c) return ''
  const loc = c.location
  if (loc == null) return c.address || ''
  if (typeof loc === 'string') return loc
  if (typeof loc === 'object') return loc.address || ''
  return String(loc)
}

// Best-effort detection of office vs WFH vs offsite from a check-in's `location`.
const checkinKindLabel = (c) => {
  const loc = locText(c).toLowerCase()
  if (!loc) return 'ออฟฟิศ'
  if (loc === 'wfh' || loc.includes('บ้าน') || loc.includes('home')) return 'WFH'
  if (loc.includes('offsite') || loc.includes('นอก')) return 'นอกสถานที่'
  return 'ออฟฟิศ'
}

const pad = (n) => String(n).padStart(2, '0')
const fmtKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const enumerateDays = (from, to) => {
  const out = []
  if (!from || !to || from > to) return out
  let d = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  while (d <= end) { out.push(fmtKey(d)); d.setDate(d.getDate() + 1) }
  return out
}
const isWeekend = (key) => {
  const d = new Date(`${key}T00:00:00`)
  const dow = d.getDay()
  return dow === 0 || dow === 6
}

const downloadXlsx = (rows, sheetName, filename) => {
  if (!rows.length) {
    alert('ไม่มีข้อมูลที่จะ export')
    return
  }
  const ws = XLSX.utils.json_to_sheet(rows)
  // Auto column width: longest content per column
  const colWidths = Object.keys(rows[0]).map((k) => {
    const maxLen = Math.max(
      String(k).length,
      ...rows.map((r) => String(r[k] ?? '').length),
    )
    return { wch: Math.min(maxLen + 2, 50) }
  })
  ws['!cols'] = colWidths
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename)
}

export default function Reports() {
  const [users, setUsers] = useState([])
  const [requests, setRequests] = useState([])
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)

  const [tab, setTab] = useState('checkins')
  const [from, setFrom] = useState(daysAgoKey(30))
  const [to, setTo] = useState(todayKey())
  const [employeeId, setEmployeeId] = useState('all')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [checkinStatusFilter, setCheckinStatusFilter] = useState('all') // all | checked-in | no-checkin | on-leave
  const [includeWeekend, setIncludeWeekend] = useState(false)

  useEffect(() => {
    Promise.all([getUsers(), getRequests(), getCheckins()])
      .then(([u, r, c]) => {
        setUsers(u || [])
        setRequests(r || [])
        setCheckins(c || [])
      })
      .catch(() => { setUsers([]); setRequests([]); setCheckins([]) })
      .finally(() => setLoading(false))
  }, [])

  const userByKey = useMemo(() => {
    const map = {}
    for (const u of users) map[u.employeeId] = u
    return map
  }, [users])

  const inRange = (key) => key && key >= from && key <= to
  const matchEmployee = (rec) => employeeId === 'all'
    || rec.employeeId === employeeId
    || rec.ownerKey === employeeId

  // ─── Filtered datasets ──────────────────────────────────────────────────────
  // For check-ins we generate one row per (employee × day) in the selected
  // range so admin can also see WHEN someone failed to check in. Approved leave
  // overrides the "no-checkin" status with "วันลา".
  const filteredCheckins = useMemo(() => {
    if (loading) return []
    const days = enumerateDays(from, to)
    if (days.length === 0) return []
    const selectedUsers = (employeeId === 'all'
      ? users
      : users.filter((u) => u.employeeId === employeeId))

    // Index existing check-ins by (empKey | dateKey) for O(1) lookup
    const checkinIndex = new Map()
    for (const c of checkins) {
      const k = `${c.employeeId || c.ownerKey || ''}|${c.dateKey || ''}`
      if (!checkinIndex.has(k)) checkinIndex.set(k, c)
    }

    // Approved leave intervals per employee
    const leavesByEmp = new Map()
    for (const r of requests) {
      if (r.status !== 'approved') continue
      if (!r.type || !TYPE_LABEL[r.type]) continue
      const empKey = r.employeeId || r.ownerKey
      if (!empKey) continue
      const start = r.startDateKey || r.dateKey
      const end = r.endDateKey || r.startDateKey || r.dateKey
      if (!start) continue
      if (!leavesByEmp.has(empKey)) leavesByEmp.set(empKey, [])
      leavesByEmp.get(empKey).push({ start, end, type: r.type, detail: r.detail })
    }
    const leaveOnDay = (empKey, day) =>
      (leavesByEmp.get(empKey) || []).find((l) => l.start <= day && day <= l.end) || null

    const out = []
    for (const day of days) {
      if (!includeWeekend && isWeekend(day)) continue
      for (const u of selectedUsers) {
        const empKey = u.employeeId
        const checkin = checkinIndex.get(`${empKey}|${day}`) || null
        const leave = !checkin ? leaveOnDay(empKey, day) : null
        let status
        if (checkin) status = 'checked-in'
        else if (leave) status = 'on-leave'
        else status = 'no-checkin'
        out.push({ day, user: u, checkin, leave, status })
      }
    }

    let filtered = out
    if (checkinStatusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === checkinStatusFilter)
    }
    if (query) {
      const q = query.toLowerCase()
      filtered = filtered.filter((r) =>
        (r.user.nameTh || '').toLowerCase().includes(q)
        || (r.user.employeeId || '').toLowerCase().includes(q)
        || (r.user.department || '').toLowerCase().includes(q)
        || locText(r.checkin).toLowerCase().includes(q)
        || (r.leave?.type || '').toLowerCase().includes(q)
      )
    }
    filtered.sort((a, b) => {
      if (b.day !== a.day) return b.day.localeCompare(a.day)
      return (a.user.employeeId || '').localeCompare(b.user.employeeId || '')
    })
    return filtered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, checkins, requests, users, from, to, employeeId, query, includeWeekend, checkinStatusFilter])

  const filteredRequests = useMemo(() => {
    return requests
      .filter((r) => inRange(dateKeyOf(r)))
      .filter(matchEmployee)
      .filter((r) => statusFilter === 'all' || r.status === statusFilter)
      .filter((r) => {
        if (!query) return true
        const q = query.toLowerCase()
        return (r.ownerName || '').toLowerCase().includes(q)
          || (r.type || '').toLowerCase().includes(q)
          || (r.detail || '').toLowerCase().includes(q)
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, from, to, employeeId, query, statusFilter])

  // ─── Export rows (formatted for human-readable Excel) ───────────────────────
  const buildCheckinExportRows = () =>
    filteredCheckins.map((row) => {
      const u = row.user
      const c = row.checkin
      let statusLabel
      if (row.status === 'checked-in') statusLabel = 'เช็คอินแล้ว'
      else if (row.status === 'on-leave') statusLabel = `วันลา (${TYPE_LABEL[row.leave.type] || row.leave.type})`
      else statusLabel = 'ไม่ได้เช็คอิน'
      return {
        'รหัสรายการ': c?.id || '',
        'รหัสพนักงาน': u.employeeId || '',
        'ชื่อพนักงาน': u.nameTh || '',
        'แผนก': u.department || '',
        'วันที่': row.day,
        'สถานะ': statusLabel,
        'เวลา': c?.time || '',
        'ประเภท': c ? checkinKindLabel(c) : '',
        'สถานที่ / ที่อยู่': c ? locText(c) : '',
        'หมายเหตุ': c?.note || row.leave?.detail || '',
      }
    })

  const buildRequestExportRows = () =>
    filteredRequests.map((r) => ({
      'รหัสคำขอ': r.id || '',
      'รหัสพนักงาน': r.employeeId || r.ownerKey || '',
      'ชื่อพนักงาน': r.ownerName || r.userName || '',
      'ประเภท': TYPE_LABEL[r.type] || r.type || '',
      'รายละเอียด': r.detail || '',
      'วันที่เริ่ม': r.startDateKey || r.dateKey || '',
      'วันที่สิ้นสุด': r.endDateKey || r.startDateKey || r.dateKey || '',
      'จำนวนวัน': r.days ?? '',
      'ผู้อนุมัติ': r.approver || '',
      'สถานะ': STATUS_LABEL[r.status] || r.status || '',
      'วันที่ส่ง': (r.createdAt || '').slice(0, 10),
    }))

  const handleExport = () => {
    const stamp = `${from}_${to}`
    if (tab === 'checkins') {
      downloadXlsx(buildCheckinExportRows(), 'ประวัติเช็คอิน', `checkins_${stamp}.xlsx`)
    } else {
      downloadXlsx(buildRequestExportRows(), 'คำขอพนักงาน', `requests_${stamp}.xlsx`)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout title="รายงาน">
      <p className="rep-desc">
        สรุปประวัติการเช็คอินและคำขอของพนักงานทั้งหมด สามารถกรองตามช่วงวันที่และพนักงาน
        แล้ว export เป็นไฟล์ .xlsx ได้
      </p>

      {/* ─── Tabs ────────────────────────────────────────────────── */}
      <div className="rep-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`rep-tab ${tab === t.key ? 'rep-tab--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon}
            {t.label}
            <span className="rep-tab-count">
              {t.key === 'checkins' ? filteredCheckins.length : filteredRequests.length}
            </span>
          </button>
        ))}
      </div>

      {/* ─── Filters ─────────────────────────────────────────────── */}
      <div className="rep-filters">
        <div className="rep-filter">
          <label>ตั้งแต่</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="rep-filter">
          <label>ถึง</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="rep-filter">
          <label>พนักงาน</label>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="all">ทั้งหมด</option>
            {users.map((u) => (
              <option key={u.id} value={u.employeeId}>
                {u.employeeId} · {u.nameTh}
              </option>
            ))}
          </select>
        </div>
        {tab === 'requests' && (
          <div className="rep-filter">
            <label>สถานะ</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">ทั้งหมด</option>
              <option value="pending">รอดำเนินการ</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ปฏิเสธแล้ว</option>
            </select>
          </div>
        )}
        {tab === 'checkins' && (
          <div className="rep-filter">
            <label>สถานะ</label>
            <select value={checkinStatusFilter} onChange={(e) => setCheckinStatusFilter(e.target.value)}>
              <option value="all">ทั้งหมด</option>
              <option value="checked-in">เช็คอินแล้ว</option>
              <option value="no-checkin">ไม่ได้เช็คอิน</option>
              <option value="on-leave">วันลา</option>
            </select>
          </div>
        )}
        <div className="rep-filter rep-filter--search">
          <label>ค้นหา</label>
          <div className="rep-search-wrap">
            <MdSearch />
            <input
              placeholder={tab === 'checkins' ? 'ชื่อ / สถานที่' : 'ชื่อ / ประเภท / รายละเอียด'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        {tab === 'checkins' && (
          <label className="rep-weekend-toggle">
            <input
              type="checkbox"
              checked={includeWeekend}
              onChange={(e) => setIncludeWeekend(e.target.checked)}
            />
            แสดงเสาร์-อาทิตย์
          </label>
        )}
        <button className="rep-export" onClick={handleExport}>
          <MdDownload /> Export .xlsx
        </button>
      </div>

      {/* ─── Table ───────────────────────────────────────────────── */}
      <div className="rep-card">
        {loading && <div className="rep-empty">กำลังโหลด…</div>}

        {!loading && tab === 'checkins' && (
          <div className="rep-table-wrap">
            <table className="rep-table">
              <thead>
                <tr>
                  <th>วันที่</th><th>พนักงาน</th><th>แผนก</th>
                  <th>สถานะ</th><th>เวลา</th><th>ประเภท / สถานที่</th>
                </tr>
              </thead>
              <tbody>
                {filteredCheckins.length === 0 ? (
                  <tr><td colSpan={6} className="rep-empty">ไม่มีรายการในช่วงนี้</td></tr>
                ) : filteredCheckins.map((row, idx) => {
                  const u = row.user
                  const c = row.checkin
                  const kind = c ? checkinKindLabel(c) : null
                  return (
                    <tr key={`${row.day}-${u.id}-${idx}`}>
                      <td className="rep-mono">{row.day}</td>
                      <td>
                        <p className="rep-emp-name">{u.nameTh || '—'}</p>
                        <p className="rep-emp-id">{u.employeeId}</p>
                      </td>
                      <td className="rep-sub">{u.department || '—'}</td>
                      <td>
                        {row.status === 'checked-in' && (
                          <span className="rep-pill rep-pill--ok">เช็คอินแล้ว</span>
                        )}
                        {row.status === 'no-checkin' && (
                          <span className="rep-pill rep-pill--miss">ไม่ได้เช็คอิน</span>
                        )}
                        {row.status === 'on-leave' && (
                          <span className="rep-pill rep-pill--leave">วันลา</span>
                        )}
                      </td>
                      <td className="rep-mono">{c?.time || '—'}</td>
                      <td>
                        {c && (
                          <>
                            <span className={`rep-pill rep-pill--${kind === 'WFH' ? 'wfh' : kind === 'นอกสถานที่' ? 'offsite' : 'office'}`}>
                              {kind}
                            </span>
                            <span className="rep-sub" style={{ marginLeft: 8 }}>{locText(c) || ''}</span>
                          </>
                        )}
                        {row.leave && !c && (
                          <span className="rep-sub">{TYPE_LABEL[row.leave.type] || row.leave.type}</span>
                        )}
                        {!c && !row.leave && <span className="rep-sub">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tab === 'requests' && (
          <div className="rep-table-wrap">
            <table className="rep-table">
              <thead>
                <tr>
                  <th>รหัส</th><th>พนักงาน</th><th>ประเภท</th>
                  <th>รายละเอียด</th><th>วัน</th><th>สถานะ</th><th>วันที่ส่ง</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr><td colSpan={7} className="rep-empty">ไม่มีคำขอในช่วงนี้</td></tr>
                ) : filteredRequests.map((r) => (
                  <tr key={r.id}>
                    <td className="rep-mono">{r.id}</td>
                    <td>
                      <p className="rep-emp-name">{r.ownerName || '—'}</p>
                      <p className="rep-emp-id">{r.employeeId || r.ownerKey || ''}</p>
                    </td>
                    <td>{TYPE_LABEL[r.type] || r.type}</td>
                    <td><div className="rep-detail">{r.detail || '—'}</div></td>
                    <td className="rep-mono">
                      {r.startDateKey && r.endDateKey && r.startDateKey !== r.endDateKey
                        ? `${r.startDateKey} → ${r.endDateKey}`
                        : (r.dateKey || r.startDateKey || '—')}
                      {r.days != null && <span className="rep-days"> · {r.days} วัน</span>}
                    </td>
                    <td>
                      <span className={`badge badge--${r.status}`}>{STATUS_LABEL[r.status]}</span>
                    </td>
                    <td className="rep-mono">{(r.createdAt || '').slice(0, 10) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
