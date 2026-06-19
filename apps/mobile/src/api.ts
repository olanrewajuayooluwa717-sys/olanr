// Use your PC's LAN IP when testing on a physical phone (not localhost)
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  token: 'fishmaster_token',
  cycleId: 'fishmaster_cycle_id',
  role: 'fishmaster_role',
  name: 'fishmaster_name',
};

export async function getToken() {
  return AsyncStorage.getItem(KEYS.token);
}

export async function setAuth(token: string, cycleId?: string, user?: { role?: string; name?: string }) {
  await AsyncStorage.setItem(KEYS.token, token);
  if (cycleId) await AsyncStorage.setItem(KEYS.cycleId, cycleId);
  if (user?.role) await AsyncStorage.setItem(KEYS.role, user.role);
  if (user?.name) await AsyncStorage.setItem(KEYS.name, user.name);
}

export async function clearAuth() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}

export async function getCycleId() {
  return AsyncStorage.getItem(KEYS.cycleId);
}

export async function authHeaders() {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...(await authHeaders()), ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
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

export async function fetchFirstCycleId(token: string) {
  const res = await fetch(`${API_URL}/api/cycles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const cycles = await res.json();
  if (!res.ok || !Array.isArray(cycles) || cycles.length === 0) return null;
  return cycles[0].id as string;
}

export async function registerFarm(body: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/api/cycles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Registration failed');
  return data as { cycleId: string; token: string };
}

export async function fetchCycleReport(cycleId?: string | null) {
  const url = cycleId
    ? `${API_URL}/api/cycles/${cycleId}/report`
    : `${API_URL}/api/cycles/demo/report`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to load report');
  return {
    report: data.report,
    cycleId: data.cycleId as string,
    pondName: data.pondName as string,
  };
}
