import { NavLink, useNavigate } from 'react-router-dom'
import { MdDashboard, MdPeople, MdBeachAccess, MdAssignment, MdLogout } from 'react-icons/md'
import { logout, getSession } from '../store/store'
import './Sidebar.css'

const NAV = [
  { to: '/dashboard', icon: <MdDashboard />, label: 'Dashboard' },
  { to: '/users',     icon: <MdPeople />,    label: 'พนักงาน' },
  { to: '/leave',     icon: <MdBeachAccess />, label: 'วันลา' },
  { to: '/requests',  icon: <MdAssignment />, label: 'คำขอ' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const session = getSession()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo">HR</span>
        <div>
          <p className="sidebar-title">AppHR</p>
          <p className="sidebar-sub">Admin Panel</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
          >
            <span className="sidebar-link-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <span className="sidebar-user-avatar">A</span>
          <div>
            <p className="sidebar-user-name">{session?.name || 'Admin'}</p>
            <p className="sidebar-user-email">{session?.email || ''}</p>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          <MdLogout /> ออกจากระบบ
        </button>
      </div>
    </aside>
  )
}
