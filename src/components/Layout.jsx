import Sidebar from './Sidebar'
import './Layout.css'

export default function Layout({ title, children }) {
  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-main">
        {title && (
          <div className="layout-topbar">
            <h1 className="layout-title">{title}</h1>
          </div>
        )}
        <div className="layout-content">{children}</div>
      </main>
    </div>
  )
}
