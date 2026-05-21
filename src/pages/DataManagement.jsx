import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdBusiness, MdCardGiftcard, MdChevronRight } from 'react-icons/md'
import Layout from '../components/Layout'
import { getUsers } from '../store/store'
import './DataManagement.css'

export default function DataManagement() {
  const navigate = useNavigate()
  const [employeeCount, setEmployeeCount] = useState(null)

  useEffect(() => {
    getUsers()
      .then((list) => setEmployeeCount((list || []).length))
      .catch(() => setEmployeeCount(0))
  }, [])

  return (
    <Layout title="จัดการข้อมูล">
      <div className="dm-header">
        <div>
          <div className="dm-title">จัดการข้อมูลกลาง</div>
          <div className="dm-subtitle">
            ข้อมูลในส่วนนี้จะถูกใช้ร่วมกันโดยพนักงานทุกคน — เลือกหัวข้อที่ต้องการแก้ไข
          </div>
        </div>
      </div>

      <div className="dm-menu">
        <button
          type="button"
          className="dm-menu-card"
          onClick={() => navigate('/data-management/company')}
        >
          <span className="dm-menu-icon dm-menu-icon--blue"><MdBusiness /></span>
          <span className="dm-menu-body">
            <span className="dm-menu-title">ข้อมูลบริษัท</span>
            <span className="dm-menu-desc">
              ชื่อบริษัท, เลขเสียภาษี, ที่อยู่จดทะเบียน, ช่องทางติดต่อ —
              แสดงในแท็บ บริษัท ของ Account ฝั่งพนักงาน
            </span>
          </span>
          <span className="dm-menu-arrow"><MdChevronRight /></span>
        </button>

        <button
          type="button"
          className="dm-menu-card"
          onClick={() => navigate('/data-management/benefits')}
        >
          <span className="dm-menu-icon dm-menu-icon--green"><MdCardGiftcard /></span>
          <span className="dm-menu-body">
            <span className="dm-menu-title">ข้อมูลสวัสดิการ</span>
            <span className="dm-menu-desc">
              ประกันสังคม, ประกันกลุ่ม, การเบิกชุด/อุปกรณ์ — แสดงในแท็บ สวัสดิการ
              ของ Account ฝั่งพนักงาน
            </span>
          </span>
          <span className="dm-menu-arrow"><MdChevronRight /></span>
        </button>
      </div>

      <div className="dm-menu-note">
        การบันทึกในหน้าใดก็ตามจะอัปเดตข้อมูลให้พนักงาน
        <strong>{employeeCount === null ? '…' : ` ${employeeCount} `}</strong>
        คนพร้อมกัน
      </div>
    </Layout>
  )
}
