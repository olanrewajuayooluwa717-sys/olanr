import { useCallback, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { apiFetch, getCycleId } from '../../src/api';
import { colors } from '../../src/theme';

export default function LogScreen() {
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [mortDate, setMortDate] = useState('');
  const [mortCount, setMortCount] = useState('');
  const [feedDate, setFeedDate] = useState('');
  const [feedKg, setFeedKg] = useState('');

  useFocusEffect(useCallback(() => {
    getCycleId().then(setCycleId);
    const today = new Date().toISOString().slice(0, 10);
    setMortDate(today);
    setFeedDate(today);
  }, []));

  const logMortality = async () => {
    if (!cycleId) return Alert.alert('No pond', 'Register a farm first');
    try {
      await apiFetch(`/api/cycles/${cycleId}/mortality`, {
        method: 'POST',
        body: JSON.stringify({ date: mortDate, count: Number(mortCount) }),
      });
      Alert.alert('Saved', 'Mortality recorded');
      setMortDate(''); setMortCount('');
    } catch (e) { Alert.alert('Error', String(e)); }
  };

  const logFeed = async () => {
    if (!cycleId) return Alert.alert('No pond', 'Register a farm first');
    try {
      const data = await apiFetch(`/api/cycles/${cycleId}/feed`, {
        method: 'POST',
        body: JSON.stringify({ date: feedDate, actualKg: Number(feedKg) }),
      });
      const a = data.alert;
      Alert.alert('Saved', a ? `${a.type}: expected ${a.expectedKg?.toFixed(1)} kg, got ${a.actualKg} kg` : 'Feed logged');
      setFeedDate(''); setFeedKg('');
    } catch (e) { Alert.alert('Error', String(e)); }
  };

  return (
    <ScrollView style={styles.container}>
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
  title: { fontSize: 16, fontWeight: '600', color: colors.primary, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10, backgroundColor: '#fafafa' },
  btn: { backgroundColor: colors.primary, borderRadius: 8, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});
