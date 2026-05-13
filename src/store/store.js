const USERS_KEY = 'admin_apphr_users';
const ENTITLEMENTS_KEY = 'admin_apphr_entitlements';
const REQUESTS_KEY = 'admin_apphr_requests';
const SESSION_KEY = 'admin_apphr_session';
const PROFILES_KEY = 'admin_apphr_profiles';

const ADMIN_CRED = { email: 'admin@apphr.test', password: 'Admin@123', name: 'แอดมิน ระบบ' };

export const DEFAULT_ENTITLEMENTS = { annual: 5, sick: 30, personal: 6, maternity: 98 };

const SEED_USERS = [
  { id: 'employee', employeeId: 'HAND23', initial: 'TU', nameTh: 'ธรีญา อึ้งตระกูล', nameEn: 'Thareeya Uentrakul', nicknameTh: 'แทร์', email: 'employee@apphr.test', role: 'Project Coordinator', department: 'ฝ่ายโครงการ', employeeLevel: 'Staff', employeeType: 'สัญญาจ้างประจำ', startDate: '01 เม.ย. 2566', salary: '35,000 บาท' },
  { id: 'accounting', employeeId: 'ACC01', initial: 'AC', nameTh: 'บัญชี ผู้ใช้งาน', nameEn: 'Accounting User', nicknameTh: 'บัญชี', email: 'accounting@apphr.test', role: 'Accounting', department: 'ฝ่ายบัญชีและการเงิน', employeeLevel: 'Staff', employeeType: 'สัญญาจ้างประจำ', startDate: '15 ก.พ. 2566', salary: '32,000 บาท' },
  { id: 'manager', employeeId: 'MGR01', initial: 'MU', nameTh: 'หัวหน้า ผู้ใช้งาน', nameEn: 'Manager User', nicknameTh: 'หัวหน้า', email: 'manager@apphr.test', role: 'Manager', department: 'ฝ่ายบริหารงานบุคคล', employeeLevel: 'Manager', employeeType: 'สัญญาจ้างประจำ', startDate: '01 มี.ค. 2565', salary: '55,000 บาท' },
  { id: 'director', employeeId: 'DIR01', initial: 'DU', nameTh: 'อำนวย ผู้บริหาร', nameEn: 'Director User', nicknameTh: 'ผอ.', email: 'director@apphr.test', role: 'Director', department: 'สำนักผู้บริหาร', employeeLevel: 'Director Level', employeeType: 'สัญญาจ้างประจำ', startDate: '01 ม.ค. 2562', salary: '120,000 บาท' },
  { id: 'board', employeeId: 'BRD01', initial: 'BU', nameTh: 'บอร์ด กรรมการ', nameEn: 'Board User', nicknameTh: 'บอร์ด', email: 'board@apphr.test', role: 'Board Member', department: 'คณะกรรมการบริหาร', employeeLevel: 'Board Level', employeeType: 'สัญญาจ้างประจำ', startDate: '01 ม.ค. 2558', salary: '250,000 บาท' },
];

const SEED_REQUESTS = [
  { id: 'REQ001', ownerKey: 'HAND23', ownerName: 'ธรีญา อึ้งตระกูล', type: 'Personal Leave', detail: '13 พ.ค. 2569 - 13 พ.ค. 2569 (1 วัน) · Full Day · ธุระส่วนตัว', status: 'pending', createdAt: '2026-05-12', days: 1 },
  { id: 'REQ002', ownerKey: 'ACC01', ownerName: 'บัญชี ผู้ใช้งาน', type: 'Annual Leave', detail: '15 พ.ค. 2569 - 16 พ.ค. 2569 (2 วัน) · Full Day · พักผ่อนประจำปี', status: 'pending', createdAt: '2026-05-11', days: 2 },
  { id: 'REQ003', ownerKey: 'HAND23', ownerName: 'ธรีญา อึ้งตระกูล', type: 'Sick Leave', detail: '10 พ.ค. 2569 - 10 พ.ค. 2569 (1 วัน) · Full Day · ป่วย', status: 'approved', createdAt: '2026-05-09', days: 1 },
  { id: 'REQ004', ownerKey: 'MGR01', ownerName: 'หัวหน้า ผู้ใช้งาน', type: 'Annual Leave', detail: '20 พ.ค. 2569 - 22 พ.ค. 2569 (3 วัน) · Full Day · พักผ่อน', status: 'rejected', createdAt: '2026-05-08', days: 3 },
  { id: 'REQ005', ownerKey: 'DIR01', ownerName: 'อำนวย ผู้บริหาร', type: 'Annual Leave', detail: '01 มิ.ย. 2569 - 03 มิ.ย. 2569 (3 วัน) · Full Day · พักผ่อน', status: 'pending', createdAt: '2026-05-10', days: 3 },
];

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export function login(email, password) {
  if (email.trim() === ADMIN_CRED.email && password === ADMIN_CRED.password) {
    const session = { email: ADMIN_CRED.email, name: ADMIN_CRED.name };
    save(SESSION_KEY, session);
    return session;
  }
  return null;
}
export function logout() { localStorage.removeItem(SESSION_KEY); }
export function getSession() { return load(SESSION_KEY, null); }

