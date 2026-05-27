export const THAI_RE = /[฀-๿]/
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function getFieldError(key, value) {
  const v = (value || '').toString().trim()
  switch (key) {
    case 'email':
      if (!v) return 'กรุณากรอกอีเมล'
      if (!EMAIL_RE.test(v)) return 'รูปแบบอีเมลไม่ถูกต้อง'
      return ''
    case 'nameEn':
      if (v && THAI_RE.test(v)) return 'กรุณากรอกเป็นภาษาอังกฤษ (ห้ามใช้อักษรไทย)'
      return ''
    default:
      return ''
  }
}
