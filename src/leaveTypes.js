// Canonical leave-type configuration shared by NewRequest.jsx, LeaveEntitlement.jsx, etc.
// Mirrors c:/apphr_backend/src/leaveTypes.js and c:/apphr/src/leaveTypes.js — keep all three in sync.

export const LEAVE_TYPES = [
  {
    id: 'personal',
    label: 'Personal Leave',
    labelTh: 'ลากิจ',
    quota: 4,
    advanceDays: 3,
    backdateDays: 0,
  },
  {
    id: 'sick',
    label: 'Sick Leave',
    labelTh: 'ลาป่วย',
    quota: 30,
    advanceDays: 0,
    backdateDays: 3,
    certificateAfterDays: 3,
  },
  {
    id: 'annual',
    label: 'Annual Leave',
    labelTh: 'ลาพักร้อน',
    quota: null,
    quotaByTenureYears: [
      { minYears: 1, maxYears: 3, days: 7 },
      { minYears: 3, maxYears: 5, days: 10 },
      { minYears: 5, maxYears: Infinity, days: 15 },
    ],
    minTenureYears: 1,
    carryOverMax: 20,
    advanceDays: 7,
    backdateDays: 0,
  },
  {
    id: 'compensation',
    label: 'Compensation Leave',
    labelTh: 'ลาชดเชยทำงานวันหยุด',
    quota: null,
    advanceDays: 3,
    backdateDays: 0,
    requiresHolidayWorkDate: true,
    requiresSupervisorPreApproval: true,
  },
  {
    id: 'ordination',
    label: 'Ordination Leave',
    labelTh: 'ลาบวช / ลาปฏิบัติหน้าที่ทางศาสนา',
    quota: 15,
    advanceDays: 30,
    backdateDays: 0,
    countCalendarDays: true,
  },
  {
    id: 'unpaid',
    label: 'Unpaid Leave',
    labelTh: 'ลาไม่รับค่าจ้าง',
    quota: 30,
    advanceDays: 30,
    backdateDays: 0,
    countCalendarDays: true,
  },
  {
    id: 'sterilization',
    label: 'Sterilization Leave',
    labelTh: 'ลาทำหมัน',
    quota: 5,
    advanceDays: 3,
    backdateDays: 0,
  },
  {
    id: 'training',
    label: 'Training Leave',
    labelTh: 'ลาฝึกอบรม',
    quota: 30,
    advanceDays: 3,
    backdateDays: 0,
  },
  {
    id: 'military',
    label: 'Military Leave',
    labelTh: 'ลาราชการทหาร',
    quota: 60,
    advanceDays: 30,
    backdateDays: 0,
    countCalendarDays: true,
  },
  {
    id: 'maternity',
    label: 'Maternity Leave',
    labelTh: 'ลาคลอด (พนักงานหญิง)',
    quota: 120,
    advanceDays: 30,
    backdateDays: 0,
    countCalendarDays: true,
  },
  {
    id: 'paternity',
    label: 'Paternity Leave',
    labelTh: 'ลาคลอด (พนักงานชาย)',
    quota: 15,
    advanceDays: 30,
    backdateDays: 0,
    requiresChildBirthDate: true,
    useWithinDaysFromChildBirth: 90,
    countCalendarDays: true,
  },
];

export const LEAVE_TYPES_BY_ID = Object.fromEntries(LEAVE_TYPES.map((t) => [t.id, t]));
export const LEAVE_TYPES_BY_LABEL = Object.fromEntries(LEAVE_TYPES.map((t) => [t.label, t]));
export const LEAVE_TYPE_LABEL_SET = new Set(LEAVE_TYPES.map((t) => t.label));

export function findLeaveType(typeOrLabel) {
  if (!typeOrLabel) return null;
  return LEAVE_TYPES_BY_ID[typeOrLabel] || LEAVE_TYPES_BY_LABEL[typeOrLabel] || null;
}

export function parseFlexibleDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const yyyymmdd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmdd) {
    const [, y, m, d] = yyyymmdd;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function daysBetween(a, b) {
  if (!a || !b) return 0;
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
}

export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function countCalendarDaysInRange(startKey, endKey) {
  const start = parseFlexibleDate(startKey);
  const end   = parseFlexibleDate(endKey) || start;
  if (!start || !end || end < start) return 0;
  return daysBetween(start, end) + 1;
}

export function countWorkingDaysInRange(startKey, endKey, holidaySet = new Set()) {
  const start = parseFlexibleDate(startKey);
  const end   = parseFlexibleDate(endKey) || start;
  if (!start || !end || end < start) return 0;
  let count = 0;
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const stop   = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= stop) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6 && !holidaySet.has(toDateKey(cursor))) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function summarizeRange(startKey, endKey, holidaySet = new Set()) {
  const start = parseFlexibleDate(startKey);
  const end   = parseFlexibleDate(endKey) || start;
  if (!start || !end || end < start) {
    return { calendar: 0, working: 0, holidayDates: [], weekendDates: [] };
  }
  const holidayDates = [];
  const weekendDates = [];
  let working = 0;
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const stop   = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= stop) {
    const key = toDateKey(cursor);
    const dow = cursor.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isHoliday = holidaySet.has(key);
    if (isHoliday) holidayDates.push(key);
    else if (isWeekend) weekendDates.push(key);
    else working += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return {
    calendar: daysBetween(start, end) + 1,
    working,
    holidayDates,
    weekendDates,
  };
}

export function computeEffectiveLeaveDays(leaveCfg, startKey, endKey, dayTypeId, holidaySet) {
  if (leaveCfg.countCalendarDays) {
    return countCalendarDaysInRange(startKey, endKey);
  }
  const working = countWorkingDaysInRange(startKey, endKey, holidaySet || new Set());
  if (working === 1 && (dayTypeId === 'half-morning' || dayTypeId === 'half-afternoon')) {
    return 0.5;
  }
  return working;
}

export function computeTenureYears(startDate, asOf = new Date()) {
  const start = parseFlexibleDate(startDate);
  if (!start) return 0;
  const diffMs = asOf - start;
  if (diffMs <= 0) return 0;
  return diffMs / (365.25 * 24 * 60 * 60 * 1000);
}

export function annualQuotaForTenure(tenureYears) {
  const cfg = LEAVE_TYPES_BY_ID.annual;
  if (!cfg) return 0;
  if (tenureYears < cfg.minTenureYears) return 0;
  const tier = cfg.quotaByTenureYears.find(
    (t) => tenureYears >= t.minYears && tenureYears < t.maxYears
  );
  return tier ? tier.days : 0;
}
