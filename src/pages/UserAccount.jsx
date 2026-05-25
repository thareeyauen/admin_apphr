import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  MdEdit, MdDelete, MdSave, MdArrowBack,
  MdPerson, MdWorkOutline, MdDescription,
  MdCloudUpload, MdClose,
} from 'react-icons/md'
import Layout from '../components/Layout'
import { getUsers, getAccountProfile, updateAccountProfile, getEmploymentTypes, getPositions, getBanks } from '../store/store'
import './Users.css'

// ─── Constants ────────────────────────────────────────────────────────────────

const JOB_LEVELS = ['Project Level', 'Board Level', 'Director Level']
const DEPARTMENTS = [
  'Board of Directors',
  'Good Governance Research and Learning Department',
  'Collaboration and Coordination Department',
  'Accounting and Finance Department',
  'Open Data for Transparency & Participation Department',
]
const ACCT_TABS = [
  { id: 'general',  label: 'ข้อมูลทั่วไป', icon: <MdPerson /> },
  { id: 'job',      label: 'งาน',           icon: <MdWorkOutline /> },
  { id: 'docs',     label: 'เอกสาร',        icon: <MdDescription /> },
]
const DOC_KINDS = [
  'สำเนาบัตรประชาชน', 'สำเนาทะเบียนบ้าน', 'หนังสือรับรองการศึกษา',
  'สำเนาบัญชีธนาคาร', 'สัญญาจ้างงาน', 'เอกสารแจ้งปรับเงินเดือน', 'เอกสารแจ้งปรับตำแหน่ง',
]
const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function getInitials(name = '') {
  return name.trim().split(' ').map((w) => w[0] || '').join('').slice(0, 2).toUpperCase() || '?'
}
function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
function thaiDate(d = new Date()) {
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}

// ─── Shared key-value components ──────────────────────────────────────────────

function AKV({ k, v, mono, multiline }) {
  return (
    <div className="akv">
      <div className="akv-key">{k}</div>
      <div className={'akv-val' + (mono ? ' akv-val--mono' : '') + (multiline ? ' akv-val--ml' : '')}>{v || '—'}</div>
    </div>
  )
}

function AKVEdit({ k, value, onChange, type = 'text', multiline = false, options }) {
  return (
    <label className="akv akv--edit">
      <span className="akv-key">{k}</span>
      {options ? (
        <select className="akv-field" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : multiline ? (
        <textarea className="akv-field akv-field--ta" value={value || ''} rows={3} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="akv-field" type={type} value={value ?? ''} onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} />
      )}
    </label>
  )
}

function AGroup({ title, cols = 3, children }) {
  return (
    <div className="a-group">
      {title && <div className="a-group-title">{title}</div>}
      <div className="a-grid" style={{ '--acols': cols }}>{children}</div>
    </div>
  )
}

// ─── General section ──────────────────────────────────────────────────────────

