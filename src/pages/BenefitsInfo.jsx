import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MdAdd, MdCardGiftcard, MdDelete, MdSave, MdArrowBack, MdSync,
  MdHealthAndSafety, MdLocalHospital, MdCheckroom, MdEngineering, MdLaptop,
} from 'react-icons/md'
import Layout from '../components/Layout'
import { getSettings, updateSettings } from '../store/store'
import './Users.css'         // .acct-header, .acct-card, .btn-*
import './BenefitsInfo.css'

const DEFAULT_BENEFITS = {
  socialSecurity: { titleTh: 'ประกันสังคม', titleEn: 'Social Security', icon: 'socialSecurity', status: 'active', detail: 'นายจ้างและลูกจ้างสมทบฝ่ายละ 5% ของค่าจ้าง (สูงสุด 825 บาท/เดือน)' },
  groupInsurance: { titleTh: 'ประกันกลุ่ม', titleEn: 'Group Insurance', icon: 'groupInsurance', status: 'active', detail: 'สิทธิประกันกลุ่มจะมีให้เป็นไปตามกรมธรรม์เลขที่ 0000130774-100' },
  suit: { titleTh: 'การเบิกชุดสูท', titleEn: 'Suit Allowance', icon: 'suit', status: 'inactive', detail: 'เบิกได้ 3,000 บาท/ปี' },
  workWear: { titleTh: 'การเบิกชุดทำงาน', titleEn: 'Work Uniform Allowance', icon: 'workWear', status: 'active', detail: 'พนักงานที่ผ่านการทดลองงานจะได้รับเสื้อบริษัท (เสื้อคอกลม หรือเสื้อโปโล Logo บริษัท) จำนวนไม่น้อยกว่า 1 ตัว' },
  equipment: { titleTh: 'การเบิกอุปกรณ์ทำงาน', titleEn: 'Work Equipment Allowance', icon: 'equipment', status: 'active', detail: 'พนักงานมีสิทธิขอรับอุปกรณ์ในการทำงานได้โดยฝ่ายงานพิจารณาอนุมัติเป็นรายบุคคล' },
}

const BENEFIT_ICON_OPTIONS = [
  { value: 'socialSecurity', label: 'ประกันสังคม', icon: <MdHealthAndSafety /> },
  { value: 'groupInsurance', label: 'ประกันกลุ่ม', icon: <MdLocalHospital /> },
  { value: 'suit', label: 'ชุดสูท', icon: <MdCheckroom /> },
  { value: 'workWear', label: 'ชุดทำงาน', icon: <MdEngineering /> },
  { value: 'equipment', label: 'อุปกรณ์', icon: <MdLaptop /> },
]
const BENEFIT_ICONS = Object.fromEntries(BENEFIT_ICON_OPTIONS.map((i) => [i.value, i.icon]))

const clone = (v) => JSON.parse(JSON.stringify(v))
const normalize = (key, b = {}) => ({
  titleTh: b.titleTh || '',
  titleEn: b.titleEn || key,
  icon: b.icon || '',
  status: b.status || 'active',
  detail: b.detail || '',
})

export default function BenefitsInfo() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState(clone(DEFAULT_BENEFITS))
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const activeCount = useMemo(
    () => Object.values(draft).filter((b) => b.status === 'active').length,
    [draft]
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const s = await getSettings()
        if (!cancelled && s?.benefits) setDraft(s.benefits)
      } catch (err) {
        if (!cancelled) setError(err.message || 'โหลดข้อมูลไม่สำเร็จ')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const set = (key, field, value) => {
    setDraft((d) => ({ ...d, [key]: { ...normalize(key, d[key]), [field]: value } }))
    setMessage('')
  }
  const add = () => {
    const key = `benefit_${Date.now()}`
    setDraft((d) => ({ ...d, [key]: { titleTh: '', titleEn: '', icon: '', status: 'active', detail: '' } }))
  }
  const remove = (key) => {
    setDraft((d) => {
      const n = { ...d }
      delete n[key]
      return n
    })
  }

  const save = async () => {
    if (saving || loading) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await updateSettings({ benefits: draft })
      setMessage('บันทึกสวัสดิการเรียบร้อย')
    } catch (err) {
      setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="ข้อมูลสวัสดิการ">
      <div className="acct-header">
        <button className="acct-back" onClick={() => navigate('/data-management')}>
          <MdArrowBack /> กลับ
        </button>
        <div className="acct-info">
          <div className="acct-name"><MdCardGiftcard style={{ verticalAlign: 'middle', marginRight: 6 }} />ข้อมูลสวัสดิการ</div>
          <div className="acct-role">
            ใช้งานอยู่ {activeCount} รายการ · บันทึกแล้วจะอัปเดตให้พนักงานทุกคนพร้อมกัน
          </div>
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
        <div className="dm-section-head" style={{ marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>รายการสวัสดิการ</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>
              เพิ่ม / แก้ไข / ปิดการใช้งาน รายการ
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={add} disabled={loading}>
            <MdAdd /> เพิ่มสวัสดิการ
          </button>
        </div>

        <div className="dm-benefit-list">
          {Object.entries(draft).map(([key, raw]) => {
            const benefit = normalize(key, raw)
            const iconNode = BENEFIT_ICONS[benefit.icon] || null
            return (
              <div key={key} className={'dm-benefit' + (benefit.status === 'inactive' ? ' is-inactive' : '') + (iconNode ? '' : ' dm-benefit--no-icon')}>
                {iconNode && <div className="dm-benefit-icon">{iconNode}</div>}
                <div className="dm-benefit-form">
                  <div className="dm-benefit-top">
                    <label className="dm-field">
                      <span>ชื่อไทย</span>
                      <input value={benefit.titleTh} onChange={(e) => set(key, 'titleTh', e.target.value)} />
                    </label>
                    <label className="dm-field">
                      <span>ชื่ออังกฤษ</span>
                      <input value={benefit.titleEn} onChange={(e) => set(key, 'titleEn', e.target.value)} />
                    </label>
                    <label className="dm-field">
                      <span>สถานะ</span>
                      <select value={benefit.status} onChange={(e) => set(key, 'status', e.target.value)}>
                        <option value="active">ใช้งาน</option>
                        <option value="inactive">ไม่ใช้งาน</option>
                      </select>
                    </label>
                  </div>
                  <label className="dm-field">
                    <span>รายละเอียด</span>
                    <textarea rows={2} value={benefit.detail} onChange={(e) => set(key, 'detail', e.target.value)} />
                  </label>
                </div>
                <button type="button" className="dm-delete" onClick={() => remove(key)} aria-label="ลบสวัสดิการ">
                  <MdDelete />
                </button>
              </div>
            )
          })}
          {Object.keys(draft).length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 24 }}>
              ยังไม่มีรายการสวัสดิการ — กด "เพิ่มสวัสดิการ" เพื่อสร้าง
            </p>
          )}
        </div>
      </div>
    </Layout>
  )
}
