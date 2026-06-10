import { MdSearch } from 'react-icons/md'

export default function LeaveEmployeeList({
  query,
  onQueryChange,
  users,
  filtered,
  selectedUserId,
  onSelectUser,
  editing,
}) {
  return (
    <aside className="le-list-panel">
      <div className="le-list-search">
        <MdSearch />
        <input
          placeholder="ค้นหา ชื่อ / รหัส / แผนก"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>
      <div className="le-list-meta">
        แสดง <strong>{filtered.length}</strong> / {users.length} พนักงาน
      </div>
      <div className="le-list-body">
        {filtered.map((u) => (
          <button
            key={u.id}
            className={`le-list-item ${selectedUserId === u.id ? 'is-active' : ''}`}
            onClick={() => onSelectUser(u.id)}
            title={editing ? 'บันทึก/ยกเลิกก่อนเปลี่ยนพนักงาน' : ''}
          >
            <span className="le-list-avatar">{u.initial || '?'}</span>
            <span className="le-list-info">
              <span className="le-list-name">{u.nameTh}</span>
              <span className="le-list-role">{u.role || u.employeeLevel || '—'}</span>
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="le-empty">ไม่พบพนักงาน</p>
        )}
      </div>
    </aside>
  )
}
