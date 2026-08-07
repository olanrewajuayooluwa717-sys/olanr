import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors } from './theme';

export type PondOption = {
  id: string;
  label: string;
};

export function PondSwitcher({
  ponds,
  selectedId,
  onSelect,
}: {
  ponds: PondOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (ponds.length <= 1) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Your ponds</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {ponds.map((p) => (
          <Pressable
            key={p.id}
            style={[styles.chip, selectedId === p.id && styles.chipActive]}
            onPress={() => onSelect(p.id)}
          >
            <Text style={[styles.chipText, selectedId === p.id && styles.chipTextActive]}>{p.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  label: { fontSize: 12, color: colors.muted, marginBottom: 6 },
  row: { gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: '#ddd' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },
});
