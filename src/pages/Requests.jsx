import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdCheck, MdClose, MdFilterList, MdEdit, MdDelete, MdSave, MdAdd } from 'react-icons/md'
import Layout from '../components/Layout'
import { getRequests, approveRequest, rejectRequest, updateRequest, deleteRequest } from '../store/store'
import './Requests.css'

const TABS = [
  { key: 'all',      label: 'ทั้งหมด' },
  { key: 'pending',  label: 'รอดำเนินการ' },
  { key: 'approved', label: 'อนุมัติแล้ว' },
  { key: 'rejected', label: 'ปฏิเสธแล้ว' },
]
const TYPE_LABEL = {
  'Annual Leave':        'ลาพักร้อน',
  'Sick Leave':          'ลาป่วย',
  'Personal Leave':      'ลากิจ',
  'Maternity Leave':     'ลาคลอด',
  'Paternity Leave':     'ลาคลอด (พนักงานชาย)',
  'Compensation Leave':  'ลาชดเชยทำงานวันหยุด',
  'Ordination Leave':    'ลาบวช',
  'Unpaid Leave':        'ลาไม่รับค่าจ้าง',
  'Sterilization Leave': 'ลาทำหมัน',
  'Training Leave':      'ลาฝึกอบรม',
  'Military Leave':      'ลาราชการทหาร',
}
const STATUS_LABEL = { pending: 'รอดำเนินการ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธแล้ว' }

const STATUSES = ['pending', 'approved', 'rejected']

