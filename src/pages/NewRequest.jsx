import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdSave, MdArrowBack, MdSearch, MdCheckCircle, MdInfoOutline } from 'react-icons/md'
import Layout from '../components/Layout'
import { getUsers, getHolidays, createRequest } from '../store/store'
import {
  LEAVE_TYPES,
  LEAVE_TYPES_BY_LABEL,
  computeEffectiveLeaveDays,
  summarizeRange,
} from '../leaveTypes'
import './Users.css'        // .acct-header, .acct-card, .btn-ghost, .btn-primary
import './Requests.css'     // .req-edit-note (warning banner)
import './NewRequest.css'   // .nr-* styles for this page

// Generated from the shared leaveTypes config so admin always sees the same
// catalog as employee + backend.
const TYPE_OPTIONS = LEAVE_TYPES.map((t) => ({ value: t.label, label: t.labelTh }))

const STATUS_OPTIONS = [
  { value: 'pending',  label: 'รอดำเนินการ' },
  { value: 'approved', label: 'อนุมัติแล้ว' },
  { value: 'rejected', label: 'ปฏิเสธแล้ว' },
]

const DAY_TYPES = [
  { id: 'full',           label: 'เต็มวัน' },
  { id: 'half-morning',   label: 'ครึ่งวันเช้า (09.00-12.00)' },
  { id: 'half-afternoon', label: 'ครึ่งวันบ่าย (12.00-17.00)' },
  { id: 'period',         label: 'ระบุช่วงเวลา' },
]

const APPROVER_LEVELS_FOR = {
  'Project Level':  ['Board Level', 'Director Level'],
  'Director Level': ['Board Level'],
}

