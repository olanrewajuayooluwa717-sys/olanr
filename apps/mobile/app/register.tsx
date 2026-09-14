import { useMemo, useState } from 'react';
import {
  ScrollView, Text, TextInput, Pressable, StyleSheet, View, Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  AGE_RANGE_OPTIONS,
  COUNTRY_OPTIONS,
  CULTURE_SYSTEM_OPTIONS,
  CURRENCY_OPTIONS,
  CUSTOM_OPTION_VALUE,
  ESTIMATED_FISH_OUTPUT_OPTIONS,
  FARM_SIZE_ACRES_OPTIONS,
  FEED_TYPE_OPTIONS,
  FISH_SPECIES_OPTIONS,
  GENDER_OPTIONS,
  MEMBER_CATEGORIES,
  PASSWORD_RULE_HINT,
  POND_TYPE_OPTIONS,
  REGISTRATION_RANGES,
  WATER_SOURCE_OPTIONS,
  currencySymbol,
  validatePassword,
} from '@fishmaster/shared-types';
import { registerFarm, setAuth } from '../src/api';
import { colors } from '../src/theme';

type Step = 1 | 2 | 3;

type PondForm = {
  pondName: string;
  pondNumber: string;
  pondType: string;
  lengthM: string;
  widthM: string;
  depthM: string;
  cultureSystem: string;
  fishSpecies: string[];
  fishCustom: string;
  quantityStocked: string;
  averageWeightAtStockingG: string;
  fingerlingPrice: string;
  stockingDate: string;
  proposedSalesDate: string;
};

const emptyPond = (n: number): PondForm => ({
  pondName: `Pond ${n}`,
  pondNumber: String(n),
  pondType: '',
  lengthM: '2',
  widthM: '3',
  depthM: '1.3',
  cultureSystem: 'semi_intensive',
  fishSpecies: ['African sharptooth catfish'],
  fishCustom: '',
  quantityStocked: '2500',
  averageWeightAtStockingG: '8',
  fingerlingPrice: '30',
  stockingDate: new Date().toISOString().slice(0, 10),
  proposedSalesDate: '',
});

