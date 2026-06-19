import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { apiFetch, clearAuth, API_URL } from '../../src/api';
import { colors } from '../../src/theme';

type Plan = { id: string; label: string; priceGbp: number };

export default function AccountScreen() {
  const [status, setStatus] = useState<{ tier: string; status: string } | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    apiFetch('/api/billing/status').then(setStatus).catch(() => {});
    fetch(`${API_URL}/api/billing/plans`)
      .then((r) => r.json()).then(setPlans);
  }, []);

  const subscribe = async (tier: string) => {
    try {
      const { url } = await apiFetch('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ tier }),
      });
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      Alert.alert('Subscribe', String(e).replace('Error: ', ''));
    }
  };

  const logout = async () => {
    await clearAuth();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      {status && (
        <View style={styles.card}>
          <Text style={styles.title}>Subscription</Text>
          <Text style={styles.line}>{status.tier} · {status.status}</Text>
        </View>
      )}
      <View style={styles.card}>
        <Text style={styles.title}>Plans</Text>
        {plans.map((p) => (
          <Pressable key={p.id} style={styles.planBtn} onPress={() => subscribe(p.id)}>
            <Text style={styles.planText}>{p.label} — £{p.priceGbp.toFixed(2)}/mo</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '600', color: colors.primary, marginBottom: 8 },
  line: { color: colors.text },
  planBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 12, marginTop: 8 },
  planText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  logout: { borderWidth: 1, borderColor: colors.danger, borderRadius: 8, padding: 14, alignItems: 'center' },
  logoutText: { color: colors.danger, fontWeight: '600' },
});
