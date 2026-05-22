import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdSave, MdArrowBack, MdSync, MdBusiness } from 'react-icons/md'
import Layout from '../components/Layout'
import { getSettings, updateSettings } from '../store/store'
import './Users.css'         // .acct-header, .acct-card, .btn-*
import './CompanyInfo.css'

const DEFAULT_COMPANY = {
  nameTh: 'บริษัท แฮนด์ วิสาหกิจเพื่อสังคม จำกัด',
  nameEn: 'HAND SOCIAL ENTERPRISE COMPANY LIMITED',
  taxId: '0105559009660',
  phone: '025506141',
  address: 'เลขที่ 13 ซอยอรรคพัฒน์ ถนนสุขุมวิท 49-4 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
  employeeCount: '11 คน',
}

export default function CompanyInfo() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({ ...DEFAULT_COMPANY })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const s = await getSettings()
        if (!cancelled && s) setDraft({ ...DEFAULT_COMPANY, ...(s.company || {}) })
      } catch (err) {
        if (!cancelled) setError(err.message || 'โหลดข้อมูลไม่สำเร็จ')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const set = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setMessage('')
  }

  const save = async () => {
    if (saving || loading) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await updateSettings({ company: draft })
      setMessage('บันทึกข้อมูลบริษัทเรียบร้อย')
    } catch (err) {
      setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="ข้อมูลบริษัท">
      <div className="acct-header">
        <button className="acct-back" onClick={() => navigate('/data-management')}>
          <MdArrowBack /> กลับ
        </button>
        <div className="acct-info">
          <div className="acct-name"><MdBusiness style={{ verticalAlign: 'middle', marginRight: 6 }} />ข้อมูลบริษัท</div>
          <div className="acct-role">บันทึกแล้วจะอัปเดตให้พนักงานทุกคนพร้อมกัน</div>
        </div>
        <div className="acct-actions">
          <button className="btn-ghost" onClick={() => navigate('/data-management')} disabled={saving}>
            ยกเลิก
          </button>
          <button className="btn-primary" onClick={save} disabled={loading || saving}>
            <MdSave /> {saving ? 'กำลังบันทึก…' : 'บันทึก'}
          </button>
        </div>
      </div>

      {message && <div className="dm-alert dm-alert--success"><MdSync /> {message}</div>}
      {error && <div className="dm-alert dm-alert--error">{error}</div>}

      <div className="acct-card">
        <div className="dm-company-grid">
          <label className="dm-field">
            <span>ชื่อบริษัท (ไทย)</span>
            <input value={draft.nameTh || ''} onChange={(e) => set('nameTh', e.target.value)} disabled={loading} />
          </label>
          <label className="dm-field">
            <span>ชื่อบริษัท (อังกฤษ)</span>
            <input value={draft.nameEn || ''} onChange={(e) => set('nameEn', e.target.value)} disabled={loading} />
          </label>
          <label className="dm-field">
            <span>เลขเสียภาษี</span>
            <input value={draft.taxId || ''} onChange={(e) => set('taxId', e.target.value)} disabled={loading} />
          </label>
          <label className="dm-field">
            <span>โทรศัพท์</span>
            <input value={draft.phone || ''} onChange={(e) => set('phone', e.target.value)} disabled={loading} />
          </label>
          <label className="dm-field">
            <span>จำนวนพนักงาน</span>
            <input value={draft.employeeCount || ''} onChange={(e) => set('employeeCount', e.target.value)} disabled={loading} />
          </label>
          <label className="dm-field dm-field--full">
            <span>ที่อยู่จดทะเบียน</span>
            <textarea rows={3} value={draft.address || ''} onChange={(e) => set('address', e.target.value)} disabled={loading} />
          </label>
        </div>
      </div>
    </Layout>
  )
}