const todayKey = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const formatThaiDate = (key) => {
  if (!key) return ''
  const d = new Date(`${key}T00:00:00`)
  if (Number.isNaN(d.getTime())) return key
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function NewRequest() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [holidays, setHolidays] = useState([])

  const today = todayKey()
  const [form, setForm] = useState({
    ownerId: '',
    type: TYPE_OPTIONS[0].value,
    status: 'pending',
    startDateKey: today,
    endDateKey: today,
    dayTypeId: 'full',
    periodStart: '09:00',
    periodEnd: '17:00',
    detail: '',
  })

  useEffect(() => {
    getUsers()
      .then((list) => {
        const manageable = (list || []).filter((u) => u.employeeLevel !== 'Board Level')
        setUsers(manageable)
      })
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false))
    getHolidays().then((list) => setHolidays(list || [])).catch(() => setHolidays([]))
  }, [])

  const holidaySet = useMemo(
    () => new Set((holidays || []).map((h) => h.holiday_date || h)),
    [holidays]
  )
  const holidayLookup = useMemo(() => {
    const m = {}
    for (const h of holidays || []) {
      const date = h.holiday_date || h
      if (date) m[date] = h.name || ''
    }
    return m
  }, [holidays])

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      (u.nameTh || '').toLowerCase().includes(q)
      || (u.employeeId || '').toLowerCase().includes(q)
      || (u.department || '').toLowerCase().includes(q)
    )
  }, [users, query])

  const selectedOwner = users.find((u) => u.id === form.ownerId)
  const selectedLeave = LEAVE_TYPES_BY_LABEL[form.type]

  // Auto-compute days from date range, excluding weekends + company holidays
  // for working-day leave types. Calendar-day types (maternity/paternity/
  // ordination/military/unpaid) count every day.
  const rangeSummary = useMemo(
    () => summarizeRange(form.startDateKey, form.endDateKey, holidaySet),
    [form.startDateKey, form.endDateKey, holidaySet]
  )
  const effectiveDays = useMemo(
    () => selectedLeave
      ? computeEffectiveLeaveDays(selectedLeave, form.startDateKey, form.endDateKey, form.dayTypeId, holidaySet)
      : 0,
    [selectedLeave, form.startDateKey, form.endDateKey, form.dayTypeId, holidaySet]
  )

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleStartChange = (v) => {
    setForm((f) => {
      const next = { ...f, startDateKey: v }
      if (f.endDateKey && f.endDateKey < v) next.endDateKey = v
      return next
    })
  }
  const handleEndChange = (v) => {
    setForm((f) => ({ ...f, endDateKey: v }))
  }

  const canSave = form.ownerId && form.type && effectiveDays > 0 && !saving

  const handleSave = async () => {
    if (!canSave) return
    setError('')
    setSaving(true)
    try {
      const approverLevels = APPROVER_LEVELS_FOR[selectedOwner?.employeeLevel] || []
      const dayTypeCfg = DAY_TYPES.find((d) => d.id === form.dayTypeId) || DAY_TYPES[0]
      const timeLabel = form.dayTypeId === 'period'
        ? `${form.periodStart}-${form.periodEnd}`
        : dayTypeCfg.label
      const payload = {
        ownerId: form.ownerId,
        type: form.type,
        status: form.status,
        startDateKey: form.startDateKey,
        endDateKey: form.endDateKey,
        days: effectiveDays,
        dayTypeId: form.dayTypeId,
        time: timeLabel,
        date: formatThaiDate(form.startDateKey),
        dateKey: form.startDateKey,
        detail: form.detail || `${formatThaiDate(form.startDateKey)} - ${formatThaiDate(form.endDateKey)} (${effectiveDays} วัน) · ${timeLabel} · สร้างโดยแอดมิน`,
        approver: approverLevels.join(' / ') || 'แอดมิน',
        approverLevels,
      }
      await createRequest(payload)
      navigate('/requests')
    } catch (err) {
      setError(err.message || 'ไม่สามารถสร้างคำขอได้')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="สร้างคำขอใหม่">
      <div className="acct-header">
        <button className="acct-back" onClick={() => navigate('/requests')}>
          <MdArrowBack /> กลับ
        </button>
        <div className="acct-info">
          <div className="acct-name">สร้างคำขอใหม่</div>
          <div className="acct-role">แอดมินสร้างคำขอแทนพนักงาน (ยกเว้น Board Level)</div>
        </div>
        <div className="acct-actions">
          <button className="btn-ghost" onClick={() => navigate('/requests')} disabled={saving}>ยกเลิก</button>
          <button className="btn-primary" onClick={handleSave} disabled={!canSave}>
            <MdSave /> {saving ? 'กำลังบันทึก…' : 'บันทึก'}
          </button>
        </div>
      </div>

      <div className="acct-card">
        <div className="nr-grid">
          {/* Employee picker */}
          <div className="nr-field nr-field--full">
            <span className="nr-label">พนักงาน</span>
            <div className="nr-employee-picker">
              {selectedOwner ? (
                <div className="nr-selected-employee">
                  <span className="nr-selected-avatar">{selectedOwner.initial || '?'}</span>
                  <span className="nr-selected-info">
                    <span className="nr-selected-kicker">พนักงานที่เลือก</span>
                    <span className="nr-selected-name">{selectedOwner.nameTh}</span>
                    <span className="nr-selected-meta">
                      {selectedOwner.employeeId} · {selectedOwner.employeeLevel} · {selectedOwner.department || '—'}
                    </span>
                  </span>
                  <span className="nr-selected-status">
                    <MdCheckCircle />
                    เลือกแล้ว
                  </span>
                </div>
              ) : (
                <div className="nr-selected-empty">ยังไม่ได้เลือกพนักงาน</div>
              )}
              <div className="nr-employee-search">
                <MdSearch />
                <input
                  placeholder="ค้นหา ชื่อ / รหัส / แผนก"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="nr-employee-list">
                {loadingUsers && <p className="nr-loading">กำลังโหลด…</p>}
                {!loadingUsers && filteredUsers.length === 0 && (
                  <p className="nr-loading">ไม่พบพนักงาน</p>
                )}
                {filteredUsers.map((u) => (
                  <button
                    type="button"
                    key={u.id}
                    className={`nr-employee-item ${form.ownerId === u.id ? 'is-selected' : ''}`}
                    aria-pressed={form.ownerId === u.id}
                    onClick={() => set('ownerId', u.id)}
                  >
                    <span className="nr-employee-avatar">{u.initial || '?'}</span>
                    <span className="nr-employee-info">
                      <span className="nr-employee-name">{u.nameTh}</span>
                      <span className="nr-employee-meta">{u.employeeId} · {u.employeeLevel} · {u.department || '—'}</span>
                    </span>
                    {form.ownerId === u.id && (
                      <span className="nr-employee-selected-badge">
                        <MdCheckCircle />
                        เลือกแล้ว
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Type */}
          <label className="nr-field">
            <span className="nr-label">ประเภทคำขอ</span>
            <select value={form.type} onChange={(e) => set('type', e.target.value)}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

          {/* Status */}
          <label className="nr-field">
            <span className="nr-label">สถานะเริ่มต้น</span>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>

          {/* Dates */}
          <label className="nr-field">
            <span className="nr-label">วันเริ่มต้น</span>
            <input
              type="date"
              value={form.startDateKey}
              onChange={(e) => handleStartChange(e.target.value)}
            />
          </label>
          <label className="nr-field">
            <span className="nr-label">วันสิ้นสุด</span>
            <input
              type="date"
              value={form.endDateKey}
              min={form.startDateKey}
              onChange={(e) => handleEndChange(e.target.value)}
            />
          </label>

          {/* Day type */}
          <label className="nr-field">
            <span className="nr-label">ประเภทวัน</span>
            <select value={form.dayTypeId} onChange={(e) => set('dayTypeId', e.target.value)}>
              {DAY_TYPES.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </label>

          {/* Period times (only when dayType = 'period') */}
          {form.dayTypeId === 'period' && (
            <>
              <label className="nr-field">
                <span className="nr-label">เวลาเริ่มต้น</span>
                <input
                  type="time"
                  value={form.periodStart}
                  onChange={(e) => set('periodStart', e.target.value)}
                />
              </label>
              <label className="nr-field">
                <span className="nr-label">เวลาสิ้นสุด</span>
                <input
                  type="time"
                  value={form.periodEnd}
                  onChange={(e) => set('periodEnd', e.target.value)}
                />
              </label>
            </>
          )}

          {/* Days */}
          <label className="nr-field">
            <span className="nr-label">จำนวนวันลา (คำนวณอัตโนมัติ)</span>
            <input
              type="number"
              min={0}
              step="0.5"
              value={effectiveDays}
              readOnly
            />
          </label>

          {/* Range breakdown */}
          {rangeSummary.calendar > 0 && selectedLeave && (
            <div className="nr-field nr-field--full nr-range-preview">
              <div className="nr-range-preview__row">
                <span>วันในช่วงที่เลือก (ปฏิทิน)</span>
                <strong>{rangeSummary.calendar} วัน</strong>
              </div>
              {!selectedLeave.countCalendarDays && rangeSummary.weekendDates.length > 0 && (
                <div className="nr-range-preview__row nr-range-preview__row--muted">
                  <span>หัก เสาร์-อาทิตย์</span>
                  <strong>−{rangeSummary.weekendDates.length} วัน</strong>
                </div>
              )}
              {!selectedLeave.countCalendarDays && rangeSummary.holidayDates.length > 0 && (
                <>
                  <div className="nr-range-preview__row nr-range-preview__row--muted">
                    <span>หัก วันหยุดบริษัท</span>
                    <strong>−{rangeSummary.holidayDates.length} วัน</strong>
                  </div>
                  <ul className="nr-range-preview__holidays">
                    {rangeSummary.holidayDates.map((d) => (
                      <li key={d}>{formatThaiDate(d)} — {holidayLookup[d] || 'วันหยุด'}</li>
                    ))}
                  </ul>
                </>
              )}
              <div className="nr-range-preview__row nr-range-preview__row--total">
                <span>นับเป็นวันลาจริง</span>
                <strong>{effectiveDays} วัน</strong>
              </div>
              {selectedLeave.countCalendarDays && (
                <p className="nr-range-preview__note">
                  <MdInfoOutline /> ลาประเภทนี้นับตามปฏิทิน (รวมเสาร์-อาทิตย์และวันหยุดบริษัท)
                </p>
              )}
              {!selectedLeave.countCalendarDays && effectiveDays === 0 && (
                <p className="nr-range-preview__warn">
                  ⚠️ ช่วงวันที่เลือกตรงกับวันหยุดทั้งหมด — ไม่สามารถใช้สิทธิลาได้
                </p>
              )}
            </div>
          )}

          {/* Detail */}
          <label className="nr-field nr-field--full">
            <span className="nr-label">รายละเอียด / เหตุผล</span>
            <textarea
              rows={3}
              value={form.detail}
              onChange={(e) => set('detail', e.target.value)}
              placeholder="ระบุเหตุผล (ถ้าเว้นว่าง ระบบจะใส่รายละเอียดจากช่วงวันที่อัตโนมัติ)"
            />
          </label>
        </div>

        {selectedOwner && form.status === 'approved' && effectiveDays > 0 && (
          <p className="req-edit-note" style={{ marginTop: 16 }}>
            ⚠️ สร้างคำขอด้วยสถานะ "อนุมัติแล้ว" จะหักวันลา {effectiveDays} วัน จากสิทธิ์คงเหลือของ {selectedOwner.nameTh} ทันที
          </p>
        )}

        {error && (
          <p className="req-edit-note" style={{ marginTop: 16, background: 'var(--red-soft)', color: 'var(--red)' }}>
            {error}
          </p>
        )}
      </div>
    </Layout>
  )
}
