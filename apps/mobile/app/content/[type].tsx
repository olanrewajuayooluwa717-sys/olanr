import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, Image, Pressable, TextInput, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { API_URL, authHeaders, getToken, isVideoMedia, mediaSrc } from '../../src/api';
import { colors } from '../../src/theme';

const TABS = [
  { id: 'article', label: 'Articles' },
  { id: 'information', label: 'Information' },
  { id: 'picture', label: 'Pictures' },
  { id: 'video', label: 'Videos' },
] as const;

type Post = {
  id: string;
  title: string;
  body: string;
  mediaUrl: string | null;
  createdAt: string;
  author: { name: string };
};

export default function ContentFeedScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const tab = TABS.some((t) => t.id === type) ? type : 'article';
  const [posts, setPosts] = useState<Post[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [ads, setAds] = useState<Post[]>([]);
  const [openAdId, setOpenAdId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/content/ads?place=${tab}`)
      .then((r) => r.json())
      .then((data) => setAds(Array.isArray(data) ? data : []))
      .catch(() => setAds([]));
  }, [tab]);

  useEffect(() => {
    setOpenId(null);
    setQuery('');
    let cancelled = false;
    (async () => {
    const signedIn = !!(await getToken());
    const url = signedIn
      ? `${API_URL}/api/content?type=${tab}`
      : `${API_URL}/api/content/preview?type=${tab}`;
    fetch(url, signedIn ? { headers: await authHeaders() } : undefined)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setPosts(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setPosts([]); });
    })();
    return () => { cancelled = true; };
  }, [tab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q));
  }, [posts, query]);

  const openIndex = filtered.findIndex((p) => p.id === openId);
  const open = openIndex >= 0 ? filtered[openIndex] : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <Pressable key={t.id} onPress={() => router.replace(`/content/${t.id}`)} style={[styles.tab, on && styles.tabOn]}>
              <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {open ? (
        <View>
          <View style={styles.navRow}>
            <Pressable onPress={() => setOpenId(null)}><Text style={styles.nav}>← All</Text></Pressable>
            <Text style={styles.meta}>{openIndex + 1} of {filtered.length}</Text>
          </View>
          <Text style={styles.title}>{open.title}</Text>
          <Text style={styles.meta}>{new Date(open.createdAt).toLocaleDateString()} · {open.author.name}</Text>
          {open.mediaUrl && tab !== 'video' && (
            <Image source={{ uri: mediaSrc(open.mediaUrl) }} style={styles.image} resizeMode="cover" />
          )}
          {open.mediaUrl && tab === 'video' && (
            <Text style={styles.videoHint}>Video: {open.mediaUrl}</Text>
          )}
          {tab !== 'picture' && <Text style={styles.body}>{open.body}</Text>}
          <View style={styles.navRow}>
            <Pressable disabled={openIndex <= 0} onPress={() => openIndex > 0 && setOpenId(filtered[openIndex - 1]!.id)}>
              <Text style={[styles.nav, openIndex <= 0 && styles.navOff]}>Previous</Text>
            </Pressable>
            <Pressable disabled={openIndex >= filtered.length - 1} onPress={() => openIndex < filtered.length - 1 && setOpenId(filtered[openIndex + 1]!.id)}>
              <Text style={[styles.nav, openIndex >= filtered.length - 1 && styles.navOff]}>Next</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View>
          {tab !== 'picture' && (
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={tab === 'video' ? 'Search videos' : 'Search titles'}
              style={styles.search}
              placeholderTextColor={colors.muted}
            />
          )}
          {filtered.length === 0 && <Text style={styles.empty}>Nothing in this tab yet.</Text>}
          {ads[0] && (
            <Pressable onPress={() => setOpenAdId(openAdId === ads[0].id ? null : ads[0].id)} style={styles.sponsor}>
              <Text style={styles.sponsorTag}>Sponsored</Text>
              <Text style={styles.rowTitle}>{ads[0].title}</Text>
              {ads[0].mediaUrl && !isVideoMedia(ads[0].mediaUrl) && (
                <Image source={{ uri: mediaSrc(ads[0].mediaUrl) }} style={styles.image} resizeMode="cover" />
              )}
              {ads[0].mediaUrl && isVideoMedia(ads[0].mediaUrl) && (
                <Text style={styles.meta}>Video ad</Text>
              )}
              <Text style={styles.meta}>{openAdId === ads[0].id ? ads[0].body : ads[0].body.slice(0, 90)}</Text>
            </Pressable>
          )}
          {filtered.map((p, i) => (
            <View key={p.id}>
              <Pressable onPress={() => setOpenId(p.id)} style={styles.row}>
                <Text style={styles.index}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{p.title}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{p.body}</Text>
                </View>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e5e5', marginBottom: 12 },
  tab: { paddingVertical: 10, marginRight: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: colors.text },
  tabText: { fontSize: 13, color: colors.muted, fontWeight: '500' },
  tabTextOn: { color: colors.text, fontWeight: '700' },
  empty: { color: colors.muted },
  search: { backgroundColor: colors.card, borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e5e5e5' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  index: { width: 28, textAlign: 'center', fontWeight: '700', color: colors.primary },
  rowTitle: { fontWeight: '600', color: colors.text, fontSize: 15 },
  title: { fontWeight: '700', color: colors.primary, fontSize: 20, marginTop: 8 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  body: { color: colors.text, marginTop: 10, lineHeight: 22 },
  image: { width: '100%', height: 180, borderRadius: 8, marginVertical: 8 },
  videoHint: { color: colors.muted, fontSize: 12, marginVertical: 4 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  nav: { color: colors.primary, fontWeight: '700' },
  navOff: { color: '#cbd5e1' },
  sponsor: { marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e8f4f8' },
  sponsorTag: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.primary },
});
