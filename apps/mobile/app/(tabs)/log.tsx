import { useCallback, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { apiFetch, getCycleId } from '../../src/api';
import { colors } from '../../src/theme';

type WaterLog = {
  id: string;
  date: string;
  ph: number | null;
  dissolvedOxygenMgL: number | null;
  temperatureC: number | null;
  ammoniaMgL: number | null;
};

export default function LogScreen() {
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [mortDate, setMortDate] = useState('');
  const [mortCount, setMortCount] = useState('');
  const [feedDate, setFeedDate] = useState('');
  const [feedKg, setFeedKg] = useState('');
  const [waterDate, setWaterDate] = useState('');
  const [ph, setPh] = useState('');
  const [doMg, setDoMg] = useState('');
  const [tempC, setTempC] = useState('');
  const [ammonia, setAmmonia] = useState('');
  const [recentWater, setRecentWater] = useState<WaterLog[]>([]);

  useFocusEffect(useCallback(() => {
    getCycleId().then(async (id) => {
      setCycleId(id);
      if (id) {
        try {
          const logs = await apiFetch(`/api/cycles/${id}/water`);
          setRecentWater(logs);
        } catch { /* ignore */ }
      }
    });
    const today = new Date().toISOString().slice(0, 10);
    setMortDate(today);
    setFeedDate(today);
    setWaterDate(today);
  }, []));

  const logMortality = async () => {
    if (!cycleId) return Alert.alert('No pond', 'Log out and log in again');
    try {
      await apiFetch(`/api/cycles/${cycleId}/mortality`, {
        method: 'POST',
        body: JSON.stringify({ date: mortDate, count: Number(mortCount) }),
      });
      Alert.alert('Saved', 'Mortality recorded');
      setMortCount('');
    } catch (e) { Alert.alert('Error', String(e)); }
  };

  const logFeed = async () => {
    if (!cycleId) return Alert.alert('No pond', 'Log out and log in again');
    try {
      const data = await apiFetch(`/api/cycles/${cycleId}/feed`, {
        method: 'POST',
        body: JSON.stringify({ date: feedDate, actualKg: Number(feedKg) }),
      });
      const a = data.alert;
      Alert.alert('Saved', a ? `${a.type}: expected ${a.expectedKg?.toFixed(1)} kg, got ${a.actualKg} kg` : 'Feed logged');
      setFeedKg('');
    } catch (e) { Alert.alert('Error', String(e)); }
  };

  const logWater = async () => {
    if (!cycleId) return Alert.alert('No pond', 'Log out and log in again');
    try {
      const body: Record<string, unknown> = { date: waterDate };
      if (ph) body.ph = Number(ph);
      if (doMg) body.dissolvedOxygenMgL = Number(doMg);
      if (tempC) body.temperatureC = Number(tempC);
      if (ammonia) body.ammoniaMgL = Number(ammonia);

      const data = await apiFetch(`/api/cycles/${cycleId}/water`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setRecentWater((prev) => [data.log, ...prev.filter((l: WaterLog) => l.id !== data.log.id)]);

      const alerts = data.alerts as { message: string; severity: string }[];
      if (alerts?.length) {
        Alert.alert('Saved with alerts', alerts.map((a) => a.message).join('\n'));
      } else {
        Alert.alert('Saved', 'Water parameters look good');
      }
    } catch (e) { Alert.alert('Error', String(e)); }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Water quality</Text>
        <Text style={styles.hint}>Targets: pH 6.5–8.5 · DO ≥5 mg/L · temp 25–30°C · ammonia under 0.5</Text>
        <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={waterDate} onChangeText={setWaterDate} />
        <TextInput style={styles.input} placeholder="pH" keyboardType="decimal-pad" value={ph} onChangeText={setPh} />
        <TextInput style={styles.input} placeholder="Dissolved O₂ (mg/L)" keyboardType="decimal-pad" value={doMg} onChangeText={setDoMg} />
        <TextInput style={styles.input} placeholder="Temperature (°C)" keyboardType="decimal-pad" value={tempC} onChangeText={setTempC} />
        <TextInput style={styles.input} placeholder="Ammonia (mg/L)" keyboardType="decimal-pad" value={ammonia} onChangeText={setAmmonia} />
        <Pressable style={styles.btn} onPress={logWater}><Text style={styles.btnText}>Save & check water</Text></Pressable>
        {recentWater.slice(0, 3).map((w) => (
          <Text key={w.id} style={styles.recent}>
            {new Date(w.date).toLocaleDateString()}: pH {w.ph ?? '—'} · DO {w.dissolvedOxygenMgL ?? '—'} · {w.temperatureC ?? '—'}°C
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Daily mortality</Text>
        <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={mortDate} onChangeText={setMortDate} />
        <TextInput style={styles.input} placeholder="Count" keyboardType="numeric" value={mortCount} onChangeText={setMortCount} />
        <Pressable style={styles.btn} onPress={logMortality}><Text style={styles.btnText}>Save mortality</Text></Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Actual feed (kg)</Text>
        <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={feedDate} onChangeText={setFeedDate} />
        <TextInput style={styles.input} placeholder="kg" keyboardType="decimal-pad" value={feedKg} onChangeText={setFeedKg} />
        <Pressable style={styles.btn} onPress={logFeed}><Text style={styles.btnText}>Save & check feeding</Text></Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '600', color: colors.primary, marginBottom: 8 },
  hint: { fontSize: 12, color: colors.muted, marginBottom: 10 },
  recent: { fontSize: 13, color: colors.text, marginTop: 8, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10, backgroundColor: '#fafafa' },
  btn: { backgroundColor: colors.primary, borderRadius: 8, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});