export default function Requests() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [tab, setTab] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [confirm, setConfirm] = useState(null) // { id, action: 'approve'|'reject' }
  const [editForm, setEditForm] = useState(null) // EMPTY_EDIT shape or null
  const [toDelete, setToDelete] = useState(null) // request object or null
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getRequests().then(setRequests).catch(() => setRequests([]))
  }, [])

  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'pending').length, [requests])

  // Unique request types present in data — dropdown adapts to actual content
  const typeOptions = useMemo(() => {
    const set = new Set()
    for (const r of requests) if (r.type) set.add(r.type)
    return Array.from(set).sort()
  }, [requests])

  const filtered = useMemo(() => {
    let list = requests
    if (tab !== 'all') list = list.filter((r) => r.status === tab)
    if (typeFilter !== 'all') list = list.filter((r) => r.type === typeFilter)
    return list
  }, [requests, tab, typeFilter])

  const handleConfirm = async () => {
    if (!confirm) return
    setSaving(true)
    try {
      const id = confirm.request?.id
      const next = await (confirm.action === 'approve'
        ? approveRequest(id)
        : rejectRequest(id))
      setRequests(next)
      setConfirm(null)
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (r) => {
    setEditForm({
      id: r.id,
      type: r.type || '',
      detail: r.detail || '',
      startDateKey: r.startDateKey || '',
      endDateKey: r.endDateKey || '',
      days: Number(r.days) || 0,
      status: r.status || 'pending',
      ownerName: r.ownerName || '',
      ownerKey: r.ownerKey || '',
    })
  }
  const closeEdit = () => setEditForm(null)
  const handleSaveEdit = async () => {
    if (!editForm) return
    setSaving(true)
    try {
      const { id, ownerName, ownerKey, ...patch } = editForm
      const next = await updateRequest(id, patch)
      setRequests(next)
      setEditForm(null)
    } finally {
      setSaving(false)
    }
  }
  const handleDelete = async () => {
    if (!toDelete) return
    setSaving(true)
    try {
      const next = await deleteRequest(toDelete.id)
      setRequests(next)
      setToDelete(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="จัดการคำขอ">
      <div className="req-toolbar">
        <div className="req-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`req-tab ${tab === t.key ? 'req-tab--active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.key === 'pending' && pendingCount > 0 && (
                <span className="req-tab-badge">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="req-toolbar-right">
          <div className="req-type-filter">
            <MdFilterList />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">ทุกประเภท</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t] || t}</option>
              ))}
            </select>
            {typeFilter !== 'all' && (
              <button
                type="button"
                className="req-type-filter-clear"
                onClick={() => setTypeFilter('all')}
                title="ล้างตัวกรอง"
              ><MdClose /></button>
            )}
          </div>
          <button className="req-btn-new" onClick={() => navigate('/requests/new')}>
            <MdAdd /> สร้างคำขอใหม่
          </button>
        </div>
      </div>

      <div className="req-card">
        <table className="req-table">
          <thead>
            <tr>
              <th>พนักงาน</th><th>ประเภทคำขอ</th><th>รายละเอียด</th>
              <th>วันที่สร้าง</th><th>สถานะ</th><th>การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  <p className="req-owner">{r.ownerName}</p>
                  <p className="req-owner-id">{r.ownerKey}</p>
                </td>
                <td><span className="req-type">{TYPE_LABEL[r.type] || r.type}</span></td>
                <td className="req-detail">{r.detail}</td>
                <td className="req-date">{r.createdAt}</td>
                <td><span className={`badge badge--${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                <td>
                  <div className="row-actions">
                    {r.status === 'pending' && (
                      <>
                        <button
                          className="act-btn act-btn--approve"
                          title="อนุมัติ"
                          onClick={() => setConfirm({ request: r, action: 'approve' })}
                        ><MdCheck /></button>
                        <button
                          className="act-btn act-btn--reject"
                          title="ปฏิเสธ"
                          onClick={() => setConfirm({ request: r, action: 'reject' })}
                        ><MdClose /></button>
                      </>
                    )}
                    <button
                      className="act-btn act-btn--edit"
                      title="แก้ไขคำขอ"
                      onClick={() => openEdit(r)}
                    ><MdEdit /></button>
                    <button
                      className="act-btn act-btn--del"
                      title="ลบคำขอ"
                      onClick={() => setToDelete(r)}
                    ><MdDelete /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="table-empty">ไม่มีคำขอในรายการนี้</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{confirm.action === 'approve' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการปฏิเสธ'}</h3>
              <button className="modal-close" onClick={() => setConfirm(null)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <p>
                ต้องการ<strong>{confirm.action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}</strong>คำขอนี้ใช่หรือไม่?
              </p>
              <div className="req-confirm-detail">
                <div className="req-confirm-row">
                  <span>พนักงาน:</span>
                  <strong>{confirm.request.ownerName} <span className="req-confirm-mono">({confirm.request.ownerKey})</span></strong>
                </div>
                <div className="req-confirm-row">
                  <span>ประเภท:</span>
                  <strong>{TYPE_LABEL[confirm.request.type] || confirm.request.type}</strong>
                </div>
                {confirm.request.startDateKey && (
                  <div className="req-confirm-row">
                    <span>ช่วงวันที่:</span>
                    <strong>
                      {confirm.request.startDateKey}
                      {confirm.request.endDateKey && confirm.request.endDateKey !== confirm.request.startDateKey
                        ? ` → ${confirm.request.endDateKey}` : ''}
                      {Number(confirm.request.days) > 0 && ` (${confirm.request.days} วัน)`}
                    </strong>
                  </div>
                )}
                {confirm.request.detail && (
                  <div className="req-confirm-row">
                    <span>รายละเอียด:</span>
                    <strong className="req-confirm-detail-text">{confirm.request.detail}</strong>
                  </div>
                )}
              </div>
              {confirm.action === 'approve' && Number(confirm.request.days) > 0 && (
                <p className="req-edit-note" style={{ marginTop: '10px' }}>
                  หลังอนุมัติ ระบบจะหักวันลา {confirm.request.days} วัน จากสิทธิ์คงเหลือของพนักงานทันที
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setConfirm(null)} disabled={saving}>ยกเลิก</button>
              <button
                className={confirm.action === 'approve' ? 'btn-approve' : 'btn-danger'}
                onClick={handleConfirm}
                disabled={saving}
              >
                {confirm.action === 'approve'
                  ? (saving ? 'กำลังอนุมัติ…' : 'อนุมัติ')
                  : (saving ? 'กำลังปฏิเสธ…' : 'ปฏิเสธ')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit request modal */}
      {editForm && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>แก้ไขคำขอของ {editForm.ownerName} ({editForm.ownerKey})</h3>
              <button className="modal-close" onClick={closeEdit}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div className="req-edit-grid">
                <label className="req-edit-field">
                  <span>ประเภท</span>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                  >
                    {Object.entries(TYPE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                    {!TYPE_LABEL[editForm.type] && editForm.type && (
                      <option value={editForm.type}>{editForm.type}</option>
                    )}
                  </select>
                </label>
                <label className="req-edit-field">
                  <span>สถานะ</span>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </label>
                <label className="req-edit-field">
                  <span>วันเริ่มต้น</span>
                  <input
                    type="date"
                    value={editForm.startDateKey}
                    onChange={(e) => setEditForm((f) => ({ ...f, startDateKey: e.target.value }))}
                  />
                </label>
                <label className="req-edit-field">
                  <span>วันสิ้นสุด</span>
                  <input
                    type="date"
                    value={editForm.endDateKey}
                    onChange={(e) => setEditForm((f) => ({ ...f, endDateKey: e.target.value }))}
                  />
                </label>
                <label className="req-edit-field">
                  <span>จำนวนวัน</span>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={editForm.days}
                    onChange={(e) => setEditForm((f) => ({ ...f, days: Number(e.target.value) || 0 }))}
                  />
                </label>
                <label className="req-edit-field req-edit-field--full">
                  <span>รายละเอียด</span>
                  <textarea
                    rows={3}
                    value={editForm.detail}
                    onChange={(e) => setEditForm((f) => ({ ...f, detail: e.target.value }))}
                  />
                </label>
              </div>
              <p className="req-edit-note">
                การแก้ไขจะอัปเดตยอดสิทธิ์การลาของพนักงานโดยอัตโนมัติ (ระบบคำนวณจากคำขอจริงในระบบ)
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={closeEdit} disabled={saving}>ยกเลิก</button>
              <button className="btn-approve" onClick={handleSaveEdit} disabled={saving}>
                <MdSave /> {saving ? 'กำลังบันทึก…' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {toDelete && (
        <div className="modal-overlay" onClick={() => setToDelete(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>ยืนยันการลบคำขอ</h3>
              <button className="modal-close" onClick={() => setToDelete(null)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <p>ต้องการ<strong>ลบ</strong>คำขอนี้ใช่หรือไม่? <span style={{ color: 'var(--red)' }}>การกระทำนี้ไม่สามารถย้อนกลับได้</span></p>
              <div className="req-confirm-detail">
                <div className="req-confirm-row">
                  <span>พนักงาน:</span>
                  <strong>{toDelete.ownerName} <span className="req-confirm-mono">({toDelete.ownerKey})</span></strong>
                </div>
                <div className="req-confirm-row">
                  <span>ประเภท:</span>
                  <strong>{TYPE_LABEL[toDelete.type] || toDelete.type}</strong>
                </div>
                <div className="req-confirm-row">
                  <span>สถานะ:</span>
                  <strong><span className={`badge badge--${toDelete.status}`}>{STATUS_LABEL[toDelete.status]}</span></strong>
                </div>
                {toDelete.startDateKey && (
                  <div className="req-confirm-row">
                    <span>ช่วงวันที่:</span>
                    <strong>
                      {toDelete.startDateKey}
                      {toDelete.endDateKey && toDelete.endDateKey !== toDelete.startDateKey
                        ? ` → ${toDelete.endDateKey}` : ''}
                      {Number(toDelete.days) > 0 && ` (${toDelete.days} วัน)`}
                    </strong>
                  </div>
                )}
                {toDelete.detail && (
                  <div className="req-confirm-row">
                    <span>รายละเอียด:</span>
                    <strong className="req-confirm-detail-text">{toDelete.detail}</strong>
                  </div>
                )}
              </div>
              {['approved', 'pending'].includes(toDelete.status) && Number(toDelete.days) > 0 && (
                <p className="req-edit-note" style={{ marginTop: '10px' }}>
                  คำขอนี้กำลังถูกนับใน "วันที่ใช้ไปแล้ว" จำนวน {toDelete.days} วัน — เมื่อลบ ระบบจะคืนยอดให้พนักงานอัตโนมัติ
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setToDelete(null)} disabled={saving}>ยกเลิก</button>
              <button className="btn-danger" onClick={handleDelete} disabled={saving}>
                <MdDelete /> {saving ? 'กำลังลบ…' : 'ลบคำขอ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