function GeneralSection({ u, editing, draft, onDraftChange }) {
  const set = (k, v) => onDraftChange({ ...draft, [k]: v })
  const setEm = (k, v) => onDraftChange({ ...draft, emergency: { ...draft.emergency, [k]: v } })
  const setEdu = (i, k, v) => {
    const edu = [...(draft.education || [])]
    edu[i] = { ...edu[i], [k]: v }
    onDraftChange({ ...draft, education: edu })
  }
  const addEduRow = () => onDraftChange({
    ...draft,
    education: [...(draft.education || []), { degreeLevel: '', faculty: '', major: '', institute: '', studyYears: '' }],
  })
  const removeEduRow = (i) => onDraftChange({
    ...draft,
    education: (draft.education || []).filter((_, idx) => idx !== i),
  })
  return (
    <>
      <AGroup title="ข้อมูลส่วนตัว" cols={3}>
        {editing ? (
          <>
            <AKVEdit k="คำนำหน้า"          value={draft.prefix}     onChange={(v) => set('prefix', v)} options={['', 'นาย', 'นาง', 'นางสาว', 'ดร.']} />
            <AKVEdit k="ชื่อ-นามสกุล (TH)" value={draft.nameTh}     onChange={(v) => set('nameTh', v)} />
            <AKVEdit k="ชื่อ-นามสกุล (EN)" value={draft.nameEn}     onChange={(v) => set('nameEn', v)} />
            <AKVEdit k="ชื่อเล่น"           value={draft.nicknameTh} onChange={(v) => set('nicknameTh', v)} />
            <AKVEdit k="เพศ"                value={draft.gender}     onChange={(v) => set('gender', v)} options={['', 'Male', 'Female']} />
            <AKVEdit k="วัน/เดือน/ปีเกิด"  value={draft.dob}        onChange={(v) => set('dob', v)} type="date" />
            <AKVEdit k="อายุ" type="number" value={draft.age}        onChange={(v) => set('age', v)} />
            <AKVEdit k="เลขบัตรประชาชน"    value={draft.citizenId}  onChange={(v) => set('citizenId', v)} />
          </>
        ) : (
          <>
            <AKV k="คำนำหน้า"          v={u.prefix} />
            <AKV k="ชื่อ-นามสกุล (TH)" v={u.nameTh} />
            <AKV k="ชื่อ-นามสกุล (EN)" v={u.nameEn} />
            <AKV k="ชื่อเล่น"           v={u.nicknameTh} />
            <AKV k="เพศ"                v={u.gender} />
            <AKV k="วัน/เดือน/ปีเกิด"  v={u.dob} />
            <AKV k="อายุ"               v={u.age ? `${u.age} ปี` : null} />
            <AKV k="เลขบัตรประชาชน"    v={u.citizenId} mono />
          </>
        )}
      </AGroup>
      <AGroup title="ช่องทางติดต่อ" cols={3}>
        {editing ? (
          <>
            <AKVEdit k="Email"    type="email" value={draft.email} onChange={(v) => set('email', v)} />
            <AKVEdit k="เบอร์โทร"             value={draft.phone} onChange={(v) => set('phone', v)} />
            <AKVEdit k="Line ID"              value={draft.line}  onChange={(v) => set('line', v)} />
          </>
        ) : (
          <>
            <AKV k="Email"    v={u.email} mono />
            <AKV k="เบอร์โทร" v={u.phone} mono />
            <AKV k="Line ID"  v={u.line}  mono />
          </>
        )}
      </AGroup>
      <AGroup title="ที่อยู่" cols={2}>
        {editing ? (
          <>
            <AKVEdit k="ที่อยู่ตามบัตรประชาชน" value={draft.addressCard} multiline onChange={(v) => set('addressCard', v)} />
            <AKVEdit k="ที่อยู่ปัจจุบัน"        value={draft.addressNow}  multiline onChange={(v) => set('addressNow', v)} />
          </>
        ) : (
          <>
            <AKV k="ที่อยู่ตามบัตรประชาชน" v={u.addressCard} multiline />
            <AKV k="ที่อยู่ปัจจุบัน"        v={u.addressNow}  multiline />
          </>
        )}
      </AGroup>
      <AGroup title="ผู้ติดต่อฉุกเฉิน" cols={2}>
        {editing ? (
          <>
            <AKVEdit k="ชื่อผู้ติดต่อ" value={draft.emergency?.name}  onChange={(v) => setEm('name', v)} />
            <AKVEdit k="เบอร์โทร"      value={draft.emergency?.phone} onChange={(v) => setEm('phone', v)} />
          </>
        ) : (
          <>
            <AKV k="ชื่อผู้ติดต่อ" v={u.emergency?.name} />
            <AKV k="เบอร์โทร"      v={u.emergency?.phone} mono />
          </>
        )}
      </AGroup>
      <AGroup title="การศึกษา" cols={1}>
        <div className="a-table">
          <div className={'a-row a-row--head a-row--edu' + (editing ? ' a-row--edu-edit' : '')}>
            <div>วุฒิการศึกษา</div><div>คณะ</div><div>สาขา</div><div>สถาบัน</div><div>ปี</div>
            {editing && <div />}
          </div>
          {(editing ? (draft.education || []) : (u.education || [])).map((e, i) => (
            <div key={i} className={'a-row a-row--edu a-row--zebra' + (editing ? ' a-row--edu-edit' : '')}>
              {editing ? (
                <>
                  <input className="akv-field" value={e.degreeLevel || ''} onChange={(ev) => setEdu(i, 'degreeLevel', ev.target.value)} />
                  <input className="akv-field" value={e.faculty     || ''} onChange={(ev) => setEdu(i, 'faculty',     ev.target.value)} />
                  <input className="akv-field" value={e.major       || ''} onChange={(ev) => setEdu(i, 'major',       ev.target.value)} />
                  <input className="akv-field" value={e.institute   || ''} onChange={(ev) => setEdu(i, 'institute',   ev.target.value)} />
                  <input className="akv-field" value={e.studyYears  || ''} onChange={(ev) => setEdu(i, 'studyYears',  ev.target.value)} />
                  <button className="act-btn act-btn--del" onClick={() => removeEduRow(i)}><MdDelete /></button>
                </>
              ) : (
                <>
                  <div className="a-cell-strong">{e.degreeLevel}</div>
                  <div className="a-cell-muted">{e.faculty}</div>
                  <div className="a-cell-muted">{e.major}</div>
                  <div className="a-cell-muted">{e.institute}</div>
                  <div className="a-cell-mono">{e.studyYears}</div>
                </>
              )}
            </div>
          ))}
        </div>
        {editing && <button className="btn-add-row" onClick={addEduRow}>+ เพิ่มการศึกษา</button>}
      </AGroup>
    </>
  )
}

