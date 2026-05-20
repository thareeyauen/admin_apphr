import { Routes, Route, Navigate } from 'react-router-dom'
import { getSession } from './store/store'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import UserAccount from './pages/UserAccount'
import LeaveEntitlement from './pages/LeaveEntitlement'
import Requests from './pages/Requests'
import Reports from './pages/Reports'

function Protected({ children }) {
  return getSession() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/users" element={<Protected><Users /></Protected>} />
      <Route path="/users/:employeeId" element={<Protected><UserAccount /></Protected>} />
      <Route path="/leave" element={<Protected><LeaveEntitlement /></Protected>} />
      <Route path="/requests" element={<Protected><Requests /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
