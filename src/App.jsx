import { Routes, Route, Navigate } from 'react-router-dom'
import { getSession } from './store/store'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Adduser from './pages/Adduser'
import UserAccount from './pages/UserAccount'
import LeaveEntitlement from './pages/LeaveEntitlement'
import Approvals from './pages/Approvals'
import Requests from './pages/Requests'
import NewRequest from './pages/NewRequest'
import Reports from './pages/Reports'
import DataManagement from './pages/DataManagement'
import CompanyInfo from './pages/CompanyInfo'
import BenefitsInfo from './pages/BenefitsInfo'

function Protected({ children }) {
  return getSession() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/users" element={<Protected><Users /></Protected>} />
      <Route path="/users/new" element={<Protected><Adduser /></Protected>} />
      <Route path="/users/:employeeId" element={<Protected><UserAccount /></Protected>} />
      <Route path="/leave" element={<Protected><LeaveEntitlement /></Protected>} />
      <Route path="/approvals" element={<Protected><Approvals /></Protected>} />
      <Route path="/requests" element={<Protected><Requests /></Protected>} />
      <Route path="/requests/new" element={<Protected><NewRequest /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="/data-management" element={<Protected><DataManagement /></Protected>} />
      <Route path="/data-management/company" element={<Protected><CompanyInfo /></Protected>} />
      <Route path="/data-management/benefits" element={<Protected><BenefitsInfo /></Protected>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
