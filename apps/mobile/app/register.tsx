import { useState } from 'react';
import {
  ScrollView, Text, TextInput, Pressable, StyleSheet, View, Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  AGE_RANGE_OPTIONS,
  CULTURE_SYSTEM_OPTIONS,
  FEED_TYPE_OPTIONS,
  FISH_SPECIES_OPTIONS,
  GENDER_OPTIONS,
  POND_TYPE_OPTIONS,
  WATER_SOURCE_OPTIONS,
} from '@fishmaster/shared-types';
import { registerFarm, setAuth } from '../src/api';
import { colors } from '../src/theme';

type Step = 1 | 2 | 3;

const initial = {
  email: '', password: '', farmerName: '', surname: '', gender: '', ageRange: '', phone: '',
  postcode: '', lga: '', state: '', country: '',
  farmName: '', farmPhone: '', location: '', farmPostcode: '', farmLga: '', farmSizeSqM: '',
  totalPonds: '1', latitude: '', longitude: '', city: '',
  pondName: '', pondNumber: '1', pondType: '', lengthM: '2', widthM: '3', depthM: '1.3',
  cultureSystem: 'semi_intensive', fishSpecies: 'Catfish',
  quantityStocked: '2500', averageWeightAtStockingG: '8', fingerlingPrice: '30',
  stockingDate: new Date().toISOString().slice(0, 10), proposedSalesDate: '',
  feedName: '', feedType: '', feedMaker: '', feedBags: '', desiredCrudeProteinPct: '38',
  desiredFeedQuantityKg: '1500',
  waterSource: '', initialPh: '', initialDissolvedOxygenMgL: '',
};

