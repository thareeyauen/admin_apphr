import { useState } from 'react'
import { MdEdit, MdSave, MdClose } from 'react-icons/md'
import Layout from '../components/Layout'
import { getUsers, getEntitlementForUser, updateEntitlement, DEFAULT_ENTITLEMENTS } from '../store/store'
import './LeaveEntitlement.css'

const LEAVE_TYPES = [
  { key: 'annual',   label: 'ลาพักร้อน', max: 30 },
  { key: 'sick',     label: 'ลาป่วย',    max: 60 },
  { key: 'personal', label: 'ลากิจ',     max: 30 },
  { key: 'maternity',label: 'ลาคลอด',    max: 98 },
]

export default function LeaveEntitlement() {
  const users = getUsers()
  const [editing, setEditing] = useState(null) // userId
  const [draft, setDraft] = useState({})
  const [saved, setSaved] = useState(null)

  const openEdit = (userId) => {
    setDraft(getEntitlementForUser(userId))
    setEditing(userId)
  }

  const handleSave = (userId) => {
    updateEntitlement(userId, draft)
    setEditing(null)
    setSaved(userId)
    setTimeout(() => setSaved(null), 2000)
  }

  return (
    <Layout title="จัดการวันลา">
      <p className="le-desc">กำหนดสิทธิ์วันลาประจำปีให้แต่ละพนักงาน ค่าจะมีผลทันทีที่บันทึก</p>

      <div className="le-card">
        <table className="le-table">
          <thead>
            <tr>
              <th>พนักงาน</th>
              {LEAVE_TYPES.map((lt) => <th key={lt.key}>{lt.label}</th>)}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const ent = getEntitlementForUser(u.id)
              const isEditing = editing === u.id
              return (
                <tr key={u.id} className={saved === u.id ? 'le-row--saved' : ''}>
                  <td>
                    <div className="le-user">
                      <span className="le-avatar">{u.initial || '?'}</span>
                      <div>
                        <p className="le-name">{u.nameTh}</p>
                        <p className="le-role">{u.role}</p>
                      </div>
                    </div>
                  </td>
                  {LEAVE_TYPES.map((lt) => (
                    <td key={lt.key}>
                      {isEditing ? (
                        <input
                          className="le-input"
                          type="number" min={0} max={lt.max}
                          value={draft[lt.key] ?? DEFAULT_ENTITLEMENTS[lt.key]}
                          onChange={(e) => setDraft((d) => ({ ...d, [lt.key]: Number(e.target.value) }))}
                        />
                      ) : (
                        <span className="le-val">{ent[lt.key]} <small>วัน</small></span>
                      )}
                    </td>
                  ))}
                  <td>
                    {isEditing ? (
                      <div className="row-actions">
                        <button className="act-btn act-btn--save" onClick={() => handleSave(u.id)} title="บันทึก"><MdSave /></button>
                        <button className="act-btn act-btn--cancel" onClick={() => setEditing(null)} title="ยกเลิก"><MdClose /></button>
                      </div>
                    ) : (
                      <button className="act-btn act-btn--edit" onClick={() => openEdit(u.id)} title="แก้ไข"><MdEdit /></button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