// ─── Users ───────────────────────────────────────────────────────────────────
export function getUsers() {
  const stored = load(USERS_KEY, null);
  if (!stored) { save(USERS_KEY, SEED_USERS); return SEED_USERS; }
  return stored;
}
export function addUser(user) {
  const users = getUsers();
  const next = [...users, { ...user, id: `u_${Date.now()}` }];
  save(USERS_KEY, next);
  return next;
}
export function updateUser(id, data) {
  const next = getUsers().map((u) => (u.id === id ? { ...u, ...data } : u));
  save(USERS_KEY, next);
  return next;
}
export function deleteUser(id) {
  const next = getUsers().filter((u) => u.id !== id);
  save(USERS_KEY, next);
  return next;
}

// ─── Leave Entitlements ───────────────────────────────────────────────────────
export function getEntitlements() { return load(ENTITLEMENTS_KEY, {}); }
export function getEntitlementForUser(userId) {
  const all = getEntitlements();
  return all[userId] ?? { ...DEFAULT_ENTITLEMENTS };
}
export function updateEntitlement(userId, data) {
  const all = getEntitlements();
  const next = { ...all, [userId]: { ...(all[userId] ?? DEFAULT_ENTITLEMENTS), ...data } };
  save(ENTITLEMENTS_KEY, next);
  return next;
}

// ─── Account Profiles ────────────────────────────────────────────────────────
const DEFAULT_BENEFITS = {
  socialSecurity: { titleTh: 'ประกันสังคม', titleEn: 'Social Security', status: 'active', detail: 'นายจ้างและลูกจ้างสมทบฝ่ายละ 5% ของค่าจ้าง (สูงสุด 750 บาท/เดือน)' },
  groupInsurance: { titleTh: 'ประกันกลุ่ม', titleEn: 'Group Insurance', status: 'active', detail: 'วงเงิน 100,000 บาท/ปี ครอบคลุม OPD/IPD' },
  suit:           { titleTh: 'การเบิกชุดสูท', titleEn: 'Suit Allowance', status: 'active', detail: 'เบิกได้ 5,000 บาท/ปี' },
  workWear:       { titleTh: 'การเบิกชุดทำงาน', titleEn: 'Work Uniform Allowance', status: 'active', detail: 'เบิกได้ 3,000 บาท/ปี' },
  equipment:      { titleTh: 'การเบิกอุปกรณ์ทำงาน', titleEn: 'Work Equipment Allowance', status: 'active', detail: 'เบิกได้ 10,000 บาท/ปี' },
};