export default function RegisterScreen() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true);
    try {
      const body = {
        ...form,
        pondNumber: Number(form.pondNumber),
        lengthM: Number(form.lengthM), widthM: Number(form.widthM), depthM: Number(form.depthM),
        farmSizeSqM: form.farmSizeSqM ? Number(form.farmSizeSqM) : undefined,
        totalPonds: form.totalPonds ? Number(form.totalPonds) : undefined,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        quantityStocked: Number(form.quantityStocked),
        averageWeightAtStockingG: Number(form.averageWeightAtStockingG),
        fingerlingPrice: Number(form.fingerlingPrice),
        feedBags: form.feedBags ? Number(form.feedBags) : undefined,
        desiredCrudeProteinPct: Number(form.desiredCrudeProteinPct),
        desiredFeedQuantityKg: Number(form.desiredFeedQuantityKg),
        initialPh: form.initialPh ? Number(form.initialPh) : undefined,
        initialDissolvedOxygenMgL: form.initialDissolvedOxygenMgL ? Number(form.initialDissolvedOxygenMgL) : undefined,
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.heading}>Register — step {step} of 3</Text>
      <Text style={styles.sub}>Open to farmers worldwide. Tap options to select.</Text>

      {step === 1 && (
        <View>
          <Field label="Email" value={form.email} onChange={(v) => set('email', v)} />
          <Field label="Password" value={form.password} onChange={(v) => set('password', v)} secure />
          <Field label="First name" value={form.farmerName} onChange={(v) => set('farmerName', v)} />
          <Field label="Surname" value={form.surname} onChange={(v) => set('surname', v)} />
          <ChipSelect label="Gender" value={form.gender} options={[...GENDER_OPTIONS]} onSelect={(v) => set('gender', v)} />
          <ChipSelect label="Age range" value={form.ageRange} options={[...AGE_RANGE_OPTIONS]} onSelect={(v) => set('ageRange', v)} />
          <Field label="Phone" value={form.phone} onChange={(v) => set('phone', v)} />
          <Field label="Postcode" value={form.postcode} onChange={(v) => set('postcode', v)} />
          <Field label="LGA / borough" value={form.lga} onChange={(v) => set('lga', v)} />
          <Field label="State / region" value={form.state} onChange={(v) => set('state', v)} />
          <Field label="Country" value={form.country} onChange={(v) => set('country', v)} />
        </View>
      )}

      {step === 2 && (
        <View>
          <Field label="Farm name" value={form.farmName} onChange={(v) => set('farmName', v)} />
          <Field label="Farm phone" value={form.farmPhone} onChange={(v) => set('farmPhone', v)} />
          <Field label="Farm address" value={form.location} onChange={(v) => set('location', v)} />
          <Field label="City" value={form.city} onChange={(v) => set('city', v)} />
          <Field label="Farm size (m²)" value={form.farmSizeSqM} onChange={(v) => set('farmSizeSqM', v)} numeric />
          <Field label="Total ponds on farm" value={form.totalPonds} onChange={(v) => set('totalPonds', v)} numeric />
          <Field label="Latitude (optional)" value={form.latitude} onChange={(v) => set('latitude', v)} numeric />
          <Field label="Longitude (optional)" value={form.longitude} onChange={(v) => set('longitude', v)} numeric />
          <Field label="Pond name" value={form.pondName} onChange={(v) => set('pondName', v)} />
          <Field label="Pond number" value={form.pondNumber} onChange={(v) => set('pondNumber', v)} numeric />
          <ChipSelect label="Pond type" value={form.pondType} options={[...POND_TYPE_OPTIONS]} onSelect={(v) => set('pondType', v)} />
          <Field label="Length (m)" value={form.lengthM} onChange={(v) => set('lengthM', v)} numeric />
          <Field label="Width (m)" value={form.widthM} onChange={(v) => set('widthM', v)} numeric />
          <Field label="Depth (m)" value={form.depthM} onChange={(v) => set('depthM', v)} numeric />
          <ChipSelect
            label="Culture system"
            value={form.cultureSystem}
            options={CULTURE_SYSTEM_OPTIONS.map((o) => o.value)}
            labels={CULTURE_SYSTEM_OPTIONS.map((o) => o.label)}
            onSelect={(v) => set('cultureSystem', v)}
          />
        </View>
      )}

      {step === 3 && (
        <View>
          <ChipSelect label="Fish species" value={form.fishSpecies} options={[...FISH_SPECIES_OPTIONS]} onSelect={(v) => set('fishSpecies', v)} />
          <Field label="Qty stocked" value={form.quantityStocked} onChange={(v) => set('quantityStocked', v)} numeric />
          <Field label="Avg weight @ stocking (g)" value={form.averageWeightAtStockingG} onChange={(v) => set('averageWeightAtStockingG', v)} numeric />
          <Field label="Stocking date (YYYY-MM-DD)" value={form.stockingDate} onChange={(v) => set('stockingDate', v)} />
          <Field label="Proposed sales date" value={form.proposedSalesDate} onChange={(v) => set('proposedSalesDate', v)} />
          <Field label="Feed name" value={form.feedName} onChange={(v) => set('feedName', v)} />
          <ChipSelect label="Feed type" value={form.feedType} options={[...FEED_TYPE_OPTIONS]} onSelect={(v) => set('feedType', v)} />
          <Field label="Feed maker" value={form.feedMaker} onChange={(v) => set('feedMaker', v)} />
          <Field label="Feed bags" value={form.feedBags} onChange={(v) => set('feedBags', v)} numeric />
          <Field label="Crude protein (%)" value={form.desiredCrudeProteinPct} onChange={(v) => set('desiredCrudeProteinPct', v)} numeric />
          <ChipSelect label="Water source" value={form.waterSource} options={[...WATER_SOURCE_OPTIONS]} onSelect={(v) => set('waterSource', v)} />
          <Field label="Initial pH (optional)" value={form.initialPh} onChange={(v) => set('initialPh', v)} numeric />
          <Field label="Initial DO mg/L (optional)" value={form.initialDissolvedOxygenMgL} onChange={(v) => set('initialDissolvedOxygenMgL', v)} numeric />
        </View>
      )}

      <View style={styles.nav}>
        {step > 1 && (
          <Pressable style={styles.secondaryBtn} onPress={() => setStep((s) => (s - 1) as Step)}>
            <Text style={styles.secondaryText}>Back</Text>
          </Pressable>
        )}
        {step < 3 ? (
          <Pressable style={styles.btn} onPress={() => setStep((s) => (s + 1) as Step)}>
            <Text style={styles.btnText}>Next</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.btn} onPress={submit} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Saving…' : 'Register'}</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

function Field({ label, value, onChange, numeric, secure }: {
  label: string; value: string; onChange: (v: string) => void; numeric?: boolean; secure?: boolean;
}) {
  return (
    <TextInput
      style={styles.input}
      placeholder={label}
      value={value}
      onChangeText={onChange}
      keyboardType={numeric ? 'numeric' : 'default'}
      secureTextEntry={secure}
      autoCapitalize="none"
    />
  );
}

function ChipSelect({ label, value, options, labels, onSelect }: {
  label: string; value: string; options: string[]; labels?: string[]; onSelect: (v: string) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      <Text style={styles.chipLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((opt, i) => (
          <Pressable
            key={opt}
            style={[styles.chip, value === opt && styles.chipActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>
              {labels?.[i] ?? opt}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heading: { fontSize: 18, fontWeight: '600', color: colors.primary, marginBottom: 4 },
  sub: { color: colors.muted, marginBottom: 12, fontSize: 13 },
  input: { backgroundColor: colors.card, borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#ddd' },
  nav: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: colors.primary, borderRadius: 8, padding: 14, alignItems: 'center' },
  secondaryText: { color: colors.primary, fontWeight: '600' },
  chipWrap: { marginBottom: 12 },
  chipLabel: { fontSize: 13, color: colors.muted, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: '#ddd' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text },
  chipTextActive: { color: '#fff' },
});
