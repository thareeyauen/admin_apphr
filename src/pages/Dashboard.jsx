import { useMemo } from 'react'
import { MdPeople, MdHourglassEmpty, MdCheckCircle, MdBeachAccess } from 'react-icons/md'
import Layout from '../components/Layout'
import { getUsers, getRequests } from '../store/store'
import './Dashboard.css'

const LEVEL_ORDER = ['Board Level', 'Director Level', 'Manager', 'Senior Staff', 'Staff']
const TYPE_LABEL = {
  'Annual Leave': 'ลาพักร้อน', 'Sick Leave': 'ลาป่วย',
  'Personal Leave': 'ลากิจ', 'Maternity Leave': 'ลาคลอด',
}
const STATUS_LABEL = { pending: 'รอดำเนินการ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธแล้ว' }

export default function Dashboard() {
  const users = getUsers()
  const requests = getRequests()

  const stats = useMemo(() => ({
    totalUsers: users.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approvedMonth: requests.filter((r) => r.status === 'approved').length,
    totalRequests: requests.length,
  }), [users, requests])

  const levelCounts = useMemo(() => {
    const counts = {}
    users.forEach((u) => { counts[u.employeeLevel] = (counts[u.employeeLevel] || 0) + 1 })
    return LEVEL_ORDER.filter((l) => counts[l]).map((l) => ({ level: l, count: counts[l] }))
  }, [users])

  const recentRequests = useMemo(() =>
    [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [requests]
  )

  return (
    <Layout title="Dashboard">
      <div className="dash-stats">
        <div className="stat-card">
          <span className="stat-icon stat-icon--blue"><MdPeople /></span>
          <div>
            <p className="stat-value">{stats.totalUsers}</p>
            <p className="stat-label">พนักงานทั้งหมด</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon stat-icon--yellow"><MdHourglassEmpty /></span>
          <div>
            <p className="stat-value">{stats.pending}</p>
            <p className="stat-label">คำขอรอดำเนินการ</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon stat-icon--green"><MdCheckCircle /></span>
          <div>
            <p className="stat-value">{stats.approvedMonth}</p>
            <p className="stat-label">อนุมัติแล้ว</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon stat-icon--accent"><MdBeachAccess /></span>
          <div>
            <p className="stat-value">{stats.totalRequests}</p>
            <p className="stat-label">คำขอทั้งหมด</p>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <section className="dash-card">
          <h3 className="dash-card-title">คำขอล่าสุด</h3>
          <table className="dash-table">
            <thead>
              <tr><th>พนักงาน</th><th>ประเภท</th><th>วันที่สร้าง</th><th>สถานะ</th></tr>
            </thead>
            <tbody>
              {recentRequests.map((r) => (
                <tr key={r.id}>
                  <td>{r.ownerName}</td>
                  <td>{TYPE_LABEL[r.type] || r.type}</td>
                  <td>{r.createdAt}</td>
                  <td><span className={`badge badge--${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                </tr>
              ))}
              {recentRequests.length === 0 && (
                <tr><td colSpan={4} className="dash-empty">ยังไม่มีคำขอ</td></tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="dash-card">
          <h3 className="dash-card-title">พนักงานตามระดับ</h3>
          <div className="level-list">
            {levelCounts.map(({ level, count }) => (
              <div key={level} className="level-row">
                <span className="level-name">{level}</span>
                <div className="level-bar-wrap">
                  <div className="level-bar" style={{ width: `${(count / users.length) * 100}%` }} />
                </div>
                <span className="level-count">{count} คน</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  )
}
