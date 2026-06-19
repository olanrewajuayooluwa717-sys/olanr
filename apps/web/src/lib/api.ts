export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fishmaster_token');
}

export function setAuth(token: string, cycleId?: string, user?: { role?: string; name?: string }) {
  localStorage.setItem('fishmaster_token', token);
  if (cycleId) localStorage.setItem('fishmaster_cycle_id', cycleId);
  if (user?.role) localStorage.setItem('fishmaster_role', user.role);
  if (user?.name) localStorage.setItem('fishmaster_name', user.name);
}

export function clearAuth() {
  localStorage.removeItem('fishmaster_token');
  localStorage.removeItem('fishmaster_cycle_id');
  localStorage.removeItem('fishmaster_role');
  localStorage.removeItem('fishmaster_name');
}

export function getRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fishmaster_role');
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const SAMPLE_PAYLOAD = {
  farmerName: 'AYOOLUWA OGUNSINA',
  farmName: 'Fishmaster Foods Ltd',
  location: 'AKOBO',
  city: 'Ibadan',
  state: 'Oyo',
  country: 'Nigeria',
  pondName: 'fishmaster 1',
  pondNumber: 12,
  dimensions: { lengthM: 2, widthM: 3, depthM: 1.3 },
  averageWeightAtStockingG: 8,
  fingerlingPrice: 30,
  quantityStocked: 2500,
  stockingDate: '2021-01-31',
  desiredCrudeProteinPct: 38,
  desiredFeedQuantityKg: 1500,
};

export async function fetchCycleReport(cycleId?: string | null) {
  const url = cycleId
    ? `${API_URL}/api/cycles/${cycleId}/report`
    : `${API_URL}/api/cycles/demo/report`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  if (data.report) return { report: data.report, cycleId: data.cycleId as string, pondName: data.pondName as string };
  return { report: data, cycleId: cycleId ?? null, pondName: 'fishmaster 1' };
}

export async function fetchReportFallback() {
  const res = await fetch(`${API_URL}/api/reports/stock-cycle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(SAMPLE_PAYLOAD),
  });
  if (!res.ok) throw new Error('API unreachable');
  const report = await res.json();
  return { report, cycleId: null, pondName: 'fishmaster 1 (offline)' };
}

export async function registerFarm(body: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/api/cycles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Registration failed');
  return data as { cycleId: string; farmId: string; pondId: string; token: string; userId: string };
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Login failed');
  return data as { token: string; user: { id: string; name: string; email: string; role: string } };
}
