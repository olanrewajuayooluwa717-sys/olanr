import { useCallback, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet, Alert, Switch } from 'react-native';
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
  const [powerDate, setPowerDate] = useState('');
  const [electricityKwh, setElectricityKwh] = useState('');
  const [dieselLiters, setDieselLiters] = useState('');
  const [petrolLiters, setPetrolLiters] = useState('');
  const [solarKwh, setSolarKwh] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [saleQty, setSaleQty] = useState('');
  const [saleWeight, setSaleWeight] = useState('');
  const [saleRevenue, setSaleRevenue] = useState('');
  const [saleCustomer, setSaleCustomer] = useState('');
  const [weightDate, setWeightDate] = useState('');
  const [weightG, setWeightG] = useState('');
  const [opsDate, setOpsDate] = useState('');
  const [ops, setOps] = useState({
    medication: false,
    grading: false,
    netWash: false,
    pondCleaning: false,
    aerationCheck: false,
    waterExchange: false,
    sampling: false,
    notes: '',
  });

  useFocusEffect(useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setMortDate(today);
    setFeedDate(today);
    setWaterDate(today);
    setPowerDate(today);
    setSaleDate(today);
    setWeightDate(today);
    setOpsDate(today);
    getCycleId().then(async (id) => {
      setCycleId(id);
      if (id) {
        try {
          const logs = await apiFetch(`/api/cycles/${id}/water`);
          setRecentWater(logs);
        } catch { /* ignore */ }
        try {
          const opsLogs = await apiFetch(`/api/cycles/${id}/operations`);
          const todayLog = opsLogs.find((l: { date: string }) => l.date.slice(0, 10) === today);
          if (todayLog) {
            setOps({
              medication: todayLog.medication,
              grading: todayLog.grading,
              netWash: todayLog.netWash,
              pondCleaning: todayLog.pondCleaning,
              aerationCheck: todayLog.aerationCheck,
              waterExchange: todayLog.waterExchange,
              sampling: todayLog.sampling,
              notes: todayLog.notes ?? '',
            });
          }
        } catch { /* ignore */ }
      }
    });
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

  const logPower = async () => {
    if (!cycleId) return Alert.alert('No pond', 'Log out and log in again');
    try {
      const body: Record<string, unknown> = { date: powerDate };
      if (electricityKwh) body.electricityKwh = Number(electricityKwh);
      if (dieselLiters) body.dieselLiters = Number(dieselLiters);
      if (petrolLiters) body.petrolLiters = Number(petrolLiters);
      if (solarKwh) body.solarKwh = Number(solarKwh);
      await apiFetch(`/api/cycles/${cycleId}/power`, { method: 'POST', body: JSON.stringify(body) });
      Alert.alert('Saved', 'Power consumption recorded');
      setElectricityKwh('');
      setDieselLiters('');
      setPetrolLiters('');
      setSolarKwh('');
    } catch (e) { Alert.alert('Error', String(e)); }
  };

  const logSale = async () => {
    if (!cycleId) return Alert.alert('No pond', 'Log out and log in again');
    try {
      await apiFetch(`/api/cycles/${cycleId}/sales`, {
        method: 'POST',
        body: JSON.stringify({
          date: saleDate,
          quantitySold: Number(saleQty),
          avgWeightG: saleWeight ? Number(saleWeight) : undefined,
          totalRevenue: saleRevenue ? Number(saleRevenue) : undefined,
          customerName: saleCustomer || undefined,
        }),
      });
      Alert.alert('Saved', 'Fish sale recorded');
      setSaleQty('');
      setSaleWeight('');
      setSaleRevenue('');
      setSaleCustomer('');
    } catch (e) { Alert.alert('Error', String(e)); }
  };

  const logOps = async () => {
    if (!cycleId) return Alert.alert('No pond', 'Log out and log in again');
    try {
      await apiFetch(`/api/cycles/${cycleId}/operations`, {
        method: 'POST',
        body: JSON.stringify({
          date: opsDate,
          ...ops,
          notes: ops.notes || undefined,
        }),
      });
      Alert.alert('Saved', 'Daily operations recorded');
    } catch (e) { Alert.alert('Error', String(e)); }
  };

  const logWeight = async () => {
    if (!cycleId) return Alert.alert('No pond', 'Log out and log in again');
    try {
      await apiFetch(`/api/cycles/${cycleId}/weight`, {
        method: 'POST',
        body: JSON.stringify({ date: weightDate, averageWeightG: Number(weightG) }),
      });
      Alert.alert('Saved', 'Weight sample recorded — check Home for expected vs actual');
      setWeightG('');
    } catch (e) { Alert.alert('Error', String(e)); }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Daily operations</Text>
        <Text style={styles.hint}>Tick tasks completed today</Text>
        <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={opsDate} onChangeText={setOpsDate} />
        {([
          ['medication', 'Medication'],
          ['grading', 'Grading'],
          ['netWash', 'Net washing'],
          ['pondCleaning', 'Pond cleaning'],
          ['aerationCheck', 'Aeration check'],
          ['waterExchange', 'Water exchange'],
          ['sampling', 'Sampling'],
        ] as const).map(([key, label]) => (
          <View key={key} style={styles.switchRow}>
            <Text style={styles.switchLabel}>{label}</Text>
            <Switch
              value={ops[key]}
              onValueChange={(v) => setOps((o) => ({ ...o, [key]: v }))}
            />
          </View>
        ))}
        <TextInput style={styles.input} placeholder="Notes (optional)" value={ops.notes} onChangeText={(t) => setOps((o) => ({ ...o, notes: t }))} />
        <Pressable style={styles.btn} onPress={logOps}><Text style={styles.btnText}>Save operations</Text></Pressable>
      </View>

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

      <View style={styles.card}>
        <Text style={styles.title}>Daily power</Text>
        <Text style={styles.hint}>Electricity (kWh), diesel/petrol (litres), or solar (kWh)</Text>
        <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={powerDate} onChangeText={setPowerDate} />
        <TextInput style={styles.input} placeholder="Electricity kWh" keyboardType="decimal-pad" value={electricityKwh} onChangeText={setElectricityKwh} />
        <TextInput style={styles.input} placeholder="Diesel litres" keyboardType="decimal-pad" value={dieselLiters} onChangeText={setDieselLiters} />
        <TextInput style={styles.input} placeholder="Petrol litres" keyboardType="decimal-pad" value={petrolLiters} onChangeText={setPetrolLiters} />
        <TextInput style={styles.input} placeholder="Solar kWh" keyboardType="decimal-pad" value={solarKwh} onChangeText={setSolarKwh} />
        <Pressable style={styles.btn} onPress={logPower}><Text style={styles.btnText}>Save power log</Text></Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Fish sales</Text>
        <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={saleDate} onChangeText={setSaleDate} />
        <TextInput style={styles.input} placeholder="Quantity sold" keyboardType="numeric" value={saleQty} onChangeText={setSaleQty} />
        <TextInput style={styles.input} placeholder="Avg weight (g)" keyboardType="decimal-pad" value={saleWeight} onChangeText={setSaleWeight} />
        <TextInput style={styles.input} placeholder="Total revenue" keyboardType="decimal-pad" value={saleRevenue} onChangeText={setSaleRevenue} />
        <TextInput style={styles.input} placeholder="Customer name" value={saleCustomer} onChangeText={setSaleCustomer} />
        <Pressable style={styles.btn} onPress={logSale}><Text style={styles.btnText}>Save sale</Text></Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Actual fish weight sample</Text>
        <Text style={styles.hint}>Compare with expected weight on Home tab</Text>
        <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={weightDate} onChangeText={setWeightDate} />
        <TextInput style={styles.input} placeholder="Average weight (g)" keyboardType="decimal-pad" value={weightG} onChangeText={setWeightG} />
        <Pressable style={styles.btn} onPress={logWeight}><Text style={styles.btnText}>Save weight sample</Text></Pressable>
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
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  switchLabel: { fontSize: 14, color: colors.text },
});
