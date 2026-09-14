import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { REPORT_CATALOG } from '@fishmaster/shared-types';
import { colors } from './theme';

const CONTENT_TABS = [
  { id: 'article', label: 'Articles' },
  { id: 'information', label: 'Information' },
  { id: 'picture', label: 'Pictures' },
  { id: 'video', label: 'Videos' },
] as const;

export function HomeIconGrid() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Content</Text>
      <View style={styles.tabs}>
        {CONTENT_TABS.map((c) => (
          <Pressable key={c.id} onPress={() => router.push(`/content/${c.id}`)} style={styles.tab}>
            <Text style={styles.tabText}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Reports (free with subscription)</Text>
      <View style={styles.reportGrid}>
        {REPORT_CATALOG.map((r) => (
          <Pressable
            key={r.id}
            style={styles.reportBtn}
            onPress={() => router.push({ pathname: '/(tabs)/reports', params: { report: String(r.id) } })}
          >
            <Text style={styles.reportNum}>{r.id}</Text>
            <Text style={styles.reportShort} numberOfLines={2}>{r.short}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.primary, marginBottom: 8, marginTop: 4 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#efefef', marginBottom: 8 },
  tab: { paddingVertical: 10, marginRight: 14 },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.text },
  reportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reportBtn: {
    width: '22%',
    minWidth: 72,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  reportNum: { fontWeight: '700', color: colors.primary, fontSize: 13 },
  reportShort: { fontSize: 9, color: colors.muted, textAlign: 'center', marginTop: 2 },
});