const SEED_PROFILES = {
  employee: {
    user: {
      prefix: 'นางสาว', nameTh: 'ธรีญา อึ้งตระกูล', nameEn: 'Thareeya Uentrakul',
      nicknameTh: 'แทร์', gender: 'หญิง', age: 28, dob: '12 ส.ค. 2540',
      citizenId: '1234567890123', phone: '0812345678', email: 'employee@apphr.test',
      line: 'thareeya.u',
      addressCard: '123/45 ถนนพระราม 4 แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
      addressNow: '99/8 อาคาร XYZ ชั้น 4 ซอยทองหล่อ 10 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
      emergency: { name: 'คุณแม่ — สมใจ อึ้งตระกูล', phone: '0898765432' },
      education: [{ degreeLevel: 'ปริญญาตรี', faculty: 'คณะรัฐศาสตร์', major: 'รัฐศาสตร์', institute: 'จุฬาลงกรณ์มหาวิทยาลัย', studyYears: '2558-2562' }],
    },
    job: {
      code: 'HAND23', roleTh: 'Project Coordinator', department: 'ฝ่ายโครงการ',
      employeeLevel: 'Staff', type: 'สัญญาจ้างประจำ', startDate: '01 เม.ย. 2566',
      tenure: '3 ปี 1 เดือน', probationStart: '01 เม.ย. 2566', probationEnd: '01 ก.ค. 2566',
      salary: '35,000 บาท',
      bank: { name: 'ธนาคารกสิกรไทย', branch: 'สาขาทองหล่อ', acc: '123-4-56789-0', accName: 'ธรีญา อึ้งตระกูล' },
      positionHistory: [
        { year: '2567', from: 'Project Assistant', to: 'Project Coordinator', salaryChange: '+15%' },
        { year: '2566', from: '—', to: 'Project Assistant', salaryChange: '25,000' },
      ],
      benefits: DEFAULT_BENEFITS,
    },
    documents: [
      { kind: 'สำเนาบัตรประชาชน', file: 'national-id-HAND23.pdf', size: '512 KB', date: '01 เม.ย. 2566', status: 'reviewed' },
      { kind: 'สำเนาทะเบียนบ้าน', file: 'house-registration-HAND23.pdf', size: '480 KB', date: '01 เม.ย. 2566', status: 'reviewed' },
      { kind: 'หนังสือรับรองการศึกษา', file: 'education-certificate-HAND23.pdf', size: '768 KB', date: '01 เม.ย. 2566', status: 'reviewed' },
      { kind: 'สำเนาบัญชีธนาคาร', file: 'bank-account-HAND23.pdf', size: '320 KB', date: '01 เม.ย. 2566', status: 'reviewed' },
      { kind: 'สัญญาจ้างงาน', file: 'employment-contract-HAND23.pdf', size: '256 KB', date: '01 เม.ย. 2566', status: 'signed' },
      { kind: 'เอกสารแจ้งปรับเงินเดือน', file: 'salary-adjustment-HAND23-2567.pdf', size: '180 KB', date: '01 เม.ย. 2567', status: 'signed' },
      { kind: 'เอกสารแจ้งปรับตำแหน่ง', file: 'position-adjustment-HAND23-2567.pdf', size: '192 KB', date: '01 เม.ย. 2567', status: 'signed' },
    ],
  },
  accounting: {
    user: {
      prefix: 'นางสาว', nameTh: 'บัญชี ผู้ใช้งาน', nameEn: 'Accounting User',
      nicknameTh: 'บัญชี', gender: 'หญิง', age: 30, dob: '15 ก.พ. 2539',
      citizenId: '110000002002', phone: '0821000002', email: 'accounting@apphr.test',
      line: 'accounting.apphr', addressCard: '', addressNow: '',
      emergency: { name: '—', phone: '—' },
      education: [{ degreeLevel: 'ปริญญาตรี', faculty: 'บริหารธุรกิจ', major: 'การบัญชี', institute: 'มหาวิทยาลัยหอการค้าไทย', studyYears: '2557-2561' }],
    },
    job: {
      code: 'ACC01', roleTh: 'Accounting', department: 'ฝ่ายบัญชีและการเงิน',
      employeeLevel: 'Staff', type: 'สัญญาจ้างประจำ', startDate: '15 ก.พ. 2566',
      tenure: '3 ปี 2 เดือน', probationStart: '15 ก.พ. 2566', probationEnd: '15 พ.ค. 2566',
      salary: '32,000 บาท',
      bank: { name: 'ธนาคารไทยพาณิชย์', branch: 'สาขาอโศก', acc: '200-1-00002-2', accName: 'บัญชี ผู้ใช้งาน' },
      positionHistory: [
        { year: '2567', from: 'Accounting Assistant', to: 'Accounting', salaryChange: '+10%' },
        { year: '2566', from: '—', to: 'Accounting Assistant', salaryChange: '29,000' },
      ],
      benefits: DEFAULT_BENEFITS,
    },
    documents: [
      { kind: 'สำเนาบัตรประชาชน', file: 'national-id-ACC01.pdf', size: '512 KB', date: '15 ก.พ. 2566', status: 'reviewed' },
      { kind: 'สำเนาทะเบียนบ้าน', file: 'house-registration-ACC01.pdf', size: '480 KB', date: '15 ก.พ. 2566', status: 'reviewed' },
      { kind: 'หนังสือรับรองการศึกษา', file: 'education-certificate-ACC01.pdf', size: '768 KB', date: '15 ก.พ. 2566', status: 'reviewed' },
      { kind: 'สำเนาบัญชีธนาคาร', file: 'bank-account-ACC01.pdf', size: '320 KB', date: '15 ก.พ. 2566', status: 'reviewed' },
      { kind: 'สัญญาจ้างงาน', file: 'employment-contract-ACC01.pdf', size: '248 KB', date: '15 ก.พ. 2566', status: 'signed' },
      { kind: 'เอกสารแจ้งปรับเงินเดือน', file: 'salary-adjustment-ACC01-2567.pdf', size: '180 KB', date: '15 ก.พ. 2567', status: 'signed' },
      { kind: 'เอกสารแจ้งปรับตำแหน่ง', file: 'position-adjustment-ACC01-2567.pdf', size: '192 KB', date: '15 ก.พ. 2567', status: 'signed' },
    ],
  },
  manager: {
    user: {
      prefix: 'นาย', nameTh: 'หัวหน้า ผู้ใช้งาน', nameEn: 'Manager User',
      nicknameTh: 'หัวหน้า', gender: 'ชาย', age: 38, dob: '01 มี.ค. 2531',
      citizenId: '110000003003', phone: '0821000003', email: 'manager@apphr.test',
      line: 'manager.apphr', addressCard: '', addressNow: '',
      emergency: { name: '—', phone: '—' },
      education: [{ degreeLevel: 'ปริญญาโท', faculty: 'พาณิชยศาสตร์และการบัญชี', major: 'การจัดการ', institute: 'จุฬาลงกรณ์มหาวิทยาลัย', studyYears: '2555-2557' }],
    },
    job: {
      code: 'MGR01', roleTh: 'Manager', department: 'ฝ่ายบริหารงานบุคคล',
      employeeLevel: 'Manager', type: 'สัญญาจ้างประจำ', startDate: '01 มี.ค. 2565',
      tenure: '4 ปี 2 เดือน', probationStart: '01 มี.ค. 2565', probationEnd: '01 มิ.ย. 2565',
      salary: '55,000 บาท',
      bank: { name: 'ธนาคารกสิกรไทย', branch: 'สาขาทองหล่อ', acc: '200-1-00003-3', accName: 'หัวหน้า ผู้ใช้งาน' },
      positionHistory: [
        { year: '2567', from: 'Assistant Manager', to: 'Manager', salaryChange: '+18%' },
        { year: '2565', from: '—', to: 'Assistant Manager', salaryChange: '46,000' },
      ],
      benefits: DEFAULT_BENEFITS,
    },
    documents: [
      { kind: 'สำเนาบัตรประชาชน', file: 'national-id-MGR01.pdf', size: '512 KB', date: '01 มี.ค. 2565', status: 'reviewed' },
      { kind: 'สำเนาทะเบียนบ้าน', file: 'house-registration-MGR01.pdf', size: '480 KB', date: '01 มี.ค. 2565', status: 'reviewed' },
      { kind: 'หนังสือรับรองการศึกษา', file: 'education-certificate-MGR01.pdf', size: '768 KB', date: '01 มี.ค. 2565', status: 'reviewed' },
      { kind: 'สำเนาบัญชีธนาคาร', file: 'bank-account-MGR01.pdf', size: '320 KB', date: '01 มี.ค. 2565', status: 'reviewed' },
      { kind: 'สัญญาจ้างงาน', file: 'employment-contract-MGR01.pdf', size: '252 KB', date: '01 มี.ค. 2565', status: 'signed' },
      { kind: 'เอกสารแจ้งปรับเงินเดือน', file: 'salary-adjustment-MGR01-2567.pdf', size: '180 KB', date: '01 มี.ค. 2567', status: 'signed' },
      { kind: 'เอกสารแจ้งปรับตำแหน่ง', file: 'position-adjustment-MGR01-2567.pdf', size: '192 KB', date: '01 มี.ค. 2567', status: 'signed' },
    ],
  },
  director: {
    user: {
      prefix: 'นาย', nameTh: 'อำนวย ผู้บริหาร', nameEn: 'Director User',
      nicknameTh: 'ผอ.', gender: 'ชาย', age: 50, dob: '01 ม.ค. 2519',
      citizenId: '110000004004', phone: '0821000004', email: 'director@apphr.test',
      line: 'director.apphr', addressCard: '', addressNow: '',
      emergency: { name: '—', phone: '—' },
      education: [{ degreeLevel: 'ปริญญาโท', faculty: 'บริหารธุรกิจ', major: 'การจัดการเชิงกลยุทธ์', institute: 'มหาวิทยาลัยธรรมศาสตร์', studyYears: '2548-2550' }],
    },
    job: {
      code: 'DIR01', roleTh: 'Director', department: 'สำนักผู้บริหาร',
      employeeLevel: 'Director Level', type: 'สัญญาจ้างประจำ', startDate: '01 ม.ค. 2562',
      tenure: '7 ปี 4 เดือน', probationStart: '01 ม.ค. 2562', probationEnd: '01 เม.ย. 2562',
      salary: '120,000 บาท',
      bank: { name: 'ธนาคารกสิกรไทย', branch: 'สาขาสีลม', acc: '200-1-00004-4', accName: 'อำนวย ผู้บริหาร' },
      positionHistory: [
        { year: '2566', from: 'Senior Manager', to: 'Director', salaryChange: '+22%' },
        { year: '2562', from: '—', to: 'Senior Manager', salaryChange: '95,000' },
      ],
      benefits: DEFAULT_BENEFITS,
    },
    documents: [
      { kind: 'สำเนาบัตรประชาชน', file: 'national-id-DIR01.pdf', size: '512 KB', date: '01 ม.ค. 2562', status: 'reviewed' },
      { kind: 'สำเนาทะเบียนบ้าน', file: 'house-registration-DIR01.pdf', size: '480 KB', date: '01 ม.ค. 2562', status: 'reviewed' },
      { kind: 'หนังสือรับรองการศึกษา', file: 'education-certificate-DIR01.pdf', size: '768 KB', date: '01 ม.ค. 2562', status: 'reviewed' },
      { kind: 'สำเนาบัญชีธนาคาร', file: 'bank-account-DIR01.pdf', size: '320 KB', date: '01 ม.ค. 2562', status: 'reviewed' },
      { kind: 'สัญญาจ้างงาน', file: 'employment-contract-DIR01.pdf', size: '256 KB', date: '01 ม.ค. 2562', status: 'signed' },
      { kind: 'เอกสารแจ้งปรับเงินเดือน', file: 'salary-adjustment-DIR01-2567.pdf', size: '180 KB', date: '01 ม.ค. 2567', status: 'signed' },
      { kind: 'เอกสารแจ้งปรับตำแหน่ง', file: 'position-adjustment-DIR01-2566.pdf', size: '192 KB', date: '01 ม.ค. 2566', status: 'signed' },
    ],
  },
  board: {
    user: {
      prefix: 'นาง', nameTh: 'บอร์ด กรรมการ', nameEn: 'Board User',
      nicknameTh: 'บอร์ด', gender: 'หญิง', age: 60, dob: '01 ม.ค. 2509',
      citizenId: '110000005005', phone: '0821000005', email: 'board@apphr.test',
      line: 'board.apphr', addressCard: '', addressNow: '',
      emergency: { name: '—', phone: '—' },
      education: [{ degreeLevel: 'ปริญญาเอก', faculty: 'พาณิชยศาสตร์และการบัญชี', major: 'บริหารธุรกิจ', institute: 'จุฬาลงกรณ์มหาวิทยาลัย', studyYears: '2540-2544' }],
    },
    job: {
      code: 'BRD01', roleTh: 'Board Member', department: 'คณะกรรมการบริหาร',
      employeeLevel: 'Board Level', type: 'สัญญาจ้างประจำ', startDate: '01 ม.ค. 2558',
      tenure: '11 ปี 4 เดือน', probationStart: '01 ม.ค. 2558', probationEnd: '01 เม.ย. 2558',
      salary: '250,000 บาท',
      bank: { name: 'ธนาคารกรุงเทพ', branch: 'สาขาสีลม', acc: '200-1-00005-5', accName: 'บอร์ด กรรมการ' },
      positionHistory: [
        { year: '2563', from: 'Director', to: 'Board Member', salaryChange: '+30%' },
        { year: '2558', from: '—', to: 'Director', salaryChange: '180,000' },
      ],
      benefits: DEFAULT_BENEFITS,
    },
    documents: [
      { kind: 'สำเนาบัตรประชาชน', file: 'national-id-BRD01.pdf', size: '512 KB', date: '01 ม.ค. 2558', status: 'reviewed' },
      { kind: 'สำเนาทะเบียนบ้าน', file: 'house-registration-BRD01.pdf', size: '480 KB', date: '01 ม.ค. 2558', status: 'reviewed' },
      { kind: 'หนังสือรับรองการศึกษา', file: 'education-certificate-BRD01.pdf', size: '768 KB', date: '01 ม.ค. 2558', status: 'reviewed' },
      { kind: 'สำเนาบัญชีธนาคาร', file: 'bank-account-BRD01.pdf', size: '320 KB', date: '01 ม.ค. 2558', status: 'reviewed' },
      { kind: 'สัญญาจ้างงาน', file: 'employment-contract-BRD01.pdf', size: '264 KB', date: '01 ม.ค. 2558', status: 'signed' },
      { kind: 'เอกสารแจ้งปรับเงินเดือน', file: 'salary-adjustment-BRD01-2567.pdf', size: '180 KB', date: '01 ม.ค. 2567', status: 'signed' },
      { kind: 'เอกสารแจ้งปรับตำแหน่ง', file: 'position-adjustment-BRD01-2563.pdf', size: '192 KB', date: '01 ม.ค. 2563', status: 'signed' },
    ],
  },
};

