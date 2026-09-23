/**
 * Same-origin only. Next rewrites /api and /uploads to the API host
 * (local or Render). Do not point the browser at onrender.com — cold starts
 * there surface as TypeNetworkError in Firefox/Safari.
 */
export const API_URL = '';

export function isVideoMedia(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
}

/** Uploaded media is stored as /uploads/… on the API. External URLs are left as-is. */
export function mediaSrc(url: string | null | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads/')) return `${API_URL}${url}`;
  return url;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fishmaster_token');
}

export function setAuth(
  token: string,
  cycleId?: string,
  user?: { role?: string; name?: string; email?: string },
) {
  localStorage.setItem('fishmaster_token', token);
  if (cycleId) localStorage.setItem('fishmaster_cycle_id', cycleId);
  if (user?.role) localStorage.setItem('fishmaster_role', user.role);
  if (user?.name) localStorage.setItem('fishmaster_name', user.name);
  if (user?.email) localStorage.setItem('fishmaster_email', user.email);
}

export function clearAuth() {
  localStorage.removeItem('fishmaster_token');
  localStorage.removeItem('fishmaster_cycle_id');
  localStorage.removeItem('fishmaster_role');
  localStorage.removeItem('fishmaster_name');
  localStorage.removeItem('fishmaster_email');
}

export function getRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fishmaster_role');
}

export function getEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fishmaster_email');
}

export function getName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fishmaster_name');
}

function looksLikeHtml(raw: string): boolean {
  const t = raw.trim().slice(0, 200).toLowerCase();
  return t.startsWith('<!doctype') || t.startsWith('<html') || t.includes('just a moment');
}

/** Render free tier sleeps — first hits often fail with TypeNetworkError / 503. */
async function fetchWithWakeRetry(url: string, init?: RequestInit, attempts = 6): Promise<Response> {
  let lastRes: Response | undefined;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init);
      lastRes = res;
      const gatewayDown = res.status === 502 || res.status === 503 || res.status === 504;
      // Cloudflare bot/rate pages (often 429/503) need a slower retry, not a burst.
      const challenged = res.status === 429;
      if ((gatewayDown || challenged) && i < attempts - 1) {
        const peek = await res.clone().text();
        if (peek.trim().startsWith('{')) return res;
        await new Promise((r) => setTimeout(r, challenged ? 8000 * (i + 1) : 4000 * (i + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
        continue;
      }
    }
  }
  if (lastRes) return lastRes;
  throw lastErr instanceof Error ? lastErr : new Error('Network error — API may be waking up. Try again in a minute.');
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetchWithWakeRetry(`${API_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  const raw = await res.text();
  let data: any = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      if (!res.ok) {
        if (looksLikeHtml(raw) || res.status === 429) {
          throw new Error(
            'The API host is rate-limiting right now (Cloudflare). Wait a minute, then try again.',
          );
        }
        throw new Error(`Request failed (${res.status})`);
      }
      throw new Error('Unexpected response from API');
    }
  }
  if (!res.ok) {
    if (res.status === 413 || raw.includes('PayloadTooLarge')) {
      throw new Error('That file is too large to paste. Use the file picker on the Videos tab (max 80 MB).');
    }
    if (looksLikeHtml(raw) || res.status === 429) {
      throw new Error(
        'The API host is rate-limiting right now (Cloudflare). Wait a minute, then try again.',
      );
    }
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new Error(
        data.error ||
          'The API is waking up (Render free tier). Wait about a minute and try again.',
      );
    }
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
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
  if (data.report) {
    return {
      report: data.report,
      cycleId: data.cycleId as string,
      pondName: data.pondName as string,
      display: (data.display ?? null) as import('../components/AppDisplayPage').DisplayProfile | null,
    };
  }
  return { report: data, cycleId: cycleId ?? null, pondName: 'fishmaster 1', display: null };
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

export type CycleSummary = {
  id: string;
  pond: { name: string; number: number; farm: { name: string } };
};

export async function fetchUserCycles(): Promise<CycleSummary[]> {
  if (!getToken()) return [];
  const res = await fetch(`${API_URL}/api/cycles`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok || !Array.isArray(data)) return [];
  return data;
}

export function setCycleId(id: string) {
  localStorage.setItem('fishmaster_cycle_id', id);
}

export async function fetchDashboard(cycleId: string) {
  const res = await fetch(`${API_URL}/api/cycles/${cycleId}/dashboard`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to load dashboard');
  return data;
}

export type EconomicsSummary = {
  cycleId: string;
  pondName: string;
  cumulativeFeedCost: number | null;
  powerCostEstimate: number;
  powerRates: { electricityPerKwh: number; dieselPerLiter: number; petrolPerLiter: number };
  miscCostsByCategory: Record<string, number>;
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
  notes: string | null;
};

export type FeedIngredient = {
  id: string;
  ingredientName: string;
  costPerKg: number;
  month: number | null;
};

export async function fetchEconomics(cycleId: string): Promise<EconomicsSummary> {
  return apiFetch(`/api/cycles/${cycleId}/economics`);
}

export async function fetchSales(cycleId: string): Promise<FishSale[]> {
  return apiFetch(`/api/cycles/${cycleId}/sales`);
}

export async function fetchFeedIngredients(cycleId: string): Promise<FeedIngredient[]> {
  return apiFetch(`/api/cycles/${cycleId}/feed-ingredients`);
}

export async function saveFeedIngredients(
  cycleId: string,
  items: { ingredientName: string; costPerKg: number; month?: number }[],
) {
  return apiFetch(`/api/cycles/${cycleId}/feed-ingredients`, {
    method: 'PUT',
    body: JSON.stringify(items),
  });
}

export async function addMiscCost(
  cycleId: string,
  body: { date: string; category: string; amount: number; notes?: string },
) {
  return apiFetch(`/api/cycles/${cycleId}/misc-costs`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
