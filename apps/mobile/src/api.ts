// Use your PC's LAN IP when testing on a physical phone (not localhost)
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export function isVideoMedia(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
}

export function mediaSrc(url: string | null | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads/')) return `${API_URL}${url}`;
  return url;
}

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
  else await AsyncStorage.removeItem(KEYS.cycleId);
  if (user?.role) await AsyncStorage.setItem(KEYS.role, user.role);
  if (user?.name) await AsyncStorage.setItem(KEYS.name, user.name);
}

export async function clearAuth() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}

export async function getCycleId() {
  return AsyncStorage.getItem(KEYS.cycleId);
}

export async function getRole() {
  return AsyncStorage.getItem(KEYS.role);
}

export async function setCycleId(id: string) {
  await AsyncStorage.setItem(KEYS.cycleId, id);
}

export type CycleSummary = {
  id: string;
  pond: { name: string; number: number; farm: { name: string } };
};

export async function fetchUserCycles(): Promise<CycleSummary[]> {
  const res = await fetch(`${API_URL}/api/cycles`, { headers: await authHeaders() });
  const data = await res.json();
  if (!res.ok || !Array.isArray(data)) return [];
  return data;
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

export async function fetchDashboard(cycleId?: string | null) {
  const id = cycleId ?? (await getCycleId());
  if (!id) throw new Error('No pond selected');
  const res = await fetch(`${API_URL}/api/cycles/${id}/dashboard`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to load dashboard');
  return data as {
    pondName: string;
    dayInCulture: number;
    monthName: string;
    todayExpectedFeedKg: number | null;
    yesterdayExpectedFeedKg: number | null;
    todayMorningFeedKg: number | null;
    todayEveningFeedKg: number | null;
    expectedAvgWeightG: number | null;
    actualAvgWeightG: number | null;
    fishOnHand: number | null;
    month1FeedCost: number | null;
    todayActualFeedKg: number | null;
    cumulativeFeedCost: number | null;
    totalActualFeedKg: number | null;
    averageFcr: number;
    pondCleaning: {
      intervalDays: number;
      daysUntilNextCleaning: number;
      nextCleaningDayInCulture: number;
      dueToday: boolean;
    };
  };
}

export type EconomicsSummary = {
  cycleId: string;
  pondName: string;
  cumulativeFeedCost: number | null;
  powerCostEstimate: number;
  miscCostsTotal: number;
  salesRevenue: number;
  totalCosts: number;
  profitLoss: number;
};

export type FishSale = {
  id: string;
  date: string;
  quantitySold: number;
  avgWeightG: number | null;
  totalRevenue: number | null;
  customerName: string | null;
};

export async function fetchEconomics(cycleId?: string | null): Promise<EconomicsSummary> {
  const id = cycleId ?? (await getCycleId());
  if (!id) throw new Error('No pond selected');
  return apiFetch(`/api/cycles/${id}/economics`);
}

export async function fetchSales(cycleId?: string | null): Promise<FishSale[]> {
  const id = cycleId ?? (await getCycleId());
  if (!id) throw new Error('No pond selected');
  return apiFetch(`/api/cycles/${id}/sales`);
}

export async function fetchCycleReport(cycleId?: string | null) {
  const load = async (id?: string | null) => {
    const url = id
      ? `${API_URL}/api/cycles/${id}/report`
      : `${API_URL}/api/cycles/demo/report`;
    const res = await fetch(url);
    const data = await res.json();
    return { res, data, url };
  };

  let { res, data } = await load(cycleId);

  // Stale cycle id (e.g. after database reset) — refresh from server
  if (cycleId && (!res.ok || data.error)) {
    const token = await getToken();
    if (token) {
      const freshId = await fetchFirstCycleId(token);
      if (freshId) {
        await AsyncStorage.setItem(KEYS.cycleId, freshId);
        ({ res, data } = await load(freshId));
      } else {
        await AsyncStorage.removeItem(KEYS.cycleId);
        ({ res, data } = await load(null));
      }
    }
  }

  if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to load report');
  if (data.cycleId) await AsyncStorage.setItem(KEYS.cycleId, data.cycleId);
  return {
    report: data.report,
    cycleId: data.cycleId as string,
    pondName: data.pondName as string,
  };
}
