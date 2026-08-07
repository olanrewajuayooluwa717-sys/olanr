import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { CONTENT_CATEGORIES, REPORT_CATALOG } from '@fishmaster/shared-types';
import { colors } from './theme';

export function HomeIconGrid() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Content</Text>
      <View style={styles.row}>
        {CONTENT_CATEGORIES.map((c) => (
          <Pressable key={c.type} style={styles.iconBtn} onPress={() => router.push(`/content/${c.type}`)}>
            <Text style={styles.iconEmoji}>{c.icon}</Text>
            <Text style={styles.iconLabel}>{c.label}</Text>
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconBtn: {
    width: '30%',
    minWidth: 96,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconEmoji: { fontSize: 28 },
  iconLabel: { fontSize: 11, color: colors.text, marginTop: 4, textAlign: 'center' },
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