// ─── Job section ──────────────────────────────────────────────────────────────

function JobSection({ j, editing, draft, onDraftChange, approverUserIds = [], allUsers = [], navigate, employmentTypes = [], positions = [], banks = [] }) {
  const set = (k, v) => onDraftChange({ ...draft, [k]: v })
  const usersById = Object.fromEntries((allUsers || []).map((u) => [u.id, u]))
  const approverList = approverUserIds.map((id) => usersById[id] || null)
  const setBank = (k, v) => onDraftChange({ ...draft, bank: { ...draft.bank, [k]: v } })
  const setHistory = (i, k, v) => {
    const h = [...(draft.positionHistory || [])]
    h[i] = { ...h[i], [k]: v }
    onDraftChange({ ...draft, positionHistory: h })
  }
  const addRow = () => onDraftChange({ ...draft, positionHistory: [...(draft.positionHistory || []), { year: '', from: '—', to: '', salaryChange: '' }] })
  const removeRow = (i) => onDraftChange({ ...draft, positionHistory: (draft.positionHistory || []).filter((_, idx) => idx !== i) })

  return (
    <>
      <AGroup title="ตำแหน่งและสังกัด" cols={3}>
        {editing
          ? <AKVEdit k="รหัสพนักงาน" value={draft.code} onChange={(v) => set('code', v)} />
          : <AKV k="รหัสพนักงาน" v={j.code} mono />}
        {editing ? (
          <>
            <AKVEdit k="ตำแหน่งงาน"      value={draft.roleTh}         onChange={(v) => set('roleTh', v)} options={positions.length ? (draft.roleTh && !positions.includes(draft.roleTh) ? [draft.roleTh, ...positions] : ['', ...positions]) : undefined} />
            <AKVEdit k="สังกัดฝ่าย/แผนก"  value={draft.department}     onChange={(v) => set('department', v)} options={draft.department && !DEPARTMENTS.includes(draft.department) ? [draft.department, ...DEPARTMENTS] : DEPARTMENTS} />
            <AKVEdit k="ระดับพนักงาน"     value={draft.employeeLevel}  onChange={(v) => set('employeeLevel', v)} options={JOB_LEVELS} />
            <AKVEdit k="ประเภทพนักงาน"    value={draft.type}           onChange={(v) => set('type', v)} options={employmentTypes.length ? (draft.type && !employmentTypes.includes(draft.type) ? [draft.type, ...employmentTypes] : ['', ...employmentTypes]) : undefined} />
            <AKVEdit k="วันเริ่มงาน"      value={draft.startDate}      onChange={(v) => set('startDate', v)} type="date" />
            <AKVEdit k="อายุงาน"          value={draft.tenure}         onChange={(v) => set('tenure', v)} />
            <AKVEdit k="วันเริ่มทดลองงาน" value={draft.probationStart}  onChange={(v) => set('probationStart', v)} type="date" />
            <AKVEdit k="วันผ่านทดลองงาน"  value={draft.probationEnd}   onChange={(v) => set('probationEnd', v)} type="date" />
            <AKVEdit k="เงินเดือน"        value={draft.salary}         onChange={(v) => set('salary', v)} />
          </>
        ) : (
          <>
            <AKV k="ตำแหน่งงาน"      v={j.roleTh} />
            <AKV k="สังกัดฝ่าย/แผนก"  v={j.department} />
            <AKV k="ระดับพนักงาน"     v={j.employeeLevel} />
            <AKV k="ประเภทพนักงาน"    v={j.type} />
            <AKV k="วันเริ่มงาน"      v={j.startDate} />
            <AKV k="อายุงาน"          v={j.tenure} />
            <AKV k="วันเริ่มทดลองงาน" v={j.probationStart} />
            <AKV k="วันผ่านทดลองงาน"  v={j.probationEnd} />
            <AKV k="เงินเดือน"        v={j.salary} mono />
          </>
        )}
      </AGroup>
      <AGroup title="ข้อมูลธนาคาร" cols={3}>
        {editing ? (
          <>
            <AKVEdit k="ชื่อธนาคาร" value={draft.bank?.name}    onChange={(v) => setBank('name', v)} options={banks.length ? (draft.bank?.name && !banks.includes(draft.bank.name) ? [draft.bank.name, ...banks] : ['', ...banks]) : undefined} />
            <AKVEdit k="สาขา"       value={draft.bank?.branch}  onChange={(v) => setBank('branch', v)} />
            <AKVEdit k="เลขบัญชี"   value={draft.bank?.acc}     onChange={(v) => setBank('acc', v)} />
            <AKVEdit k="ชื่อบัญชี"  value={draft.bank?.accName} onChange={(v) => setBank('accName', v)} />
          </>
        ) : (
          <>
            <AKV k="ชื่อธนาคาร" v={j.bank?.name} />
            <AKV k="สาขา"       v={j.bank?.branch} />
            <AKV k="เลขบัญชี"   v={j.bank?.acc}    mono />
            <AKV k="ชื่อบัญชี"  v={j.bank?.accName} />
          </>
        )}
      </AGroup>
      <AGroup title="ประวัติการเปลี่ยนแปลงตำแหน่ง" cols={1}>
        <div className="a-table">
          <div className={'a-row a-row--head a-row--history' + (editing ? ' a-row--history-edit' : '')}>
            <div>ปี</div><div>ตำแหน่ง</div><div>เงินเดือน/ปรับ</div>
            {editing && <div />}
          </div>
          {(editing ? draft.positionHistory : j.positionHistory || []).map((h, i) => (
            <div key={i} className={'a-row a-row--history a-row--zebra' + (editing ? ' a-row--history-edit' : '')}>
              {editing ? (
                <>
                  <input className="akv-field" value={h.year || ''} onChange={(ev) => setHistory(i, 'year', ev.target.value)} placeholder="ปี" />
                  <input className="akv-field" value={h.to   || ''} onChange={(ev) => setHistory(i, 'to',   ev.target.value)} placeholder="ตำแหน่ง" />
                  <input className="akv-field" value={h.salaryChange || ''} onChange={(ev) => setHistory(i, 'salaryChange', ev.target.value)} placeholder="เงินเดือน" />
                  <button className="act-btn act-btn--del" onClick={() => removeRow(i)}><MdDelete /></button>
                </>
              ) : (
                <>
                  <div className="a-cell-mono">{h.year}</div>
                  <div className="a-cell-strong">{h.to}</div>
                  <div className="a-cell-mono">{h.salaryChange || '—'}</div>
                </>
              )}
            </div>
          ))}
        </div>
        {editing && <button className="btn-add-row" onClick={addRow}>+ เพิ่มรายการ</button>}
      </AGroup>
      <AGroup title="ผู้อนุมัติ" cols={1}>
        <div className="a-approvers">
          {approverList.length === 0 ? (
            <p className="a-approvers-empty">ยังไม่ได้กำหนดผู้อนุมัติ — คำขอจะถูกส่งให้แอดมิน</p>
          ) : (
            <div className="a-approvers-chips">
              {approverList.map((u, i) => u ? (
                <span key={u.id} className="a-approver-chip">
                  <span className="a-approver-avatar">{u.initial || getInitials(u.nameEn || u.nameTh)}</span>
                  <span>
                    <span className="a-approver-name">{u.nameTh}</span>
                    <span className="a-approver-role">{u.employeeLevel}</span>
                  </span>
                </span>
              ) : (
                <span key={i} className="a-approver-chip a-approver-chip--missing">ไม่พบผู้ใช้</span>
              ))}
            </div>
          )}
          {navigate && (
            <button type="button" className="btn-add-row" onClick={() => navigate('/approvals')}>
              จัดการสายอนุมัติ →
            </button>
          )}
        </div>
      </AGroup>
    </>
  )
}