export function getAccountProfile(userId) {
  const all = load(PROFILES_KEY, null);
  if (!all) { save(PROFILES_KEY, SEED_PROFILES); return SEED_PROFILES[userId] ?? null; }
  return all[userId] ?? SEED_PROFILES[userId] ?? null;
}

export function updateAccountProfile(userId, patch) {
  const all = load(PROFILES_KEY, null) ?? { ...SEED_PROFILES };
  const current = all[userId] ?? SEED_PROFILES[userId] ?? {};
  const next = {
    ...all,
    [userId]: {
      ...current,
      user: patch.user ? { ...current.user, ...patch.user } : current.user,
      job: patch.job ? { ...current.job, ...patch.job } : current.job,
      documents: patch.documents ?? current.documents,
    },
  };
  save(PROFILES_KEY, next);
  return next[userId];
}

// ─── Requests ────────────────────────────────────────────────────────────────
export function getRequests() {
  const stored = load(REQUESTS_KEY, null);
  if (!stored) { save(REQUESTS_KEY, SEED_REQUESTS); return SEED_REQUESTS; }
  return stored;
}
export function approveRequest(id) {
  const next = getRequests().map((r) => (r.id === id ? { ...r, status: 'approved' } : r));
  save(REQUESTS_KEY, next);
  return next;
}
export function rejectRequest(id) {
  const next = getRequests().map((r) => (r.id === id ? { ...r, status: 'rejected' } : r));
  save(REQUESTS_KEY, next);
  return next;
}
