import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { apiFetch } from '../src/api';
import { colors } from '../src/theme';

type Message = {
  id: string;
  title: string;
  body: string;
  reportNum: number | null;
  pondLabel: string | null;
  read: boolean;
  createdAt: string;
};

export default function MessagesScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/messages')
      .then(setMessages)
      .catch((e) => setError(String(e)));
  }, []);

  const markRead = async (id: string) => {
    await apiFetch(`/api/messages/${id}/read`, { method: 'PATCH' });
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Messages from Fishmaster</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {messages.length === 0 && !error && <Text style={styles.empty}>No messages yet.</Text>}
      {messages.map((m) => (
        <View key={m.id} style={styles.card}>
          <Text style={styles.title}>{m.title}</Text>
          <Text style={styles.meta}>
            {new Date(m.createdAt).toLocaleString()}
            {m.pondLabel ? ` · ${m.pondLabel}` : ''}
            {m.reportNum ? ` · Report ${m.reportNum}` : ''}
            {!m.read ? ' · New' : ''}
          </Text>
          <Text style={styles.body}>{m.body}</Text>
          {!m.read && (
            <Pressable style={styles.readBtn} onPress={() => markRead(m.id)}>
              <Text style={styles.readBtnText}>Mark as read</Text>
            </Pressable>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  heading: { fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 12 },
  empty: { color: colors.muted },
  error: { color: colors.danger, marginBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  title: { fontWeight: '600', color: colors.primary, fontSize: 16 },
  meta: { color: colors.muted, fontSize: 12, marginVertical: 4 },
  body: { color: colors.text, marginTop: 6, lineHeight: 20 },
  readBtn: { marginTop: 10, backgroundColor: colors.primary, borderRadius: 8, padding: 10, alignItems: 'center' },
  readBtnText: { color: '#fff', fontWeight: '600' },
});