// ─── Docs section ─────────────────────────────────────────────────────────────

function DocsSection({ documents, onDelete }) {
  return (
    <div className="a-docs">
      {(documents || []).length === 0 && <div className="a-docs-empty">ยังไม่มีเอกสาร</div>}
      {(documents || []).map((d, i) => (
        <div key={i} className="a-row a-row--doc">
          <span className="a-doc-thumb">PDF</span>
          <div className="a-doc-name">{d.kind}</div>
          <div className="a-doc-file">{d.file}</div>
          <div className="a-doc-meta">{d.size}</div>
          <div className="a-doc-meta">{d.date}</div>
          <button className="act-btn act-btn--del" style={{ flexShrink: 0, marginLeft: 'auto' }} onClick={() => onDelete(i)}><MdDelete /></button>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserAccount() {
  const { employeeId } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [profile, setProfile] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [employmentTypes, setEmploymentTypes] = useState([])
  const [positions, setPositions] = useState([])
  const [banks, setBanks] = useState([])
  const [subTab, setSubTab] = useState('general')

  useEffect(() => {
    getEmploymentTypes().then(setEmploymentTypes).catch(() => {})
    getPositions().then(setPositions).catch(() => {})
    getBanks().then(setBanks).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    getUsers().then(async (list) => {
      const found = list.find((u) => u.employeeId === employeeId)
      if (cancelled) return
      setUser(found || null)
      setAllUsers(list || [])
      if (found) {
        const prof = await getAccountProfile(found.id)
        if (!cancelled) setProfile(prof)
      }
      if (!cancelled) setLoaded(true)
    }).catch(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [employeeId])
  const [editingTab, setEditingTab] = useState(null)
  const [generalDraft, setGeneralDraft] = useState(null)
  const [jobDraft, setJobDraft] = useState(null)
  const [editError, setEditError] = useState('')

  const fileInputRef = useRef(null)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadKind, setUploadKind] = useState(DOC_KINDS[0])

  const isEditing = editingTab === subTab

  const resetEdit = () => { setEditingTab(null); setGeneralDraft(null); setJobDraft(null); setEditError('') }

  const handleSubTab = (id) => { setSubTab(id); resetEdit() }

  const startEdit = () => {
    if (subTab === 'general')  setGeneralDraft(JSON.parse(JSON.stringify(profile.user)))
    if (subTab === 'job') {
      const j = JSON.parse(JSON.stringify(profile.job))
      if (!j.employeeLevel) j.employeeLevel = JOB_LEVELS[0]
      setJobDraft(j)
    }
    setEditingTab(subTab)
  }

  const saveEdit = async () => {
    setEditError('')
    try {
      let updated
      if (subTab === 'general')  updated = await updateAccountProfile(user.id, { user: generalDraft })
      if (subTab === 'job')      updated = await updateAccountProfile(user.id, { job: jobDraft })
      if (updated) setProfile(updated)
      const renamedId = subTab === 'job' && updated?.job?.code && updated.job.code !== employeeId
        ? updated.job.code : null
      resetEdit()
      if (renamedId) navigate(`/users/${renamedId}`, { replace: true })
    } catch (err) {
      setEditError(err.message || 'เกิดข้อผิดพลาด ไม่สามารถบันทึกได้')
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFile(file)
    setUploadKind(DOC_KINDS[0])
    e.target.value = ''
  }

  const confirmUpload = async () => {
    if (!uploadFile || !uploadKind.trim()) return
    const newDoc = { kind: uploadKind, file: uploadFile.name, size: formatFileSize(uploadFile.size), date: thaiDate(), status: 'uploaded' }
    const updated = await updateAccountProfile(user.id, { documents: [...(profile.documents || []), newDoc] })
    setProfile(updated)
    setUploadFile(null)
  }

  const handleDeleteDoc = async (i) => {
    const updated = await updateAccountProfile(user.id, { documents: (profile.documents || []).filter((_, idx) => idx !== i) })
    setProfile(updated)
  }

  if (!loaded) {
    return (
      <Layout title="ข้อมูล Account">
        <div className="acct-empty"><p>กำลังโหลด…</p></div>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout title="ไม่พบผู้ใช้">
        <div className="acct-empty">
          <p>ไม่พบข้อมูล user: {employeeId}</p>
          <button className="btn-ghost" onClick={() => navigate('/users')}>กลับไปรายชื่อ</button>
        </div>
      </Layout>
    )
  }

  const canEditCurrentTab = subTab === 'general' || subTab === 'job'

  return (
    <Layout title="ข้อมูล Account">
      {/* Header */}
      <div className="acct-header">
        <button className="acct-back" onClick={() => navigate('/users')}><MdArrowBack /> รายชื่อพนักงาน</button>
        <div className="acct-avatar">{user.initial || getInitials(user.nameEn || user.nameTh)}</div>
        <div className="acct-info">
          <div className="acct-code">{user.employeeId}</div>
          <div className="acct-name">{user.nameTh}</div>
          <div className="acct-role">{user.role} · {user.department}</div>
        </div>
        <div className="acct-actions">
          {canEditCurrentTab && (
            isEditing ? (
              <>
                <button className="btn-ghost"  onClick={resetEdit}>ยกเลิก</button>
                <button className="btn-primary" onClick={saveEdit}><MdSave /> บันทึก</button>
              </>
            ) : (
              <button className="btn-primary" onClick={startEdit}><MdEdit /> แก้ไข</button>
            )
          )}
          {subTab === 'docs' && (
            <>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelect} />
              <button className="btn-primary" onClick={() => fileInputRef.current?.click()}>
                <MdCloudUpload /> อัปโหลดเอกสาร
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="acct-tabs">
        {ACCT_TABS.map((t) => (
          <button key={t.id} className={'acct-tab' + (subTab === t.id ? ' is-active' : '')} onClick={() => handleSubTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {editError && (
        <div className="uf-error-banner" style={{ margin: '0 0 12px' }}>{editError}</div>
      )}
      {profile && (
        <div className="acct-card">
          {subTab === 'general' && <GeneralSection u={profile.user} editing={isEditing} draft={generalDraft || profile.user} onDraftChange={setGeneralDraft} />}
          {subTab === 'job'     && <JobSection j={profile.job} editing={isEditing} draft={jobDraft || profile.job} onDraftChange={setJobDraft} approverUserIds={user?.approverUserIds || []} allUsers={allUsers} navigate={navigate} employmentTypes={employmentTypes} positions={positions} banks={banks} />}
          {subTab === 'docs'    && <DocsSection documents={profile.documents} onDelete={handleDeleteDoc} />}
        </div>
      )}

      {/* Upload modal */}
      {uploadFile && (
        <div className="modal-overlay" onClick={() => setUploadFile(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>อัปโหลดเอกสาร</h3>
              <button className="modal-close" onClick={() => setUploadFile(null)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label className="uf-field">
                  <span>ประเภทเอกสาร</span>
                  <select className="uf-field-input" value={uploadKind} onChange={(e) => setUploadKind(e.target.value)}>
                    {DOC_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </label>
                <label className="uf-field">
                  <span>ชื่อไฟล์</span>
                  <div className="upload-filename">{uploadFile.name}</div>
                </label>
                <label className="uf-field">
                  <span>ขนาดไฟล์</span>
                  <div style={{ fontSize: '13px', color: 'var(--ink-2)', paddingTop: '4px' }}>{formatFileSize(uploadFile.size)}</div>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setUploadFile(null)}>ยกเลิก</button>
              <button className="btn-primary" onClick={confirmUpload} disabled={!uploadKind.trim()}>
                <MdCloudUpload /> อัปโหลด
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