export default function RegisterScreen() {
  const [step, setStep] = useState<Step>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [surname, setSurname] = useState('');
  const [gender, setGender] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('234');
  const [phone, setPhone] = useState('');
  const [postcode, setPostcode] = useState('');
  const [lga, setLga] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('Nigeria');
  const [estimatedFishOutputYear, setEstimated] = useState('');
  const [estimatedCustom, setEstimatedCustom] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [farmName, setFarmName] = useState('');
  const [farmPhone, setFarmPhone] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [farmSizeAcres, setFarmSizeAcres] = useState('');
  const [farmSizeCustom, setFarmSizeCustom] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [ponds, setPonds] = useState<PondForm[]>([emptyPond(1)]);
  const [feedName, setFeedName] = useState('');
  const [feedType, setFeedType] = useState('');
  const [feedMaker, setFeedMaker] = useState('');
  const [feedBags, setFeedBags] = useState('');
  const [desiredCrudeProteinPct, setProtein] = useState('38');
  const [desiredFeedQuantityKg, setFeedQty] = useState('1500');
  const [waterSource, setWaterSource] = useState('');
  const [initialPh, setInitialPh] = useState('');
  const [initialDo, setInitialDo] = useState('');
  const [loading, setLoading] = useState(false);

  const curSym = currencySymbol(currency);
  const dialCodes = useMemo(() => {
    const seen = new Set<string>();
    return COUNTRY_OPTIONS.filter((c) => {
      if (seen.has(c.dialCode)) return false;
      seen.add(c.dialCode);
      return true;
    }).map((c) => ({ dial: c.dialCode, label: `+${c.dialCode} ${c.name}` }));
  }, []);

  const toggleCategory = (value: string) => {
    setCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );
  };

  const updatePond = (index: number, patch: Partial<PondForm>) => {
    setPonds((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const toggleFish = (index: number, species: string) => {
    setPonds((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        const on = p.fishSpecies.includes(species);
        return {
          ...p,
          fishSpecies: on
            ? p.fishSpecies.filter((s) => s !== species)
            : [...p.fishSpecies, species].sort((a, b) => a.localeCompare(b)),
        };
      }),
    );
  };

  const resolve = (value: string, custom: string) =>
    value === CUSTOM_OPTION_VALUE ? custom.trim() : value;

  const submit = async () => {
    if (categories.length === 0) {
      Alert.alert('Categories required', 'Select at least one category that describes what you do.');
      return;
    }
    const pwdErr = validatePassword(password);
    if (pwdErr) {
      Alert.alert('Password', pwdErr);
      return;
    }
    for (const p of ponds) {
      if (p.proposedSalesDate && !(p.proposedSalesDate > p.stockingDate)) {
        Alert.alert('Dates', `Pond ${p.pondNumber}: sales date must be after stocking date.`);
        return;
      }
    }
    setLoading(true);
    try {
      const body = {
        email,
        password,
        farmerName,
        surname,
        gender,
        ageRange,
        phone,
        phoneCountryCode,
        postcode,
        lga,
        state,
        country,
        estimatedFishOutputYear: resolve(estimatedFishOutputYear, estimatedCustom),
        categories,
        farmName,
        farmPhone,
        location,
        city,
        farmSizeAcres: resolve(farmSizeAcres, farmSizeCustom),
        totalPonds: ponds.length,
        currency,
        feedName,
        feedType,
        feedMaker,
        feedBags: feedBags ? Number(feedBags) : undefined,
        desiredCrudeProteinPct: Number(desiredCrudeProteinPct),
        desiredFeedQuantityKg: Number(desiredFeedQuantityKg),
        waterSource,
        initialPh: initialPh ? Number(initialPh) : undefined,
        initialDissolvedOxygenMgL: initialDo ? Number(initialDo) : undefined,
        ponds: ponds.map((p) => {
          const species = [...p.fishSpecies];
          if (p.fishCustom.trim()) species.push(p.fishCustom.trim());
          return {
            pondName: p.pondName,
            pondNumber: Number(p.pondNumber),
            pondType: p.pondType,
            lengthM: Number(p.lengthM),
            widthM: Number(p.widthM),
            depthM: Number(p.depthM),
            cultureSystem: p.cultureSystem,
            fishSpecies: species,
            quantityStocked: Number(p.quantityStocked),
            averageWeightAtStockingG: Number(p.averageWeightAtStockingG),
            fingerlingPrice: Number(p.fingerlingPrice),
            stockingDate: p.stockingDate,
            proposedSalesDate: p.proposedSalesDate || undefined,
          };
        }),
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
      <Text style={styles.sub}>Tell us who you are and what you do (you can pick more than one).</Text>

      {step === 1 && (
        <View>
          <Field label="Email" value={email} onChange={setEmail} />
          <Field label="Password" value={password} onChange={setPassword} secure={!showPassword} />
          <Pressable onPress={() => setShowPassword((s) => !s)} style={{ marginBottom: 8 }}>
            <Text style={{ color: colors.primary }}>{showPassword ? 'Hide password' : 'Show password'}</Text>
          </Pressable>
          <Text style={styles.hint}>{PASSWORD_RULE_HINT}</Text>
          <Field label="First name" value={farmerName} onChange={setFarmerName} />
          <Field label="Surname" value={surname} onChange={setSurname} />
          <ChipSelect label="Gender" value={gender} options={[...GENDER_OPTIONS]} onSelect={setGender} />
          <ChipSelect label="Age range" value={ageRange} options={[...AGE_RANGE_OPTIONS]} onSelect={setAgeRange} />
          <ChipSelect
            label="Phone country code"
            value={phoneCountryCode}
            options={dialCodes.map((d) => d.dial)}
            labels={dialCodes.map((d) => d.label)}
            onSelect={setPhoneCountryCode}
          />
          <Field label="Phone (national number)" value={phone} onChange={setPhone} />
          <Field label="Postcode" value={postcode} onChange={setPostcode} />
          <Field label="LGA / borough" value={lga} onChange={setLga} />
          <Field label="State / region" value={state} onChange={setState} />
          <ChipSelect
            label="Country"
            value={country}
            options={COUNTRY_OPTIONS.map((c) => c.name)}
            onSelect={(v) => {
              setCountry(v);
              const match = COUNTRY_OPTIONS.find((c) => c.name === v);
              if (match) setPhoneCountryCode(match.dialCode);
            }}
          />
          <ChipSelect
            label="Est. fish output / year"
            value={estimatedFishOutputYear}
            options={[...ESTIMATED_FISH_OUTPUT_OPTIONS, CUSTOM_OPTION_VALUE]}
            labels={[...ESTIMATED_FISH_OUTPUT_OPTIONS, 'Other (fill yourself)']}
            onSelect={setEstimated}
          />
          {estimatedFishOutputYear === CUSTOM_OPTION_VALUE && (
            <Field label="Custom output" value={estimatedCustom} onChange={setEstimatedCustom} />
          )}

          <Text style={styles.chipLabel}>What do you do? (select all that apply)</Text>
          <View style={styles.chipRow}>
            {MEMBER_CATEGORIES.map((c) => {
              const on = categories.includes(c.value);
              return (
                <Pressable key={c.value} onPress={() => toggleCategory(c.value)} style={[styles.chip, on && styles.chipActive]}>
                  <Text style={[styles.chipText, on && styles.chipTextActive]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {step === 2 && (
        <View>
          <Field label="Farm name" value={farmName} onChange={setFarmName} />
          <Field label="Farm phone" value={farmPhone} onChange={setFarmPhone} />
          <Field label="Farm address" value={location} onChange={setLocation} />
          <Field label="City" value={city} onChange={setCity} />
          <ChipSelect
            label="Farm size (acres)"
            value={farmSizeAcres}
            options={[...FARM_SIZE_ACRES_OPTIONS, CUSTOM_OPTION_VALUE]}
            labels={[...FARM_SIZE_ACRES_OPTIONS, 'Other (fill yourself)']}
            onSelect={setFarmSizeAcres}
          />
          {farmSizeAcres === CUSTOM_OPTION_VALUE && (
            <Field label="Custom farm size" value={farmSizeCustom} onChange={setFarmSizeCustom} />
          )}
          <ChipSelect
            label="Currency"
            value={currency}
            options={CURRENCY_OPTIONS.map((c) => c.code)}
            labels={CURRENCY_OPTIONS.map((c) => c.label)}
            onSelect={setCurrency}
          />

          {ponds.map((pond, index) => (
            <View key={index} style={styles.pondBlock}>
              <Text style={styles.pondTitle}>Pond {pond.pondNumber}</Text>
              <Field label="Pond name" value={pond.pondName} onChange={(v) => updatePond(index, { pondName: v })} />
              <Field label="Pond number" value={pond.pondNumber} onChange={(v) => updatePond(index, { pondNumber: v })} numeric />
              <ChipSelect
                label="Pond type"
                value={pond.pondType}
                options={[...POND_TYPE_OPTIONS]}
                onSelect={(v) => updatePond(index, { pondType: v })}
              />
              <Field label="Length (m)" value={pond.lengthM} onChange={(v) => updatePond(index, { lengthM: v })} numeric />
              <Field label="Width (m)" value={pond.widthM} onChange={(v) => updatePond(index, { widthM: v })} numeric />
              <Field label="Depth (m)" value={pond.depthM} onChange={(v) => updatePond(index, { depthM: v })} numeric />
              <ChipSelect
                label="Culture system"
                value={pond.cultureSystem}
                options={CULTURE_SYSTEM_OPTIONS.map((o) => o.value)}
                labels={CULTURE_SYSTEM_OPTIONS.map((o) => o.label)}
                onSelect={(v) => updatePond(index, { cultureSystem: v })}
              />
              <Text style={styles.chipLabel}>Fish types (multi-select)</Text>
              <View style={styles.chipRow}>
                {FISH_SPECIES_OPTIONS.map((sp) => {
                  const on = pond.fishSpecies.includes(sp);
                  return (
                    <Pressable key={sp} onPress={() => toggleFish(index, sp)} style={[styles.chip, on && styles.chipActive]}>
                      <Text style={[styles.chipText, on && styles.chipTextActive]}>{sp}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Field label="Other fish type" value={pond.fishCustom} onChange={(v) => updatePond(index, { fishCustom: v })} />
              <Field label="Qty stocked" value={pond.quantityStocked} onChange={(v) => updatePond(index, { quantityStocked: v })} numeric />
              <Field label={`Fingerling price (${curSym})`} value={pond.fingerlingPrice} onChange={(v) => updatePond(index, { fingerlingPrice: v })} numeric />
              <Field label="Stocking date (YYYY-MM-DD)" value={pond.stockingDate} onChange={(v) => updatePond(index, { stockingDate: v })} />
              <Field label="Proposed sales date" value={pond.proposedSalesDate} onChange={(v) => updatePond(index, { proposedSalesDate: v })} />
              {ponds.length > 1 && (
                <Pressable onPress={() => setPonds((prev) => prev.filter((_, i) => i !== index))} style={styles.removeBtn}>
                  <Text style={{ color: '#b91c1c' }}>Remove pond</Text>
                </Pressable>
              )}
            </View>
          ))}
          <Pressable style={styles.addPond} onPress={() => setPonds((prev) => [...prev, emptyPond(prev.length + 1)])}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>+ Add another pond</Text>
          </Pressable>
        </View>
      )}

      {step === 3 && (
        <View>
          <Field label="Feed name" value={feedName} onChange={setFeedName} />
          <ChipSelect label="Feed type" value={feedType} options={[...FEED_TYPE_OPTIONS]} onSelect={setFeedType} />
          <Field label="Feed maker" value={feedMaker} onChange={setFeedMaker} />
          <Field label="Feed bags" value={feedBags} onChange={setFeedBags} numeric />
          <Field
            label={`Crude protein % (${REGISTRATION_RANGES.crudeProteinPct.min}–${REGISTRATION_RANGES.crudeProteinPct.max})`}
            value={desiredCrudeProteinPct}
            onChange={setProtein}
            numeric
          />
          <Field label="Desired feed qty (kg)" value={desiredFeedQuantityKg} onChange={setFeedQty} numeric />
          <ChipSelect label="Water source" value={waterSource} options={[...WATER_SOURCE_OPTIONS]} onSelect={setWaterSource} />
          <Field
            label={`Initial pH (${REGISTRATION_RANGES.initialPh.min}–${REGISTRATION_RANGES.initialPh.max})`}
            value={initialPh}
            onChange={setInitialPh}
            numeric
          />
          <Field
            label={`Initial DO (${REGISTRATION_RANGES.dissolvedOxygenMgL.min}–${REGISTRATION_RANGES.dissolvedOxygenMgL.max})`}
            value={initialDo}
            onChange={setInitialDo}
            numeric
          />
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
  hint: { color: colors.muted, fontSize: 12, marginBottom: 10 },
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
  pondBlock: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  pondTitle: { fontWeight: '600', color: colors.primary, marginBottom: 8 },
  removeBtn: { marginBottom: 8 },
  addPond: { marginTop: 8, marginBottom: 8 },
});
