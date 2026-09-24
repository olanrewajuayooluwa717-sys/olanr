'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MEMBER_CATEGORIES, memberCategoryLabel, REPORT_CATALOG } from '@fishmaster/shared-types';
import {
  AdminShell,
  AdminPanel,
  AdminTable,
  adminBtn,
  adminBtnDanger,
  adminBtnGhost,
  adminInput,
  adminSearch,
  parseAdminSection,
  type AdminSection,
} from '../../components/AdminShell';
import { API_URL, apiFetch, getRole, getToken, isVideoMedia, mediaSrc } from '../../lib/api';

type Member = {
  id: string; name: string; email: string; role: string;
  phone?: string | null; gender?: string | null;
  categories?: string[];
  estimatedFishOutputYear?: string | null;
  state?: string | null; country?: string | null; lga?: string | null;
  subscriptionStatus: string; subscriptionTier: string;
  createdAt: string;
  _count: { farms: number };
  farms: {
    id: string; name: string; city: string; state: string; country: string;
    latitude: number | null; longitude: number | null;
  }[];
};

type MemberDetail = {
  id: string; name: string; surname?: string | null; email: string;
  phone?: string | null; gender?: string | null; ageRange?: string | null;
  role: string; lga?: string | null; state?: string | null; country?: string | null;
  categories?: string[];
  estimatedFishOutputYear?: string | null;
  subscriptionTier: string; subscriptionStatus: string; createdAt: string;
  subscriptionPaidUntil?: string | null;
  summary: {
    farmCount: number; pondCount: number; cycleCount: number;
    totalStocked: number; totalMortality: number; presentQtyEstimate: number;
    salesTotalRevenue: number; salesTotalQty: number; marketProductCount: number;
  };
  farms: {
    id: string; name: string; city: string; state: string; country: string;
    location: string; lga?: string | null; latitude?: number | null; longitude?: number | null;
    phone?: string | null;
    ponds: {
      id: string; name: string; number: number; pondType?: string | null;
      lengthM: number; widthM: number; depthM: number;
      cycles: {
        id: string; quantityStocked: number; averageWeightAtStockingG: number;
        fingerlingPrice: number; stockingDate: string; desiredCrudeProteinPct: number;
        desiredFeedQuantityKg: number; fishSpecies?: string | null;
        salesLogs: { quantitySold: number; totalRevenue?: number | null }[];
        mortalityLogs: { count: number }[];
        _count: { feedLogs: number; mortalityLogs: number };
      }[];
    }[];
    marketProducts: {
      id: string; name: string; price: number; quantity: number; sold: boolean;
      category?: { title: string } | null;
    }[];
  }[];
};

type Post = {
  id: string; type: string; title: string; body: string; mediaUrl?: string | null;
  placements?: string[];
  published: boolean; createdAt: string;
  author: { name: string };
};

type FeedBrandRow = {
  month: number;
  brand: string;
  feedSizeMm: string;
  costPerBag: string;
  crudeProteinPct: string;
};

type MemberPond = { pondId: string; label: string; cycleId: string | null };

type IngredientRow = {
  id?: string;
  name: string;
  crudeProteinPct: string;
  inclusionRatio: string;
  composition: string;
  foodClass: 'protein' | 'carbohydrate' | 'others';
};

type FcrRow = { month: number; bodyWeightPct: string; fcr: string };

type MarketCategory = {
  id: string; title: string; description?: string | null; imageUrl?: string | null;
  createdAt: string; _count?: { products: number };
};

type MarketProduct = {
  id: string; farmId: string; categoryId?: string | null;
  name: string; price: number; quantity: number;
  imageUrl?: string | null; description?: string | null; sold: boolean;
  farm?: {
    id: string; name: string; city?: string; state?: string;
    user?: { name: string; email: string };
  };
  category?: { id: string; title: string } | null;
};

type FarmOption = {
  id: string; name: string;
  user: { id: string; name: string; email: string };
};

const EMPTY_FEED_BRANDS = (): FeedBrandRow[] =>
  [1, 2, 3, 4, 5, 6].map((month) => ({
    month,
    brand: '',
    feedSizeMm: '',
    costPerBag: '',
    crudeProteinPct: '',
  }));

const CONTENT_TYPES = [
  { value: 'advert', label: 'Sponsored' },
  { value: 'article', label: 'Articles' },
  { value: 'information', label: 'Information' },
  { value: 'picture', label: 'Pictures' },
  { value: 'video', label: 'Videos' },
];

const AD_PLACES = [
  { id: 'home', label: 'Home feed' },
  { id: 'article', label: 'Articles' },
  { id: 'information', label: 'Information' },
  { id: 'picture', label: 'Pictures' },
  { id: 'video', label: 'Videos' },
];

function PlacePicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  return (
    <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.6rem 0.75rem', margin: 0 }}>
      <legend style={{ fontSize: '0.8rem', color: '#64748b', padding: '0 4px' }}>Show this ad in</legend>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem 1rem' }}>
        {AD_PLACES.map((p) => (
          <label key={p.id} style={{ fontSize: '0.85rem', display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={value.includes(p.id)}
              onChange={(e) => onChange(e.target.checked ? [...value, p.id] : value.filter((x) => x !== p.id))}
            />
            {p.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.65rem 0.5rem',
  borderBottom: '2px solid #e2e8f0',
  color: '#64748b',
  fontSize: '0.7rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  fontWeight: 600,
};

const td: React.CSSProperties = {
  padding: '0.75rem 0.5rem',
  borderBottom: '1px solid #f1f5f9',
  verticalAlign: 'top',
};

const tabBtn = (active: boolean): React.CSSProperties => ({
  ...adminBtnGhost,
  fontSize: '0.85rem',
  background: active ? '#ccfbf1' : 'transparent',
  color: active ? '#0f766e' : '#64748b',
  fontWeight: active ? 600 : 500,
  border: active ? '1px solid #99f6e4' : '1px solid transparent',
});

function naira(n: number) {
  return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function placeBits(...parts: Array<string | null | undefined>) {
  return parts.map((p) => p?.trim()).filter(Boolean).join(', ');
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Loading admin…</div>}>
      <AdminPageInner />
    </Suspense>
  );
}

function AdminPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = parseAdminSection(searchParams.get('section'));
  const marketTab = searchParams.get('tab') === 'categories' ? 'categories' : 'products';
  const configTabRaw = searchParams.get('tab');
  const configTab =
    configTabRaw === 'fcr' || configTabRaw === 'feed-brands' ? configTabRaw : 'ingredients';

  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [memberSort, setMemberSort] = useState<'newest' | 'oldest'>('newest');
  const [directory, setDirectory] = useState<{
    members: {
      id: string; name: string; email: string; categories: string[];
      location: { city: string; lga: string; state: string; country: string; farmName: string | null };
    }[];
    byLocation: {
      state: string; country: string; city: string;
      categoryCounts: Record<string, number>; memberCount: number;
    }[];
  } | null>(null);
  const [dirCategory, setDirCategory] = useState('');
  const [dirState, setDirState] = useState('');
  const [dirCountry, setDirCountry] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberDetail, setMemberDetail] = useState<MemberDetail | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'ponds' | 'stocks' | 'economics'>('overview');
  const [form, setForm] = useState({ type: 'article', title: '', body: '', mediaUrl: '', placements: [] as string[] });
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ type: 'advert', title: '', body: '', mediaUrl: '', placements: [] as string[] });
  const [msgForm, setMsgForm] = useState({ userId: '', title: '', body: '', reportNum: '', pondId: '', pondLabel: '' });
  const [memberPonds, setMemberPonds] = useState<MemberPond[]>([]);
  const [feedMemberId, setFeedMemberId] = useState('');
  const [feedCycleId, setFeedCycleId] = useState('');
  const [feedBrands, setFeedBrands] = useState<FeedBrandRow[]>(EMPTY_FEED_BRANDS());
  const [feedOk, setFeedOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState<string | null>(null);
  const [broadcastOk, setBroadcastOk] = useState<string | null>(null);

  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [ingredientFilter, setIngredientFilter] = useState<'all' | 'protein' | 'carbohydrate' | 'others'>('all');
  const [fcrRows, setFcrRows] = useState<FcrRow[]>([]);
  const [configOk, setConfigOk] = useState<string | null>(null);

  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [catForm, setCatForm] = useState({ title: '', description: '', imageUrl: '' });
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [prodForm, setProdForm] = useState({
    farmId: '', categoryId: '', name: '', price: '', quantity: '', imageUrl: '', description: '', sold: false,
  });
  const [editingProdId, setEditingProdId] = useState<string | null>(null);

  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [staffOk, setStaffOk] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState('30');
  const [creditUnit, setCreditUnit] = useState<'days' | 'weeks'>('days');
  const [creditTier, setCreditTier] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [creditBusy, setCreditBusy] = useState(false);
  const [creditOk, setCreditOk] = useState<string | null>(null);
  const isSuper = getRole() === 'super_admin';

  useEffect(() => {
    const role = getRole();
    if (role !== 'super_admin' && role !== 'manager') {
      router.push('/login');
      return;
    }
    load();
  }, [router]);

  useEffect(() => {
    if (section === 'config') loadConfig();
    if (section === 'marketplace') loadMarketplace();
    if (section === 'directory') loadDirectory();
  }, [section, dirCategory, dirState, dirCountry]);

  const loadDirectory = async () => {
    try {
      const params = new URLSearchParams();
      if (dirCategory) params.set('category', dirCategory);
      if (dirState) params.set('state', dirState);
      if (dirCountry) params.set('country', dirCountry);
      const q = params.toString();
      const data = await apiFetch(`/api/admin/directory${q ? `?${q}` : ''}`);
      setDirectory(data);
    } catch (e) {
      setError(String(e));
    }
  };

  const load = async () => {
    try {
      const [m, p, f] = await Promise.all([
        apiFetch('/api/admin/members'),
        apiFetch('/api/admin/posts'),
        apiFetch('/api/admin/farms'),
      ]);
      setMembers(m);
      setPosts(p);
      setFarms(f.map((farm: FarmOption & { user: FarmOption['user'] }) => ({
        id: farm.id,
        name: farm.name,
        user: farm.user,
      })));
      if (!msgForm.userId && m.length) {
        const uid = m[0].id;
        setMsgForm((prev) => ({ ...prev, userId: uid }));
        loadPonds(uid);
      }
    } catch (e) {
      setError(String(e));
    }
  };

  const loadConfig = async () => {
    try {
      const [ings, fcr] = await Promise.all([
        apiFetch('/api/admin/ingredients'),
        apiFetch('/api/admin/fcr'),
      ]);
      setIngredients(ings.map((i: {
        id: string; name: string; crudeProteinPct: number; inclusionRatio: number;
        composition?: string | null; foodClass: IngredientRow['foodClass'];
      }) => ({
        id: i.id,
        name: i.name,
        crudeProteinPct: String(i.crudeProteinPct),
        inclusionRatio: String(i.inclusionRatio),
        composition: i.composition ?? '',
        foodClass: i.foodClass,
      })));
      setFcrRows(fcr.map((r: { month: number; bodyWeightPct: number; fcr: number }) => ({
        month: r.month,
        bodyWeightPct: String(r.bodyWeightPct),
        fcr: String(r.fcr),
      })));
    } catch (e) {
      setError(String(e));
    }
  };

  const loadMarketplace = async () => {
    try {
      const [cats, prods] = await Promise.all([
        apiFetch('/api/admin/marketplace/categories'),
        apiFetch('/api/admin/marketplace/products'),
      ]);
      setCategories(cats);
      setProducts(prods);
    } catch (e) {
      setError(String(e));
    }
  };

  const closeMember = () => {
    setSelectedMemberId(null);
    setMemberDetail(null);
    setMemberError(null);
    setMemberLoading(false);
  };

  const openMember = async (id: string) => {
    setSelectedMemberId(id);
    setMemberDetail(null);
    setMemberError(null);
    setMemberLoading(true);
    setDetailTab('overview');
    setCreditOk(null);
    try {
      const detail = await apiFetch(`/api/admin/members/${id}`);
      setMemberDetail(detail);
    } catch (e) {
      setMemberError(e instanceof Error ? e.message : String(e));
    } finally {
      setMemberLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedMemberId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMember();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedMemberId]);

  const loadPonds = async (userId: string) => {
    try {
      const ponds = await apiFetch(`/api/admin/members/${userId}/ponds`);
      setMemberPonds(ponds.map((p: MemberPond) => ({
        pondId: p.pondId,
        label: p.label,
        cycleId: p.cycleId ?? null,
      })));
    } catch {
      setMemberPonds([]);
    }
  };

  const loadFeedBrands = async (cycleId: string) => {
    try {
      const brands = await apiFetch(`/api/cycles/${cycleId}/feed-brands`) as {
        month: number; brand: string; feedSizeMm: number; costPerBag: number; crudeProteinPct: number;
      }[];
      const rows = EMPTY_FEED_BRANDS();
      for (const b of brands) {
        const row = rows.find((r) => r.month === b.month);
        if (row) {
          row.brand = b.brand;
          row.feedSizeMm = String(b.feedSizeMm);
          row.costPerBag = String(b.costPerBag);
          row.crudeProteinPct = String(b.crudeProteinPct);
        }
      }
      setFeedBrands(rows);
    } catch (e) {
      setError(String(e));
      setFeedBrands(EMPTY_FEED_BRANDS());
    }
  };

  const onFeedMemberChange = async (userId: string) => {
    setFeedMemberId(userId);
    setFeedCycleId('');
    setFeedBrands(EMPTY_FEED_BRANDS());
    setFeedOk(null);
    try {
      const ponds = await apiFetch(`/api/admin/members/${userId}/ponds`) as MemberPond[];
      const withCycle = ponds.filter((p) => p.cycleId);
      if (withCycle.length === 1) {
        setFeedCycleId(withCycle[0].cycleId!);
        await loadFeedBrands(withCycle[0].cycleId!);
      }
    } catch { /* ignore */ }
  };

  const onFeedPondChange = async (cycleId: string) => {
    setFeedCycleId(cycleId);
    setFeedOk(null);
    if (cycleId) await loadFeedBrands(cycleId);
    else setFeedBrands(EMPTY_FEED_BRANDS());
  };

  const saveFeedBrands = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedCycleId) return;
    setFeedOk(null);
    const items = feedBrands
      .filter((r) => r.brand.trim())
      .map((r) => ({
        month: r.month,
        brand: r.brand.trim(),
        feedSizeMm: Number(r.feedSizeMm) || 0,
        costPerBag: Number(r.costPerBag) || 0,
        crudeProteinPct: Number(r.crudeProteinPct) || 0,
      }));
    if (!items.length) {
      setError('Enter at least one month with a feed brand');
      return;
    }
    await apiFetch(`/api/cycles/${feedCycleId}/feed-brands`, {
      method: 'PUT',
      body: JSON.stringify(items),
    });
    setFeedOk('Feed brands saved for this pond cycle.');
    setError(null);
  };

  const saveIngredients = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigOk(null);
    await apiFetch('/api/admin/ingredients', {
      method: 'PUT',
      body: JSON.stringify(ingredients.map((i) => ({
        name: i.name,
        crudeProteinPct: Number(i.crudeProteinPct) || 0,
        inclusionRatio: Number(i.inclusionRatio) || 0,
        composition: i.composition || null,
        foodClass: i.foodClass,
      }))),
    });
    setConfigOk('Ingredients saved.');
    loadConfig();
  };

  const saveFcr = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigOk(null);
    await apiFetch('/api/admin/fcr', {
      method: 'PUT',
      body: JSON.stringify(fcrRows.map((r) => ({
        month: r.month,
        bodyWeightPct: Number(r.bodyWeightPct),
        fcr: Number(r.fcr),
      }))),
    });
    setConfigOk('FCR months saved.');
    loadConfig();
  };

  const copyShareLink = async (id: string) => {
    const url = `${window.location.origin}/s/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setBroadcastOk('Share link copied. Paste it on Facebook, WhatsApp, or LinkedIn.');
      setError(null);
    } catch {
      setError(url);
    }
  };

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBroadcastOk(null);
    try {
      if ((form.type === 'video' || form.type === 'picture') && !form.mediaUrl.trim()) {
        setError(form.type === 'video' ? 'Upload a video file first.' : 'Upload an image file first.');
        return;
      }
      if (form.type === 'advert' && form.placements.length === 0) {
        setError('Choose at least one place for this ad.');
        return;
      }
      await apiFetch('/api/admin/posts', {
        method: 'POST',
        body: JSON.stringify({
          type: form.type,
          title: form.title,
          body: form.body.trim() || form.title,
          ...(form.mediaUrl ? { mediaUrl: form.mediaUrl } : {}),
          ...(form.type === 'advert' ? { placements: form.placements } : {}),
        }),
      });
      const label = CONTENT_TYPES.find((t) => t.value === form.type)?.label ?? form.type;
      const where = form.type === 'advert'
        ? AD_PLACES.filter((p) => form.placements.includes(p.id)).map((p) => p.label).join(', ')
        : `the ${label} tab`;
      setBroadcastOk(form.type === 'advert' ? `Published as sponsored in ${where}.` : `Published to ${where}.`);
      setForm((f) => ({ ...f, title: '', body: '', mediaUrl: '', placements: [] }));
      load();
    } catch (err) {
      setError(String(err).replace(/^Error: /, ''));
    }
  };

  const uploadMediaFile = async (file: File | null, target: 'new' | 'edit' = 'new') => {
    if (!file) return;
    const kind = target === 'edit' ? editForm.type : form.type;
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(file.name);
    if (kind === 'video' && !isVideo) {
      setError('Choose an MP4, WebM, or MOV file.');
      return;
    }
    if (kind === 'picture' && !isImage) {
      setError('Choose a JPG, PNG, WebP, or GIF.');
      return;
    }
    if (kind === 'advert' && !isVideo && !isImage) {
      setError('Ads can be a picture (JPG, PNG, WebP, GIF) or a video (MP4, WebM, MOV).');
      return;
    }
    if (file.size > 80 * 1024 * 1024) {
      setError('That file is over 80 MB. Compress it and try again.');
      return;
    }
    setError(null);
    setBroadcastOk('Uploading…');
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const token = getToken();
      const res = await fetch(`${API_URL}/api/admin/uploads`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const url = String(data.url ?? '');
      if (target === 'edit') setEditForm((f) => ({ ...f, mediaUrl: url }));
      else {
        setForm((f) => ({
          ...f,
          mediaUrl: url,
          title: f.title || file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim(),
        }));
      }
      setBroadcastOk('File uploaded. Add a title, then publish.');
    } catch (err) {
      setBroadcastOk(null);
      setError(String(err).replace(/^Error: /, ''));
    } finally {
      setUploading(false);
    }
  };

  const uploadArticleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setBroadcastOk(null);
    try {
      let n = 0;
      for (const file of Array.from(files)) {
        if (file.type.startsWith('video/') || file.type.startsWith('image/') || /\.(mp4|mov|webm|m4v|mkv|avi|jpe?g|png|webp|gif)$/i.test(file.name)) {
          setError('That is a video or picture. Choose the Videos or Pictures tab, then use Upload file.');
          return;
        }
        const text = await file.text();
        const title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
        if (!text.trim()) continue;
        await apiFetch('/api/admin/posts', {
          method: 'POST',
          body: JSON.stringify({ type: 'article', title: title || 'Untitled', body: text.trim() }),
        });
        n += 1;
      }
      if (!n) {
        setError('Those files were empty. Use .txt or .md files.');
        return;
      }
      setBroadcastOk(`Published ${n} article${n === 1 ? '' : 's'} to the Articles tab.`);
      load();
    } catch (err) {
      setError(String(err).replace(/^Error: /, ''));
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgOk(null);
    const payload = {
      title: msgForm.title,
      body: msgForm.body,
      ...(msgForm.reportNum ? { reportNum: Number(msgForm.reportNum) } : {}),
      ...(msgForm.pondId ? { pondId: msgForm.pondId, pondLabel: msgForm.pondLabel } : {}),
    };
    await apiFetch(`/api/admin/members/${msgForm.userId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setMsgForm((f) => ({ ...f, title: '', body: '', reportNum: '' }));
    setMsgOk('Message sent to member.');
  };

  const suspend = async (id: string) => {
    await apiFetch(`/api/admin/members/${id}/suspend`, { method: 'PATCH' });
    load();
    if (selectedMemberId === id) openMember(id);
  };

  const activate = async (id: string) => {
    await apiFetch(`/api/admin/members/${id}/activate`, { method: 'PATCH' });
    load();
    if (selectedMemberId === id) openMember(id);
  };

  const creditSubscription = async (id: string) => {
    const amount = Number(creditAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a positive number of days or weeks to credit.');
      return;
    }
    setCreditBusy(true);
    setCreditOk(null);
    setError(null);
    try {
      const data = await apiFetch(`/api/admin/members/${id}/credit`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          unit: creditUnit,
          ...(creditTier ? { tier: creditTier } : {}),
          ...(creditNote.trim() ? { note: creditNote.trim() } : {}),
        }),
      });
      const until = data.subscriptionPaidUntil
        ? new Date(data.subscriptionPaidUntil).toLocaleDateString()
        : '—';
      setCreditOk(
        `Credited ${data.daysCredited} day${data.daysCredited === 1 ? '' : 's'} — active until ${until}.`,
      );
      setCreditNote('');
      load();
      openMember(id);
    } catch (e) {
      setError(String(e).replace(/^Error:\s*/, ''));
    } finally {
      setCreditBusy(false);
    }
  };

  const deletePost = async (id: string) => {
    await apiFetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
    load();
  };

  const startEdit = (p: Post) => {
    setEditingId(p.id);
    setEditForm({
      type: p.type,
      title: p.title,
      body: p.body,
      mediaUrl: p.mediaUrl ?? '',
      placements: p.placements ?? [],
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ type: 'advert', title: '', body: '', mediaUrl: '', placements: [] });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    if (editForm.type === 'advert' && editForm.placements.length === 0) {
      setError('Choose at least one place for this ad.');
      return;
    }
    const payload = {
      type: editForm.type,
      title: editForm.title,
      body: editForm.body,
      mediaUrl: editForm.mediaUrl || null,
      placements: editForm.type === 'advert' ? editForm.placements : [],
    };
    await apiFetch(`/api/admin/posts/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
    cancelEdit();
    load();
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCatId) {
      await apiFetch(`/api/admin/marketplace/categories/${editingCatId}`, {
        method: 'PATCH',
        body: JSON.stringify(catForm),
      });
    } else {
      await apiFetch('/api/admin/marketplace/categories', {
        method: 'POST',
        body: JSON.stringify(catForm),
      });
    }
    setCatForm({ title: '', description: '', imageUrl: '' });
    setEditingCatId(null);
    loadMarketplace();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category? Products will be uncategorized.')) return;
    await apiFetch(`/api/admin/marketplace/categories/${id}`, { method: 'DELETE' });
    loadMarketplace();
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      farmId: prodForm.farmId,
      categoryId: prodForm.categoryId || null,
      name: prodForm.name,
      price: Number(prodForm.price) || 0,
      quantity: Number(prodForm.quantity) || 0,
      imageUrl: prodForm.imageUrl || null,
      description: prodForm.description || null,
      sold: prodForm.sold,
    };
    if (editingProdId) {
      await apiFetch(`/api/admin/marketplace/products/${editingProdId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch('/api/admin/marketplace/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    setProdForm({
      farmId: '', categoryId: '', name: '', price: '', quantity: '', imageUrl: '', description: '', sold: false,
    });
    setEditingProdId(null);
    loadMarketplace();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await apiFetch(`/api/admin/marketplace/products/${id}`, { method: 'DELETE' });
    loadMarketplace();
  };

  const createStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffOk(null);
    setError(null);
    try {
      await apiFetch('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify(staffForm),
      });
      setStaffForm({ name: '', email: '', password: '', phone: '' });
      setStaffOk('Manager account created.');
      load();
    } catch (err) {
      setError(String(err).replace('Error: ', ''));
    }
  };

  const promoteRole = async (id: string, role: 'manager' | 'super_admin' | 'member') => {
    await apiFetch(`/api/admin/members/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    load();
  };

  const needsMediaEdit = editForm.type === 'picture' || editForm.type === 'video' || editForm.type === 'advert';
  const needsMedia = form.type === 'picture' || form.type === 'video' || form.type === 'advert';

  const filteredMembers = useMemo(() => {
    let list = members;
    if (categoryFilter) {
      list = list.filter((m) => (m.categories ?? []).includes(categoryFilter));
    }
    const q = memberQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((m) =>
        [
          m.name, m.email, m.phone, m.gender, m.role,
          ...(m.categories ?? []).map(memberCategoryLabel),
          ...m.farms.map((f) => `${f.name} ${f.city} ${f.state} ${f.country}`),
        ]
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }
    const dir = memberSort === 'newest' ? -1 : 1;
    return [...list].sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
      if (Number.isNaN(ta)) return 1;
      if (Number.isNaN(tb)) return -1;
      return (ta - tb) * dir;
    });
  }, [members, memberQuery, categoryFilter, memberSort]);

  const staff = useMemo(
    () => members.filter((m) => m.role === 'super_admin' || m.role === 'manager'),
    [members],
  );

  const filteredIngredients = useMemo(() => {
    if (ingredientFilter === 'all') return ingredients;
    return ingredients.filter((i) => i.foodClass === ingredientFilter);
  }, [ingredients, ingredientFilter]);

  const setConfigTab = (tab: string) => {
    router.push(`/admin?section=config&tab=${tab}`);
  };

  return (
    <AdminShell section={section as AdminSection}>
      {error && <p style={{ color: '#dc2626', marginTop: 0 }}>{error}</p>}
      {msgOk && <p style={{ color: '#15803d', marginTop: 0 }}>{msgOk}</p>}
      {feedOk && <p style={{ color: '#15803d', marginTop: 0 }}>{feedOk}</p>}
      {configOk && <p style={{ color: '#15803d', marginTop: 0 }}>{configOk}</p>}
      {staffOk && <p style={{ color: '#15803d', marginTop: 0 }}>{staffOk}</p>}

      {section === 'members' && (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <AdminPanel
            title="All Members"
            count={filteredMembers.length}
            action={
              <div className="admin-toolbar" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{ ...adminInput, minWidth: 160 }}
                >
                  <option value="">All categories</option>
                  {MEMBER_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <select
                  value={memberSort}
                  onChange={(e) => setMemberSort(e.target.value as 'newest' | 'oldest')}
                  style={{ ...adminInput, minWidth: 180 }}
                  aria-label="Sort by registration time"
                >
                  <option value="newest">Newest registered</option>
                  <option value="oldest">Oldest registered</option>
                </select>
                <input
                  placeholder={`Search ${members.length} members`}
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  style={adminSearch}
                />
              </div>
            }
          >
            <AdminTable className="member-table">
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Email / phone</th>
                  <th style={th}>What they do</th>
                  <th style={th}>Location</th>
                  <th style={th}>Registered</th>
                  <th style={th}>Status</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => openMember(m.id)}
                    style={{
                      cursor: 'pointer',
                      background: selectedMemberId === m.id ? '#f0fdfa' : undefined,
                    }}
                  >
                    <td style={td}>
                      <strong style={{ color: '#0f766e' }}>{m.name}</strong>
                    </td>
                    <td style={td}>
                      <div>{m.email}</div>
                      {m.phone && (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>{m.phone}</div>
                      )}
                    </td>
                    <td style={td}>
                      {(m.categories ?? []).length === 0 ? (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(m.categories ?? []).map((c) => (
                            <span
                              key={c}
                              style={{
                                fontSize: '0.7rem',
                                background: '#ecfeff',
                                color: '#0e7490',
                                padding: '0.15rem 0.4rem',
                                borderRadius: 4,
                              }}
                            >
                              {memberCategoryLabel(c)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={td}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {m.farms.length === 0 ? (
                          placeBits(m.lga, m.state, m.country) || 'No farm'
                        ) : m.farms.map((f) => (
                          <div key={f.id}>
                            {[f.name, placeBits(f.city, f.state, f.country)].filter(Boolean).join(' — ')}
                            {f.latitude != null && f.longitude != null ? (
                              <>
                                {' · '}
                                <a
                                  href={`https://www.google.com/maps?q=${f.latitude},${f.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#0d9488' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  GPS
                                </a>
                              </>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={td}>
                      <div style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}
                      </div>
                      {m.createdAt ? (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                          {new Date(m.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      ) : null}
                    </td>
                    <td style={td}>
                      <StatusPill status={m.subscriptionStatus} />
                    </td>
                    <td style={td} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openMember(m.id)}
                        style={{ ...adminBtnGhost, fontSize: '0.75rem', marginRight: 6 }}
                      >
                        View
                      </button>
                      {m.subscriptionStatus === 'active' ? (
                        <button onClick={() => suspend(m.id)} style={{ ...adminBtnDanger, fontSize: '0.75rem' }}>
                          Suspend
                        </button>
                      ) : (
                        <button onClick={() => activate(m.id)} style={{ ...adminBtn, fontSize: '0.75rem' }}>
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!filteredMembers.length && (
                  <tr>
                    <td style={td} colSpan={7}>No members match this search.</td>
                  </tr>
                )}
              </tbody>
            </AdminTable>
            <div className="member-cards">
              {filteredMembers.map((m) => {
                const place = m.farms.length === 0
                  ? placeBits(m.lga, m.state, m.country) || 'No farm'
                  : m.farms.map((f) => [f.name, placeBits(f.city, f.state, f.country)].filter(Boolean).join(' — ')).join(' · ');
                return (
                  <article key={m.id} className="member-card">
                    <strong style={{ color: '#0f766e' }}>{m.name}</strong>
                    <div style={{ fontSize: '0.9rem', marginTop: 4 }}>{m.email}</div>
                    {m.phone && <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{m.phone}</div>}
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 6 }}>{place}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                      Registered {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                    </div>
                    <div style={{ marginTop: 8 }}><StatusPill status={m.subscriptionStatus} /></div>
                    <div className="member-card-actions">
                      <button type="button" onClick={() => openMember(m.id)} style={adminBtnGhost}>View</button>
                      {m.subscriptionStatus === 'active' ? (
                        <button type="button" onClick={() => suspend(m.id)} style={adminBtnDanger}>Suspend</button>
                      ) : (
                        <button type="button" onClick={() => activate(m.id)} style={adminBtn}>Activate</button>
                      )}
                    </div>
                  </article>
                );
              })}
              {!filteredMembers.length && (
                <p style={{ margin: 0, color: '#64748b' }}>No members match this search.</p>
              )}
            </div>
          </AdminPanel>

          {selectedMemberId && (
            <div
              role="presentation"
              className="admin-modal-backdrop"
              onClick={closeMember}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 40,
                background: 'rgba(15, 23, 42, 0.45)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '4vh 1rem 2rem',
                overflowY: 'auto',
              }}
            >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={memberDetail?.name ?? 'Member'}
              className="admin-modal-dialog"
              onClick={(e) => e.stopPropagation()}
              style={{ width: 'min(920px, 100%)' }}
            >
            <AdminPanel
              title={memberDetail?.name ?? 'Member'}
              action={
                <button type="button" onClick={closeMember} style={adminBtnGhost}>
                  Close
                </button>
              }
            >
              {memberLoading && <p style={{ margin: 0, color: '#64748b' }}>Loading member…</p>}
              {memberError && <p style={{ margin: 0, color: '#dc2626' }}>{memberError}</p>}
              {memberDetail && (<>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {(['overview', 'ponds', 'stocks', 'economics'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setDetailTab(t)} style={tabBtn(detailTab === t)}>
                    {t === 'overview' ? 'Overview' : t === 'ponds' ? 'Ponds' : t === 'stocks' ? 'Stocks' : 'Economics'}
                  </button>
                ))}
              </div>

              {detailTab === 'overview' && (
                <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div><strong>Email:</strong> {memberDetail.email}</div>
                  <div><strong>Phone:</strong> {memberDetail.phone ?? '—'}</div>
                  <div><strong>Gender:</strong> {memberDetail.gender ?? '—'}</div>
                  <div>
                    <strong>What they do:</strong>{' '}
                    {(memberDetail.categories ?? []).length
                      ? (memberDetail.categories ?? []).map(memberCategoryLabel).join(' · ')
                      : '—'}
                  </div>
                  <div><strong>Est. output / year:</strong> {memberDetail.estimatedFishOutputYear ?? '—'}</div>
                  <div><strong>Role / plan:</strong> {memberDetail.role} · {memberDetail.subscriptionTier} · <StatusPill status={memberDetail.subscriptionStatus} /></div>
                  <div>
                    <strong>Paid / credited until:</strong>{' '}
                    {memberDetail.subscriptionPaidUntil
                      ? new Date(memberDetail.subscriptionPaidUntil).toLocaleString()
                      : '—'}
                  </div>

                  <div
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.85rem 1rem',
                      background: '#f0fdfa',
                      border: '1px solid #99f6e4',
                      borderRadius: 10,
                      display: 'grid',
                      gap: '0.65rem',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#0f766e' }}>Credit subscription time</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        style={{ ...adminInput, width: 88 }}
                        aria-label="Credit amount"
                      />
                      <select
                        value={creditUnit}
                        onChange={(e) => setCreditUnit(e.target.value as 'days' | 'weeks')}
                        style={{ ...adminInput, width: 110 }}
                        aria-label="Credit unit"
                      >
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                      </select>
                      <select
                        value={creditTier}
                        onChange={(e) => setCreditTier(e.target.value)}
                        style={{ ...adminInput, minWidth: 150 }}
                        aria-label="Plan tier"
                      >
                        <option value="">Keep current plan</option>
                        <option value="basic">Fishmaster Lite</option>
                        <option value="standard">Fishmaster Plus</option>
                        <option value="premium">Fishmaster Max</option>
                      </select>
                    </div>
                    <input
                      placeholder="Optional note to the member"
                      value={creditNote}
                      onChange={(e) => setCreditNote(e.target.value)}
                      style={adminInput}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        disabled={creditBusy}
                        onClick={() => creditSubscription(memberDetail.id)}
                        style={{ ...adminBtn, opacity: creditBusy ? 0.6 : 1 }}
                      >
                        {creditBusy ? 'Crediting…' : 'Credit time'}
                      </button>
                      {creditOk && <span style={{ color: '#15803d', fontSize: '0.85rem' }}>{creditOk}</span>}
                    </div>
                  </div>
                  <div>
                    <strong>Farms:</strong>{' '}
                    {memberDetail.farms.length === 0 ? 'None' : memberDetail.farms.map((f) => (
                      <div key={f.id} style={{ marginTop: 6, padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: 8 }}>
                        <div style={{ fontWeight: 600, color: '#0f766e' }}>{f.name}</div>
                        <div style={{ color: '#64748b' }}>
                          {[
                            f.location && f.location !== f.name ? f.location : '',
                            placeBits(f.city, f.state, f.country),
                            f.lga ? `LGA: ${f.lga}` : '',
                          ].filter(Boolean).join(' · ') || 'Location not recorded'}
                        </div>
                        {f.latitude != null && f.longitude != null && (
                          <a href={`https://www.google.com/maps?q=${f.latitude},${f.longitude}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0d9488', fontSize: '0.85rem' }}>
                            GPS {f.latitude.toFixed(4)}, {f.longitude.toFixed(4)}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem', color: '#475569' }}>
                    <span>{memberDetail.summary.pondCount} ponds</span>
                    <span>{memberDetail.summary.cycleCount} cycles</span>
                    <span>{memberDetail.summary.totalStocked.toLocaleString()} stocked</span>
                    <span>~{memberDetail.summary.presentQtyEstimate.toLocaleString()} present</span>
                  </div>
                </div>
              )}

              {detailTab === 'ponds' && (
                <AdminTable>
                  <thead>
                    <tr>
                      <th style={th}>Name</th>
                      <th style={th}>Type</th>
                      <th style={th}>Volume (m³)</th>
                      <th style={th}>Farm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberDetail.farms.flatMap((f) => f.ponds.map((p) => (
                      <tr key={p.id}>
                        <td style={td}>{p.name} (#{p.number})</td>
                        <td style={td}>{p.pondType ?? '—'}</td>
                        <td style={td}>{(p.lengthM * p.widthM * p.depthM).toFixed(1)}</td>
                        <td style={td}>{f.name}</td>
                      </tr>
                    )))}
                    {!memberDetail.summary.pondCount && (
                      <tr><td style={td} colSpan={4}>No ponds yet.</td></tr>
                    )}
                  </tbody>
                </AdminTable>
              )}

              {detailTab === 'stocks' && (
                <AdminTable>
                  <thead>
                    <tr>
                      <th style={th}>Pond</th>
                      <th style={th}>Qty stocked</th>
                      <th style={th}>Present (est.)</th>
                      <th style={th}>Avg wt (g)</th>
                      <th style={th}>Stocked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberDetail.farms.flatMap((f) => f.ponds.flatMap((p) => p.cycles.map((c) => {
                      const mort = c.mortalityLogs.reduce((s, l) => s + l.count, 0);
                      return (
                        <tr key={c.id}>
                          <td style={td}>{p.name}</td>
                          <td style={td}>{c.quantityStocked.toLocaleString()}</td>
                          <td style={td}>{Math.max(0, c.quantityStocked - mort).toLocaleString()}</td>
                          <td style={td}>{c.averageWeightAtStockingG}</td>
                          <td style={td}>{new Date(c.stockingDate).toLocaleDateString()}</td>
                        </tr>
                      );
                    })))}
                    {!memberDetail.summary.cycleCount && (
                      <tr><td style={td} colSpan={5}>No stock cycles yet.</td></tr>
                    )}
                  </tbody>
                </AdminTable>
              )}

              {detailTab === 'economics' && (
                <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div><strong>Sales revenue:</strong> {naira(memberDetail.summary.salesTotalRevenue)}</div>
                  <div><strong>Fish sold (qty):</strong> {memberDetail.summary.salesTotalQty.toLocaleString()}</div>
                  <div><strong>Marketplace listings:</strong> {memberDetail.summary.marketProductCount}</div>
                  {memberDetail.farms.some((f) => f.marketProducts.length) && (
                    <AdminTable>
                      <thead>
                        <tr>
                          <th style={th}>Product</th>
                          <th style={th}>Price</th>
                          <th style={th}>Qty</th>
                          <th style={th}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memberDetail.farms.flatMap((f) => f.marketProducts.map((mp) => (
                          <tr key={mp.id}>
                            <td style={td}>{mp.name}</td>
                            <td style={td}>{naira(mp.price)}</td>
                            <td style={td}>{mp.quantity}</td>
                            <td style={td}>{mp.sold ? 'Sold' : 'Active'}</td>
                          </tr>
                        )))}
                      </tbody>
                    </AdminTable>
                  )}
                </div>
              )}
              </>)}
            </AdminPanel>
            </div>
            </div>
          )}
        </div>
      )}

      {section === 'directory' && (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <AdminPanel
            title="Who does what — by location"
            count={directory?.members.length ?? 0}
            action={
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select value={dirCategory} onChange={(e) => setDirCategory(e.target.value)} style={adminInput}>
                  <option value="">All categories</option>
                  {MEMBER_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <input placeholder="Filter state" value={dirState} onChange={(e) => setDirState(e.target.value)} style={adminInput} />
                <input placeholder="Filter country" value={dirCountry} onChange={(e) => setDirCountry(e.target.value)} style={adminInput} />
              </div>
            }
          >
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem' }}>
              Backend view of every member&apos;s location and activity categories (one or more).
            </p>
            <AdminTable>
              <thead>
                <tr>
                  <th style={th}>Location</th>
                  <th style={th}>Members</th>
                  <th style={th}>Activities in this area</th>
                </tr>
              </thead>
              <tbody>
                {(directory?.byLocation ?? []).map((loc) => (
                  <tr key={`${loc.country}-${loc.state}-${loc.city}`}>
                    <td style={td}>
                      <strong>{[loc.city, loc.state, loc.country].filter(Boolean).join(', ') || 'Unknown'}</strong>
                    </td>
                    <td style={td}>{loc.memberCount}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {Object.entries(loc.categoryCounts).map(([c, n]) => (
                          <span key={c} style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.2rem 0.45rem', borderRadius: 4 }}>
                            {memberCategoryLabel(c)} ({n})
                          </span>
                        ))}
                        {!Object.keys(loc.categoryCounts).length && <span style={{ color: '#94a3b8' }}>No categories set</span>}
                      </div>
                    </td>
                  </tr>
                ))}
                {!directory?.byLocation.length && (
                  <tr><td style={td} colSpan={3}>No members match these filters.</td></tr>
                )}
              </tbody>
            </AdminTable>
          </AdminPanel>

          <AdminPanel title="Members in filter" count={directory?.members.length ?? 0}>
            <AdminTable>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Location</th>
                  <th style={th}>What they do</th>
                </tr>
              </thead>
              <tbody>
                {(directory?.members ?? []).map((m) => (
                  <tr key={m.id}>
                    <td style={td}><strong>{m.name}</strong><div style={{ fontSize: '0.8rem', color: '#64748b' }}>{m.email}</div></td>
                    <td style={{ ...td, fontSize: '0.85rem' }}>
                      {[m.location.farmName, m.location.city, m.location.lga, m.location.state, m.location.country]
                        .filter(Boolean)
                        .join(' · ')}
                    </td>
                    <td style={td}>
                      {(m.categories ?? []).map(memberCategoryLabel).join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          </AdminPanel>
        </div>
      )}

      {section === 'broadcasts' && (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <AdminPanel title="Send to all members">
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.75rem' }}>
              Articles, information, pictures and videos each have their own tab. For a sponsored post, tick exactly where it should appear. After it is published, copy the share link and post that on Facebook, WhatsApp, or LinkedIn — not the homepage.
            </p>
            {broadcastOk && <p style={{ color: '#15803d', fontWeight: 600, margin: '0 0 0.75rem' }}>{broadcastOk}</p>}
            {error && <p style={{ color: '#dc2626', fontWeight: 600, margin: '0 0 0.75rem' }}>{error}</p>}
            <form onSubmit={createPost} style={{ display: 'grid', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Member tab
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  style={{ ...adminInput, display: 'block', marginTop: 4, width: '100%' }}
                >
                  {CONTENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
              {form.type === 'advert' && (
                <PlacePicker value={form.placements} onChange={(placements) => setForm((f) => ({ ...f, placements }))} />
              )}
              <input placeholder="Title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} style={adminInput} />
              <textarea placeholder={needsMedia ? (form.type === 'advert' ? 'Caption (optional — picture or video can stand alone)' : 'Caption (optional)') : 'Article or message'} required={!needsMedia} rows={needsMedia ? 3 : 6} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} style={adminInput} />
              {needsMedia && (
                <label style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {form.type === 'advert'
                    ? 'Picture or video (optional, max 80 MB)'
                    : form.type === 'video'
                      ? 'Upload a video (MP4, WebM, or MOV, max 80 MB)'
                      : 'Upload a picture (JPG, PNG, WebP, or GIF, max 80 MB)'}
                  <input
                    type="file"
                    accept={form.type === 'picture'
                      ? 'image/jpeg,image/png,image/webp,image/gif'
                      : form.type === 'video'
                        ? 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v'
                        : 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v'}
                    onChange={(e) => {
                      uploadMediaFile(e.target.files?.[0] ?? null);
                      e.target.value = '';
                    }}
                    style={{ display: 'block', marginTop: 8 }}
                  />
                  {form.mediaUrl.startsWith('/uploads/') && (
                    <span style={{ display: 'block', marginTop: 6, color: '#15803d', fontWeight: 600 }}>File ready. Add a title, then publish.</span>
                  )}
                  {form.mediaUrl && (form.type === 'video' || isVideoMedia(form.mediaUrl)) && (
                    <video src={mediaSrc(form.mediaUrl)} controls style={{ width: '100%', maxHeight: 220, marginTop: 8, background: '#000', borderRadius: 8 }} />
                  )}
                  {form.mediaUrl && form.type !== 'video' && !isVideoMedia(form.mediaUrl) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaSrc(form.mediaUrl)} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', marginTop: 8, borderRadius: 8 }} />
                  )}
                  <input
                    placeholder={form.type === 'advert' ? 'Or paste a picture or video URL' : form.type === 'video' ? 'Or paste a video URL' : 'Or paste an image URL'}
                    value={form.mediaUrl.startsWith('/uploads/') ? '' : form.mediaUrl}
                    onChange={(e) => setForm((f) => ({ ...f, mediaUrl: e.target.value }))}
                    style={{ ...adminInput, display: 'block', marginTop: 8, width: '100%' }}
                  />
                </label>
              )}
              <button type="submit" disabled={uploading} style={{ ...adminBtn, width: 'fit-content', opacity: uploading ? 0.6 : 1 }}>
                {uploading ? 'Uploading…' : 'Publish to all members'}
              </button>
            </form>
            <label style={{ display: 'block', marginTop: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
              Or upload several articles (.txt or .md). Each file becomes one article. Videos and pictures go in the file picker above, not here.
              <input
                type="file"
                accept=".txt,.md,.markdown,text/plain"
                multiple
                onChange={(e) => {
                  uploadArticleFiles(e.target.files);
                  e.target.value = '';
                }}
                style={{ display: 'block', marginTop: 8 }}
              />
            </label>
          </AdminPanel>

          <AdminPanel title="Published posts" count={posts.length}>
            {posts.map((p) => (
              <div key={p.id} style={{ borderTop: '1px solid #f1f5f9', padding: '0.85rem 0' }}>
                {editingId === p.id ? (
                  <form onSubmit={saveEdit} style={{ display: 'grid', gap: '0.5rem' }}>
                    <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} style={adminInput}>
                      {CONTENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    {editForm.type === 'advert' && (
                      <PlacePicker value={editForm.placements} onChange={(placements) => setEditForm({ ...editForm, placements })} />
                    )}
                    <input placeholder="Title" required value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} style={adminInput} />
                    <textarea placeholder={editForm.type === 'advert' ? 'Caption (optional)' : 'Message body'} required={editForm.type !== 'advert'} rows={3} value={editForm.body} onChange={(e) => setEditForm({ ...editForm, body: e.target.value })} style={adminInput} />
                    {needsMediaEdit && (
                      <>
                        <input
                          type="file"
                          accept={editForm.type === 'picture'
                            ? 'image/jpeg,image/png,image/webp,image/gif'
                            : editForm.type === 'video'
                              ? 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v'
                              : 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v'}
                          onChange={(e) => {
                            uploadMediaFile(e.target.files?.[0] ?? null, 'edit');
                            e.target.value = '';
                          }}
                        />
                        {editForm.mediaUrl && isVideoMedia(editForm.mediaUrl) && (
                          <video src={mediaSrc(editForm.mediaUrl)} controls style={{ width: '100%', maxHeight: 180, background: '#000', borderRadius: 8 }} />
                        )}
                        {editForm.mediaUrl && !isVideoMedia(editForm.mediaUrl) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaSrc(editForm.mediaUrl)} alt="" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }} />
                        )}
                        <input
                          placeholder={editForm.type === 'advert' ? 'Picture or video URL' : editForm.type === 'video' ? 'Video URL' : 'Image URL'}
                          value={editForm.mediaUrl}
                          onChange={(e) => setEditForm({ ...editForm, mediaUrl: e.target.value })}
                          style={adminInput}
                        />
                      </>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" style={adminBtn}>Save changes</button>
                      <button type="button" onClick={cancelEdit} style={adminBtnGhost}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <strong>[{p.type}] {p.title}</strong>
                    {p.type === 'advert' && (
                      <p style={{ fontSize: '0.8rem', color: '#0d4f6e', margin: '0.2rem 0' }}>
                        Shows in: {(p.placements?.length
                          ? AD_PLACES.filter((place) => p.placements?.includes(place.id)).map((place) => place.label)
                          : ['Everywhere (edit to choose)']
                        ).join(', ')}
                      </p>
                    )}
                    {p.mediaUrl && <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0' }}>{p.mediaUrl}</p>}
                    <p style={{ margin: '0.25rem 0', color: '#64748b', fontSize: '0.9rem' }}>{p.body.slice(0, 140)}{p.body.length > 140 ? '…' : ''}</p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => copyShareLink(p.id)} style={{ ...adminBtnGhost, fontSize: '0.8rem' }}>Copy share link</button>
                      <button onClick={() => startEdit(p)} style={{ ...adminBtnGhost, fontSize: '0.8rem' }}>Edit</button>
                      <button onClick={() => deletePost(p.id)} style={{ ...adminBtnDanger, fontSize: '0.8rem' }}>Delete</button>
                    </div>
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                      Boost this link, not the homepage: {typeof window !== 'undefined' ? `${window.location.origin}/s/${p.id}` : `/s/${p.id}`}
                    </p>
                  </>
                )}
              </div>
            ))}
            {!posts.length && <p style={{ color: '#94a3b8', margin: 0 }}>No broadcasts yet.</p>}
          </AdminPanel>
        </div>
      )}

      {section === 'messages' && (
        <AdminPanel title="Message a member">
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.75rem' }}>
            Send report-linked or pond-specific advice to one member.
          </p>
          <form onSubmit={sendMessage} style={{ display: 'grid', gap: '0.75rem' }}>
            <select
              required
              value={msgForm.userId}
              onChange={(e) => {
                const uid = e.target.value;
                setMsgForm({ ...msgForm, userId: uid, pondId: '', pondLabel: '' });
                loadPonds(uid);
              }}
              style={adminInput}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
              ))}
            </select>
            {memberPonds.length > 0 && (
              <select
                value={msgForm.pondId}
                onChange={(e) => {
                  const pond = memberPonds.find((p) => p.pondId === e.target.value);
                  setMsgForm({
                    ...msgForm,
                    pondId: e.target.value,
                    pondLabel: pond?.label ?? '',
                  });
                }}
                style={adminInput}
              >
                <option value="">All ponds / general message</option>
                {memberPonds.map((p) => (
                  <option key={p.pondId} value={p.pondId}>{p.label}</option>
                ))}
              </select>
            )}
            <select
              value={msgForm.reportNum}
              onChange={(e) => setMsgForm({ ...msgForm, reportNum: e.target.value })}
              style={adminInput}
            >
              <option value="">Optional — link to report</option>
              {REPORT_CATALOG.map((r) => (
                <option key={r.id} value={r.id}>{r.id}. {r.title}</option>
              ))}
            </select>
            <input placeholder="Title" required value={msgForm.title} onChange={(e) => setMsgForm({ ...msgForm, title: e.target.value })} style={adminInput} />
            <textarea placeholder="Message body" required rows={5} value={msgForm.body} onChange={(e) => setMsgForm({ ...msgForm, body: e.target.value })} style={adminInput} />
            <button type="submit" style={{ ...adminBtn, width: 'fit-content' }}>Send to member</button>
          </form>
        </AdminPanel>
      )}

      {section === 'reports' && (
        <AdminPanel title="All Reports" count={REPORT_CATALOG.length}>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem' }}>
            Catalog of the 21 pond reports included with subscription. Member-facing dashboards generate these from stock cycles.
          </p>
          <AdminTable>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Type</th>
                <th style={th}>Short</th>
              </tr>
            </thead>
            <tbody>
              {REPORT_CATALOG.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{r.id}</td>
                  <td style={td}>{r.title}</td>
                  <td style={td}><span style={{ color: '#0d9488' }}>{r.short}</span></td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </AdminPanel>
      )}

      {section === 'staff' && (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {isSuper && (
            <AdminPanel title="Create staff">
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.75rem' }}>
                Creates a manager account. Super admins can later promote via role change.
              </p>
              <form onSubmit={createStaff} style={{ display: 'grid', gap: '0.75rem', maxWidth: 480 }}>
                <input placeholder="Name" required value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} style={adminInput} />
                <input type="email" placeholder="Email" required value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} style={adminInput} />
                <input type="password" placeholder="Password" required minLength={6} value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} style={adminInput} />
                <input placeholder="Phone" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} style={adminInput} />
                <button type="submit" style={{ ...adminBtn, width: 'fit-content' }}>Create manager</button>
              </form>
            </AdminPanel>
          )}
          <AdminPanel title="All Staff" count={staff.length}>
            <AdminTable>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Email</th>
                  <th style={th}>Role</th>
                  <th style={th}>Status</th>
                  {isSuper && <th style={th}>Promote</th>}
                </tr>
              </thead>
              <tbody>
                {staff.map((m) => (
                  <tr key={m.id}>
                    <td style={td}><strong>{m.name}</strong></td>
                    <td style={td}>{m.email}</td>
                    <td style={td}>{m.role}</td>
                    <td style={td}><StatusPill status={m.subscriptionStatus} /></td>
                    {isSuper && (
                      <td style={td}>
                        {m.role !== 'super_admin' && (
                          <button type="button" onClick={() => promoteRole(m.id, 'super_admin')} style={{ ...adminBtnGhost, fontSize: '0.75rem' }}>
                            Make super admin
                          </button>
                        )}
                        {m.role === 'super_admin' && (
                          <button type="button" onClick={() => promoteRole(m.id, 'manager')} style={{ ...adminBtnGhost, fontSize: '0.75rem' }}>
                            Demote to manager
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {!staff.length && (
                  <tr>
                    <td style={td} colSpan={isSuper ? 5 : 4}>No staff accounts yet.</td>
                  </tr>
                )}
              </tbody>
            </AdminTable>
          </AdminPanel>
        </div>
      )}

      {section === 'marketplace' && marketTab === 'categories' && (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <AdminPanel title={editingCatId ? 'Update category' : 'New category'}>
            <form onSubmit={saveCategory} style={{ display: 'grid', gap: '0.75rem', maxWidth: 520 }}>
              <input placeholder="Title" required value={catForm.title} onChange={(e) => setCatForm({ ...catForm, title: e.target.value })} style={adminInput} />
              <textarea placeholder="Description" rows={3} value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} style={adminInput} />
              <input placeholder="Image URL (optional)" value={catForm.imageUrl} onChange={(e) => setCatForm({ ...catForm, imageUrl: e.target.value })} style={adminInput} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" style={adminBtn}>{editingCatId ? 'Update' : 'Create'} category</button>
                {editingCatId && (
                  <button type="button" style={adminBtnGhost} onClick={() => { setEditingCatId(null); setCatForm({ title: '', description: '', imageUrl: '' }); }}>Cancel</button>
                )}
              </div>
            </form>
          </AdminPanel>
          <AdminPanel title="Categories" count={categories.length}>
            <AdminTable>
              <thead>
                <tr>
                  <th style={th}>Title</th>
                  <th style={th}>Description</th>
                  <th style={th}>Products</th>
                  <th style={th}>Created</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td style={td}><strong>{c.title}</strong></td>
                    <td style={td}>{c.description?.slice(0, 80) ?? '—'}{(c.description?.length ?? 0) > 80 ? '…' : ''}</td>
                    <td style={td}>{c._count?.products ?? 0}</td>
                    <td style={td}>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td style={td}>
                      <button type="button" style={{ ...adminBtnGhost, fontSize: '0.75rem', marginRight: 6 }} onClick={() => {
                        setEditingCatId(c.id);
                        setCatForm({ title: c.title, description: c.description ?? '', imageUrl: c.imageUrl ?? '' });
                      }}>Edit</button>
                      <button type="button" style={{ ...adminBtnDanger, fontSize: '0.75rem' }} onClick={() => deleteCategory(c.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {!categories.length && (
                  <tr><td style={td} colSpan={5}>No data available</td></tr>
                )}
              </tbody>
            </AdminTable>
          </AdminPanel>
        </div>
      )}

      {section === 'marketplace' && marketTab === 'products' && (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <AdminPanel title={editingProdId ? 'Update product' : 'New product'}>
            <form onSubmit={saveProduct} style={{ display: 'grid', gap: '0.75rem', maxWidth: 520 }}>
              <select required value={prodForm.farmId} onChange={(e) => setProdForm({ ...prodForm, farmId: e.target.value })} style={adminInput}>
                <option value="">Select farm…</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>{f.name} ({f.user.name})</option>
                ))}
              </select>
              <select value={prodForm.categoryId} onChange={(e) => setProdForm({ ...prodForm, categoryId: e.target.value })} style={adminInput}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <input placeholder="Name" required value={prodForm.name} onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })} style={adminInput} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" placeholder="Price (₦)" required value={prodForm.price} onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })} style={{ ...adminInput, flex: 1 }} />
                <input type="number" placeholder="Quantity" required value={prodForm.quantity} onChange={(e) => setProdForm({ ...prodForm, quantity: e.target.value })} style={{ ...adminInput, flex: 1 }} />
              </div>
              <input placeholder="Image URL" value={prodForm.imageUrl} onChange={(e) => setProdForm({ ...prodForm, imageUrl: e.target.value })} style={adminInput} />
              <textarea placeholder="Description" rows={3} value={prodForm.description} onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })} style={adminInput} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
                <input type="checkbox" checked={prodForm.sold} onChange={(e) => setProdForm({ ...prodForm, sold: e.target.checked })} />
                Mark as sold
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" style={adminBtn}>{editingProdId ? 'Update' : 'Create'} product</button>
                {editingProdId && (
                  <button type="button" style={adminBtnGhost} onClick={() => {
                    setEditingProdId(null);
                    setProdForm({ farmId: '', categoryId: '', name: '', price: '', quantity: '', imageUrl: '', description: '', sold: false });
                  }}>Cancel</button>
                )}
              </div>
            </form>
          </AdminPanel>
          <AdminPanel title="Products" count={products.length}>
            <AdminTable>
              <thead>
                <tr>
                  <th style={th}>Product</th>
                  <th style={th}>Farm</th>
                  <th style={th}>Amount</th>
                  <th style={th}>Qty</th>
                  <th style={th}>Status</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td style={td}>
                      <strong>{p.name}</strong>
                      {p.category && <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{p.category.title}</div>}
                    </td>
                    <td style={td}>
                      {p.farm?.name ?? '—'}
                      {p.farm?.user && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.farm.user.name}</div>}
                    </td>
                    <td style={td}>{naira(p.price)}</td>
                    <td style={td}>{p.quantity}</td>
                    <td style={td}>
                      <span style={{
                        display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
                        background: p.sold ? '#fee2e2' : '#ccfbf1', color: p.sold ? '#b91c1c' : '#0f766e',
                      }}>
                        {p.sold ? 'Sold' : 'Active'}
                      </span>
                    </td>
                    <td style={td}>
                      <button type="button" style={{ ...adminBtnGhost, fontSize: '0.75rem', marginRight: 6 }} onClick={() => {
                        setEditingProdId(p.id);
                        setProdForm({
                          farmId: p.farmId,
                          categoryId: p.categoryId ?? '',
                          name: p.name,
                          price: String(p.price),
                          quantity: String(p.quantity),
                          imageUrl: p.imageUrl ?? '',
                          description: p.description ?? '',
                          sold: p.sold,
                        });
                      }}>Edit</button>
                      <button type="button" style={{ ...adminBtnDanger, fontSize: '0.75rem' }} onClick={() => deleteProduct(p.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {!products.length && (
                  <tr><td style={td} colSpan={6}>No data available</td></tr>
                )}
              </tbody>
            </AdminTable>
          </AdminPanel>
        </div>
      )}

      {section === 'config' && (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button type="button" onClick={() => setConfigTab('ingredients')} style={tabBtn(configTab === 'ingredients')}>Ingredients</button>
            <button type="button" onClick={() => setConfigTab('fcr')} style={tabBtn(configTab === 'fcr')}>FCR months</button>
            <button type="button" onClick={() => setConfigTab('feed-brands')} style={tabBtn(configTab === 'feed-brands')}>Feed brands</button>
          </div>

          {configTab === 'ingredients' && (
            <AdminPanel title="Ingredients" count={filteredIngredients.length} action={
              <select value={ingredientFilter} onChange={(e) => setIngredientFilter(e.target.value as typeof ingredientFilter)} style={{ ...adminInput, width: 'auto', margin: 0 }}>
                <option value="all">All classes</option>
                <option value="protein">Protein</option>
                <option value="carbohydrate">Carbohydrate</option>
                <option value="others">Others</option>
              </select>
            }>
              <form onSubmit={saveIngredients}>
                <AdminTable>
                  <thead>
                    <tr>
                      <th style={th}>Name</th>
                      <th style={th}>Crude protein</th>
                      <th style={th}>Inclusion ratio</th>
                      <th style={th}>Composition</th>
                      <th style={th}>Food class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIngredients.map((row) => {
                      const idx = ingredients.findIndex((i) => i.name === row.name);
                      return (
                        <tr key={row.name}>
                          <td style={td}>{row.name}</td>
                          <td style={td}>
                            <input type="number" step="0.1" value={row.crudeProteinPct} onChange={(e) => {
                              const next = [...ingredients];
                              next[idx] = { ...row, crudeProteinPct: e.target.value };
                              setIngredients(next);
                            }} style={{ ...adminInput, width: 80, margin: 0 }} />
                          </td>
                          <td style={td}>
                            <input type="number" step="0.001" value={row.inclusionRatio} onChange={(e) => {
                              const next = [...ingredients];
                              next[idx] = { ...row, inclusionRatio: e.target.value };
                              setIngredients(next);
                            }} style={{ ...adminInput, width: 90, margin: 0 }} />
                          </td>
                          <td style={td}>
                            <input value={row.composition} onChange={(e) => {
                              const next = [...ingredients];
                              next[idx] = { ...row, composition: e.target.value };
                              setIngredients(next);
                            }} style={{ ...adminInput, margin: 0 }} />
                          </td>
                          <td style={td}>
                            <select value={row.foodClass} onChange={(e) => {
                              const next = [...ingredients];
                              next[idx] = { ...row, foodClass: e.target.value as IngredientRow['foodClass'] };
                              setIngredients(next);
                            }} style={{ ...adminInput, margin: 0, width: 'auto' }}>
                              <option value="protein">Protein</option>
                              <option value="carbohydrate">Carbohydrate</option>
                              <option value="others">Others</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                    {!filteredIngredients.length && (
                      <tr><td style={td} colSpan={5}>No ingredients — run db:seed to load the legacy 25.</td></tr>
                    )}
                  </tbody>
                </AdminTable>
                <button type="submit" style={{ ...adminBtn, marginTop: '0.75rem' }}>Save ingredients</button>
              </form>
            </AdminPanel>
          )}

          {configTab === 'fcr' && (
            <AdminPanel title="Update FCR">
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.75rem' }}>
                Months 1–6 body weight % and FCR coefficients (global defaults for the calc engine).
              </p>
              <form onSubmit={saveFcr}>
                <AdminTable>
                  <thead>
                    <tr>
                      <th style={th}>Month</th>
                      <th style={th}>Body weight</th>
                      <th style={th}>FCR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fcrRows.map((row, i) => (
                      <tr key={row.month}>
                        <td style={td}>Month {row.month}</td>
                        <td style={td}>
                          <input type="number" step="0.001" value={row.bodyWeightPct} onChange={(e) => {
                            const next = [...fcrRows];
                            next[i] = { ...row, bodyWeightPct: e.target.value };
                            setFcrRows(next);
                          }} style={{ ...adminInput, width: 120, margin: 0 }} />
                        </td>
                        <td style={td}>
                          <input type="number" step="0.01" value={row.fcr} onChange={(e) => {
                            const next = [...fcrRows];
                            next[i] = { ...row, fcr: e.target.value };
                            setFcrRows(next);
                          }} style={{ ...adminInput, width: 100, margin: 0 }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </AdminTable>
                <button type="submit" style={{ ...adminBtn, marginTop: '0.75rem' }}>Save FCR</button>
              </form>
            </AdminPanel>
          )}

          {configTab === 'feed-brands' && (
            <AdminPanel title="Feed brands (per cycle)">
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem' }}>
                Set feed brand and bag cost for each culture month (1–6). Choose a member and pond first.
              </p>
              <form onSubmit={saveFeedBrands} style={{ display: 'grid', gap: '0.75rem' }}>
                <select
                  value={feedMemberId}
                  onChange={(e) => onFeedMemberChange(e.target.value)}
                  style={adminInput}
                >
                  <option value="">Select member…</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                  ))}
                </select>
                {feedMemberId && (
                  <FeedPondSelect memberId={feedMemberId} cycleId={feedCycleId} onChange={onFeedPondChange} />
                )}
                {feedCycleId && (
                  <>
                    <AdminTable>
                      <thead>
                        <tr>
                          <th style={th}>Month</th>
                          <th style={th}>Brand</th>
                          <th style={th}>Size (mm)</th>
                          <th style={th}>Cost/bag</th>
                          <th style={th}>Protein %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feedBrands.map((row, i) => (
                          <tr key={row.month}>
                            <td style={td}>Month {row.month}</td>
                            <td style={td}>
                              <input
                                value={row.brand}
                                onChange={(e) => {
                                  const next = [...feedBrands];
                                  next[i] = { ...row, brand: e.target.value };
                                  setFeedBrands(next);
                                }}
                                placeholder="e.g. Skretting"
                                style={{ ...adminInput, margin: 0 }}
                              />
                            </td>
                            <td style={td}>
                              <input
                                type="number"
                                step="0.1"
                                value={row.feedSizeMm}
                                onChange={(e) => {
                                  const next = [...feedBrands];
                                  next[i] = { ...row, feedSizeMm: e.target.value };
                                  setFeedBrands(next);
                                }}
                                style={{ ...adminInput, width: 80, margin: 0 }}
                              />
                            </td>
                            <td style={td}>
                              <input
                                type="number"
                                value={row.costPerBag}
                                onChange={(e) => {
                                  const next = [...feedBrands];
                                  next[i] = { ...row, costPerBag: e.target.value };
                                  setFeedBrands(next);
                                }}
                                style={{ ...adminInput, width: 100, margin: 0 }}
                              />
                            </td>
                            <td style={td}>
                              <input
                                type="number"
                                step="0.1"
                                value={row.crudeProteinPct}
                                onChange={(e) => {
                                  const next = [...feedBrands];
                                  next[i] = { ...row, crudeProteinPct: e.target.value };
                                  setFeedBrands(next);
                                }}
                                style={{ ...adminInput, width: 80, margin: 0 }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </AdminTable>
                    <button type="submit" style={{ ...adminBtn, width: 'fit-content' }}>Save feed brands</button>
                  </>
                )}
              </form>
            </AdminPanel>
          )}
        </div>
      )}
    </AdminShell>
  );
}

function StatusPill({ status }: { status: string }) {
  const active = status === 'active';
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.15rem 0.5rem',
      borderRadius: 999,
      fontSize: '0.75rem',
      fontWeight: 600,
      background: active ? '#ccfbf1' : '#fee2e2',
      color: active ? '#0f766e' : '#b91c1c',
    }}>
      {status}
    </span>
  );
}

function FeedPondSelect({
  memberId,
  cycleId,
  onChange,
}: {
  memberId: string;
  cycleId: string;
  onChange: (cycleId: string) => void;
}) {
  const [ponds, setPonds] = useState<MemberPond[]>([]);

  useEffect(() => {
    apiFetch(`/api/admin/members/${memberId}/ponds`)
      .then((data: MemberPond[]) => setPonds(data.filter((p) => p.cycleId)))
      .catch(() => setPonds([]));
  }, [memberId]);

  if (!ponds.length) {
    return <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>No ponds with stock cycles for this member.</p>;
  }

  return (
    <select value={cycleId} onChange={(e) => onChange(e.target.value)} style={adminInput} required>
      <option value="">Select pond…</option>
      {ponds.map((p) => (
        <option key={p.pondId} value={p.cycleId!}>{p.label}</option>
      ))}
    </select>
  );
}
