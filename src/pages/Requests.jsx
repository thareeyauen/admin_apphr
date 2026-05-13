import { useState, useMemo } from 'react'
import { MdCheck, MdClose, MdFilterList } from 'react-icons/md'
import Layout from '../components/Layout'
import { getRequests, approveRequest, rejectRequest } from '../store/store'
import './Requests.css'

const TABS = [
  { key: 'all',      label: 'ทั้งหมด' },
  { key: 'pending',  label: 'รอดำเนินการ' },
  { key: 'approved', label: 'อนุมัติแล้ว' },
  { key: 'rejected', label: 'ปฏิเสธแล้ว' },
]
const TYPE_LABEL = {
  'Annual Leave': 'ลาพักร้อน', 'Sick Leave': 'ลาป่วย',
  'Personal Leave': 'ลากิจ', 'Maternity Leave': 'ลาคลอด',
}
const STATUS_LABEL = { pending: 'รอดำเนินการ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธแล้ว' }

export default function Requests() {
  const [requests, setRequests] = useState(getRequests)
  const [tab, setTab] = useState('all')
  const [confirm, setConfirm] = useState(null) // { id, action: 'approve'|'reject' }

  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'pending').length, [requests])

  const filtered = useMemo(() =>
    tab === 'all' ? requests : requests.filter((r) => r.status === tab),
    [requests, tab]
  )

  const handleConfirm = () => {
    if (!confirm) return
    const next = confirm.action === 'approve'
      ? approveRequest(confirm.id)
      : rejectRequest(confirm.id)
    setRequests(next)
    setConfirm(null)
  }

  return (
    <Layout title="จัดการคำขอ">
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
                  {r.status === 'pending' ? (
                    <div className="row-actions">
                      <button
                        className="act-btn act-btn--approve"
                        title="อนุมัติ"
                        onClick={() => setConfirm({ id: r.id, action: 'approve' })}
                      ><MdCheck /></button>
                      <button
                        className="act-btn act-btn--reject"
                        title="ปฏิเสธ"
                        onClick={() => setConfirm({ id: r.id, action: 'reject' })}
                      ><MdClose /></button>
                    </div>
                  ) : (
                    <span className="req-done">—</span>
                  )}
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
              <p>{confirm.action === 'approve'
                ? 'ต้องการอนุมัติคำขอนี้ใช่หรือไม่?'
                : 'ต้องการปฏิเสธคำขอนี้ใช่หรือไม่?'}</p>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setConfirm(null)}>ยกเลิก</button>
              <button
                className={confirm.action === 'approve' ? 'btn-approve' : 'btn-danger'}
                onClick={handleConfirm}
              >
                {confirm.action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
