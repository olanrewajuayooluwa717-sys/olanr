'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { REPORT_CATALOG } from '@fishmaster/shared-types';
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
import { apiFetch, getRole } from '../../lib/api';

type Member = {
  id: string; name: string; email: string; role: string;
  phone?: string | null; gender?: string | null;
  subscriptionStatus: string; subscriptionTier: string;
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
  subscriptionTier: string; subscriptionStatus: string; createdAt: string;
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
  { value: 'advert', label: 'Adverts' },
  { value: 'article', label: 'Articles' },
  { value: 'information', label: 'Information' },
  { value: 'picture', label: 'Pictures' },
  { value: 'video', label: 'Videos' },
];

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
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberDetail, setMemberDetail] = useState<MemberDetail | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'ponds' | 'stocks' | 'economics'>('overview');
  const [form, setForm] = useState({ type: 'advert', title: '', body: '', mediaUrl: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ type: 'advert', title: '', body: '', mediaUrl: '' });
  const [msgForm, setMsgForm] = useState({ userId: '', title: '', body: '', reportNum: '', pondId: '', pondLabel: '' });
  const [memberPonds, setMemberPonds] = useState<MemberPond[]>([]);
  const [feedMemberId, setFeedMemberId] = useState('');
  const [feedCycleId, setFeedCycleId] = useState('');
  const [feedBrands, setFeedBrands] = useState<FeedBrandRow[]>(EMPTY_FEED_BRANDS());
  const [feedOk, setFeedOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState<string | null>(null);

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
  }, [section]);

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

  const openMember = async (id: string) => {
    setSelectedMemberId(id);
    setDetailTab('overview');
    try {
      const detail = await apiFetch(`/api/admin/members/${id}`);
      setMemberDetail(detail);
    } catch (e) {
      setError(String(e));
      setMemberDetail(null);
    }
  };

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

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      type: form.type,
      title: form.title,
      body: form.body,
      ...(form.mediaUrl ? { mediaUrl: form.mediaUrl } : {}),
    };
    await apiFetch('/api/admin/posts', { method: 'POST', body: JSON.stringify(payload) });
    setForm({ type: 'advert', title: '', body: '', mediaUrl: '' });
    load();
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
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ type: 'advert', title: '', body: '', mediaUrl: '' });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const payload = {
      type: editForm.type,
      title: editForm.title,
      body: editForm.body,
      mediaUrl: editForm.mediaUrl || null,
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

  const needsMediaEdit = editForm.type === 'picture' || editForm.type === 'video';
  const needsMedia = form.type === 'picture' || form.type === 'video';

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.name, m.email, m.phone, m.gender, m.role, ...m.farms.map((f) => `${f.name} ${f.city} ${f.state}`)]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [members, memberQuery]);

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
              <input
                placeholder={`Search ${members.length} members`}
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                style={adminSearch}
              />
            }
          >
            <AdminTable>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Email / phone</th>
                  <th style={th}>Gender</th>
                  <th style={th}>Farm</th>
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
                    <td style={td}>{m.gender ?? '—'}</td>
                    <td style={td}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {m.farms.length === 0 ? 'No farm' : m.farms.map((f) => (
                          <div key={f.id}>
                            {f.name} — {f.city}, {f.state}
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
                    <td style={td} colSpan={6}>No members match this search.</td>
                  </tr>
                )}
              </tbody>
            </AdminTable>
          </AdminPanel>

          {memberDetail && (
            <AdminPanel
              title={memberDetail.name}
              action={
                <button type="button" onClick={() => { setSelectedMemberId(null); setMemberDetail(null); }} style={adminBtnGhost}>
                  Close
                </button>
              }
            >
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
                  <div><strong>Role / plan:</strong> {memberDetail.role} · {memberDetail.subscriptionTier} · <StatusPill status={memberDetail.subscriptionStatus} /></div>
                  <div>
                    <strong>Farms:</strong>{' '}
                    {memberDetail.farms.length === 0 ? 'None' : memberDetail.farms.map((f) => (
                      <div key={f.id} style={{ marginTop: 6, padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: 8 }}>
                        <div style={{ fontWeight: 600, color: '#0f766e' }}>{f.name}</div>
                        <div style={{ color: '#64748b' }}>{f.location} · {f.city}, {f.state}{f.lga ? ` · LGA: ${f.lga}` : ''}</div>
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
            </AdminPanel>
          )}
        </div>
      )}

      {section === 'broadcasts' && (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <AdminPanel title="Send to all members">
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.75rem' }}>
              Adverts, articles, information, pictures, and videos appear on every member&apos;s home page.
            </p>
            <form onSubmit={createPost} style={{ display: 'grid', gap: '0.75rem' }}>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={adminInput}>
                {CONTENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input placeholder="Title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} style={adminInput} />
              <textarea placeholder="Message body" required rows={4} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} style={adminInput} />
              {needsMedia && (
                <input
                  placeholder={form.type === 'video' ? 'Video URL (https://…)' : 'Image URL (https://…)'}
                  value={form.mediaUrl}
                  onChange={(e) => setForm((f) => ({ ...f, mediaUrl: e.target.value }))}
                  style={adminInput}
                />
              )}
              <button type="submit" style={{ ...adminBtn, width: 'fit-content' }}>Publish to all members</button>
            </form>
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
                    <input placeholder="Title" required value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} style={adminInput} />
                    <textarea placeholder="Message body" required rows={3} value={editForm.body} onChange={(e) => setEditForm({ ...editForm, body: e.target.value })} style={adminInput} />
                    {needsMediaEdit && (
                      <input
                        placeholder={editForm.type === 'video' ? 'Video URL' : 'Image URL'}
                        value={editForm.mediaUrl}
                        onChange={(e) => setEditForm({ ...editForm, mediaUrl: e.target.value })}
                        style={adminInput}
                      />
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" style={adminBtn}>Save changes</button>
                      <button type="button" onClick={cancelEdit} style={adminBtnGhost}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <strong>[{p.type}] {p.title}</strong>
                    {p.mediaUrl && <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0' }}>{p.mediaUrl}</p>}
                    <p style={{ margin: '0.25rem 0', color: '#64748b', fontSize: '0.9rem' }}>{p.body.slice(0, 140)}{p.body.length > 140 ? '…' : ''}</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => startEdit(p)} style={{ ...adminBtnGhost, fontSize: '0.8rem' }}>Edit</button>
                      <button onClick={() => deletePost(p.id)} style={{ ...adminBtnDanger, fontSize: '0.8rem' }}>Delete</button>
                    </div>
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
