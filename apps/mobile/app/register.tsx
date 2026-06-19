import { useState } from 'react';
import { ScrollView, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { registerFarm, setAuth } from '../src/api';
import { colors } from '../src/theme';

export default function RegisterScreen() {
  const [form, setForm] = useState({
    email: '', password: '', farmerName: '', farmName: '', location: '', city: '', state: '', country: 'Nigeria',
    pondName: '', pondNumber: '1', lengthM: '2', widthM: '3', depthM: '1.3',
    quantityStocked: '2500', averageWeightAtStockingG: '8', fingerlingPrice: '30',
    stockingDate: new Date().toISOString().slice(0, 10),
    desiredCrudeProteinPct: '38', desiredFeedQuantityKg: '1500',
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true);
    try {
      const body = {
        ...form,
        pondNumber: Number(form.pondNumber),
        lengthM: Number(form.lengthM), widthM: Number(form.widthM), depthM: Number(form.depthM),
        quantityStocked: Number(form.quantityStocked),
        averageWeightAtStockingG: Number(form.averageWeightAtStockingG),
        fingerlingPrice: Number(form.fingerlingPrice),
        desiredCrudeProteinPct: Number(form.desiredCrudeProteinPct),
        desiredFeedQuantityKg: Number(form.desiredFeedQuantityKg),
      };
      const { cycleId, token } = await registerFarm(body);
      await setAuth(token, cycleId, { role: 'member' });
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Registration failed', String(e).replace('Error: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, field, kb }: { label: string; field: keyof typeof form; kb?: 'numeric' }) => (
    <TextInput
      style={styles.input}
      placeholder={label}
      value={String(form[field])}
      onChangeText={(v) => set(field, v)}
      keyboardType={kb === 'numeric' ? 'numeric' : 'default'}
    />
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.heading}>Farm & pond setup</Text>
      <Field label="Email" field="email" />
      <Field label="Password" field="password" />
      <Field label="Your name" field="farmerName" />
      <Field label="Farm name" field="farmName" />
      <Field label="Pond name" field="pondName" />
      <Field label="Qty stocked" field="quantityStocked" kb="numeric" />
      <Field label="Length (m)" field="lengthM" kb="numeric" />
      <Field label="Width (m)" field="widthM" kb="numeric" />
      <Field label="Depth (m)" field="depthM" kb="numeric" />
      <Pressable style={styles.btn} onPress={submit} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Saving…' : 'Register'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heading: { fontSize: 18, fontWeight: '600', color: colors.primary, marginBottom: 12 },
  input: { backgroundColor: colors.card, borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#ddd' },
  btn: { backgroundColor: colors.primary, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8, marginBottom: 32 },
  btnText: { color: '#fff', fontWeight: '600' },
});
