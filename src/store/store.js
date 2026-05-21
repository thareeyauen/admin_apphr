// API client for apphr-backend.
// Keeps the public function names used across pages; most are now async.

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
const SESSION_KEY = 'admin_apphr_session';

export const DEFAULT_ENTITLEMENTS = { annual: 5, sick: 30, personal: 6, maternity: 98 };

// ─── Session (sync, localStorage-only) ───────────────────────────────────────
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function saveSession(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
export function getSession() { return loadSession(); }
export function logout() { localStorage.removeItem(SESSION_KEY); }

function authHeaders() {
  const s = loadSession();
  return s?.token ? { Authorization: `Bearer ${s.token}` } : {};
}

async function api(method, path, body) {
  const res = await fetch(API_BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = 'request failed';
    try { msg = (await res.json()).error || msg; } catch { /* noop */ }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export async function login(email, password) {
  try {
    const { token, user } = await api('POST', '/auth/admin/login', { email, password });
    const session = { token, user, name: user.name, email: user.email };
    saveSession(session);
    return session;
  } catch {
    return null;
  }
}

// ─── Users ───────────────────────────────────────────────────────────────────
// Pages consume the legacy shape: { id, employeeId, initial, nameTh, nameEn,
// nicknameTh, email, role, department, employeeLevel, employeeType, startDate }
function toLegacyUser(p) {
  return {
    id: p.id,
    employeeId: p.employeeId,
    initial: p.initial,
    nameTh: p.profile?.user?.nameTh || p.name || '',
    nameEn: p.profile?.user?.nameEn || '',
    nicknameTh: p.profile?.user?.nicknameTh || '',
    email: p.email,
    role: p.profile?.job?.roleTh || p.position || '',
    department: p.profile?.job?.department || '',
    employeeLevel: p.profile?.job?.employeeLevel || p.label || '',
    employeeType: p.profile?.job?.type || '',
    startDate: p.profile?.job?.startDate || '',
    salary: p.profile?.job?.salary || '',
    approverUserIds: Array.isArray(p.approverUserIds) ? p.approverUserIds : [],
  };
}

export async function getUsers() {
  const profiles = await api('GET', '/users');
  return profiles.map(toLegacyUser);
}

export async function addUser(user) {
  await api('POST', '/users', user);
  return await getUsers();
}

export async function updateUser(id, data) {
  await api('PATCH', `/users/${id}`, data);
  return await getUsers();
}

export async function deleteUser(id) {
  await api('DELETE', `/users/${id}`);
  return await getUsers();
}

// Approval chain — admin sets 1–2 approvers per user (by user.id).
export async function updateApprovers(userId, approverUserIds) {
  await api('PATCH', `/users/${userId}`, { approverUserIds });
  return await getUsers();
}

// ─── Leave Entitlements ──────────────────────────────────────────────────────
export async function getLeaveTypes() {
  return await api('GET', '/entitlements/types');
}
export async function getEntitlements() {
  return await api('GET', '/entitlements');
}
export async function getEntitlementForUser(userId) {
  return await api('GET', `/entitlements/${userId}`);
}
export async function updateEntitlement(userId, data) {
  await api('PUT', `/entitlements/${userId}`, data);
  return await api('GET', '/entitlements');
}

// Year-end snapshot: backend computes new _annualCarryOver = min(remaining, 20)
// for every employee from the supplied year's used days. Returns a summary
// (per-user before/after) so admin can review or export.
export async function snapshotAnnualCarry(year) {
  return await api('POST', '/entitlements/snapshot-carry', year ? { year } : {});
}

// ─── Account Profiles ────────────────────────────────────────────────────────
export async function getAccountProfile(userId) {
  const p = await api('GET', `/users/${userId}`);
  if (!p) return null;
  return { user: p.profile.user, job: p.profile.job, company: p.profile.company || {}, documents: p.profile.documents || [] };
}

export async function updateAccountProfile(userId, patch) {
  const body = { profile: {} };
  if (patch.user) body.profile.user = patch.user;
  if (patch.job) body.profile.job = patch.job;
  if (patch.company) body.profile.company = patch.company;
  if (patch.documents !== undefined) body.profile.documents = patch.documents;
  const p = await api('PATCH', `/users/${userId}`, body);
  return { user: p.profile.user, job: p.profile.job, company: p.profile.company || {}, documents: p.profile.documents || [] };
}

// ─── Check-ins ───────────────────────────────────────────────────────────────
export async function getCheckins() {
  return await api('GET', '/checkins');
}

// ─── Requests ────────────────────────────────────────────────────────────────
export async function getRequests() {
  const list = await api('GET', '/requests');
  return list.map((r) => ({
    ...r,
    createdAt: r.createdAt ? r.createdAt.slice(0, 10) : '',
  }));
}
export async function approveRequest(id) {
  await api('PATCH', `/requests/${id}`, { status: 'approved' });
  return await getRequests();
}
export async function rejectRequest(id) {
  await api('PATCH', `/requests/${id}`, { status: 'rejected' });
  return await getRequests();
}
export async function updateRequest(id, data) {
  await api('PATCH', `/requests/${id}`, data);
  return await getRequests();
}
export async function deleteRequest(id) {
  await api('DELETE', `/requests/${id}`);
  return await getRequests();
}
export async function createRequest(data) {
  return await api('POST', '/requests', data);
}
