'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Card, btnStyle, inputStyle } from '../../components/Shell';
import { BrandLogo } from '../../components/BrandLogo';
import { registerFarm, setAuth } from '../../lib/api';

type PondForm = {
  pondName: string;
  pondNumber: number;
  pondType: string;
  pondTypeCustom: string;
  lengthM: number;
  widthM: number;
  depthM: number;
  cultureSystem: string;
  fishSpecies: string[];
  fishCustom: string;
  quantityStocked: number;
  averageWeightAtStockingG: number;
  fingerlingPrice: number;
  stockingDate: string;
  proposedSalesDate: string;
};

const emptyPond = (n: number): PondForm => ({
  pondName: `Pond ${n}`,
  pondNumber: n,
  pondType: '',
  pondTypeCustom: '',
  lengthM: 2,
  widthM: 3,
  depthM: 1.3,
  cultureSystem: 'semi_intensive',
  fishSpecies: ['African sharptooth catfish'],
  fishCustom: '',
  quantityStocked: 2500,
  averageWeightAtStockingG: 8,
  fingerlingPrice: 30,
  stockingDate: new Date().toISOString().slice(0, 10),
  proposedSalesDate: '',
});

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [farmerName, setFarmerName] = useState('');
  const [surname, setSurname] = useState('');
  const [gender, setGender] = useState('');
  const [genderCustom, setGenderCustom] = useState('');
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
  const [farmPostcode, setFarmPostcode] = useState('');
  const [farmLga, setFarmLga] = useState('');
  const [city, setCity] = useState('');
  const [farmSizeAcres, setFarmSizeAcres] = useState('');
  const [farmSizeCustom, setFarmSizeCustom] = useState('');
  const [currency, setCurrency] = useState('NGN');

  const [ponds, setPonds] = useState<PondForm[]>([emptyPond(1)]);

  const [feedName, setFeedName] = useState('');
  const [feedType, setFeedType] = useState('');
  const [feedTypeCustom, setFeedTypeCustom] = useState('');
  const [feedMaker, setFeedMaker] = useState('');
  const [feedBags, setFeedBags] = useState('');
  const [desiredCrudeProteinPct, setProtein] = useState(38);
  const [desiredFeedQuantityKg, setFeedQty] = useState(1500);
  const [waterSource, setWaterSource] = useState('');
  const [waterCustom, setWaterCustom] = useState('');
  const [initialPh, setInitialPh] = useState('');
  const [initialDo, setInitialDo] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const curSym = currencySymbol(currency);

  const dialOptions = useMemo(
    () =>
      [...COUNTRY_OPTIONS]
        .map((c) => ({ dial: c.dialCode, label: `${c.name} (+${c.dialCode})` }))
        .filter((v, i, arr) => arr.findIndex((x) => x.dial === v.dial && x.label === v.label) === i)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [],
  );

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

  const resolveSelect = (value: string, custom: string) =>
    value === CUSTOM_OPTION_VALUE ? custom.trim() : value;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (categories.length === 0) {
      setError('Select at least one category that describes what you do.');
      return;
    }
    const pwdErr = validatePassword(password);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    for (const p of ponds) {
      if (p.proposedSalesDate && !(p.proposedSalesDate > p.stockingDate)) {
        setError(`Pond ${p.pondNumber}: date of sales must be after date of stocking.`);
        return;
      }
      const species = [...p.fishSpecies];
      if (p.fishCustom.trim()) species.push(p.fishCustom.trim());
      if (species.length === 0) {
        setError(`Pond ${p.pondNumber}: select at least one fish type (or enter your own).`);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const body = {
        email,
        password,
        farmerName,
        surname,
        gender: resolveSelect(gender, genderCustom),
        ageRange,
        phone,
        phoneCountryCode,
        postcode,
        lga,
        state,
        country,
        estimatedFishOutputYear: resolveSelect(estimatedFishOutputYear, estimatedCustom),
        categories,
        farmName,
        farmPhone,
        location,
        farmPostcode,
        farmLga,
        city,
        farmSizeAcres: resolveSelect(farmSizeAcres, farmSizeCustom),
        totalPonds: ponds.length,
        currency,
        feedName,
        feedType: resolveSelect(feedType, feedTypeCustom),
        feedMaker,
        feedBags: feedBags ? Number(feedBags) : undefined,
        desiredCrudeProteinPct,
        desiredFeedQuantityKg,
        waterSource: resolveSelect(waterSource, waterCustom),
        initialPh: initialPh || undefined,
        initialDissolvedOxygenMgL: initialDo || undefined,
        ponds: ponds.map((p) => {
          const species = [...p.fishSpecies];
          if (p.fishCustom.trim()) species.push(p.fishCustom.trim());
          return {
            pondName: p.pondName,
            pondNumber: p.pondNumber,
            pondType: resolveSelect(p.pondType, p.pondTypeCustom),
            lengthM: p.lengthM,
            widthM: p.widthM,
            depthM: p.depthM,
            cultureSystem: p.cultureSystem,
            fishSpecies: species,
            quantityStocked: p.quantityStocked,
            averageWeightAtStockingG: p.averageWeightAtStockingG,
            fingerlingPrice: p.fingerlingPrice,
            stockingDate: p.stockingDate,
            proposedSalesDate: p.proposedSalesDate || undefined,
          };
        }),
      };
      const { cycleId, token } = await registerFarm(body);
      setAuth(token, cycleId, { role: 'member' });
      const next = new URLSearchParams(window.location.search).get('next');
      const safeNext = next && next.startsWith('/s/') ? next : '/';
      router.push(safeNext);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="phone-frame" style={{ boxSizing: 'border-box', width: '100%', padding: 'max(1rem, env(safe-area-inset-top)) 1rem max(2rem, env(safe-area-inset-bottom))', background: '#f0f7fa', minHeight: '100dvh' }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <BrandLogo variant="full" href="/" />
      </div>
      <h1 style={{ color: '#0d4f6e' }}>Register</h1>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        Tell us who you are and what you do in aquaculture — you can pick more than one category.
      </p>
      <form onSubmit={submit} style={{ display: 'grid', gap: '1rem' }}>
        <Card title="Personal data">
          <Field label="Email" value={email} onChange={setEmail} type="email" required />
          <label style={{ display: 'block', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#555' }}>Password</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputStyle, flex: 1, boxSizing: 'border-box' }}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                style={{ ...btnStyle, background: '#64748b', whiteSpace: 'nowrap' }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <span style={{ display: 'block', marginTop: 6, fontSize: '0.8rem', color: '#64748b' }}>
              {PASSWORD_RULE_HINT}
            </span>
          </label>
          <Field label="First name" value={farmerName} onChange={setFarmerName} required />
          <Field label="Surname" value={surname} onChange={setSurname} />
          <SelectOrCustom
            label="Gender"
            value={gender}
            custom={genderCustom}
            onChange={setGender}
            onCustom={setGenderCustom}
            options={GENDER_OPTIONS}
          />
          <Select label="Age range" value={ageRange} onChange={setAgeRange} options={AGE_RANGE_OPTIONS} />
          <label style={{ display: 'block', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#555' }}>Phone</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <select
                value={phoneCountryCode}
                onChange={(e) => setPhoneCountryCode(e.target.value)}
                style={{ ...inputStyle, maxWidth: 220, boxSizing: 'border-box' }}
              >
                {dialOptions.map((o) => (
                  <option key={o.label} value={o.dial}>{o.label}</option>
                ))}
              </select>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="National number"
                style={{ ...inputStyle, flex: 1, boxSizing: 'border-box' }}
              />
            </div>
          </label>
          <Field label="Postcode" value={postcode} onChange={setPostcode} />
          <Field label="Local government area / borough" value={lga} onChange={setLga} />
          <Field label="State / region" value={state} onChange={setState} />
          <Select
            label="Country"
            value={country}
            onChange={(v) => {
              setCountry(v);
              const match = COUNTRY_OPTIONS.find((c) => c.name === v);
              if (match) setPhoneCountryCode(match.dialCode);
            }}
            options={COUNTRY_OPTIONS.map((c) => c.name)}
            required
          />
          <SelectOrCustom
            label="Estimated fish output / year"
            value={estimatedFishOutputYear}
            custom={estimatedCustom}
            onChange={setEstimated}
            onCustom={setEstimatedCustom}
            options={ESTIMATED_FISH_OUTPUT_OPTIONS}
          />
        </Card>

        <Card
          title="What do you do?"
          subtitle="Choose all that apply — we use this with your location so the backend knows activity by area"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.4rem' }}>
            {MEMBER_CATEGORIES.map((c) => {
              const on = categories.includes(c.value);
              return (
                <label
                  key={c.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.45rem',
                    fontSize: '0.88rem',
                    padding: '0.5rem 0.55rem',
                    borderRadius: 8,
                    border: `1px solid ${on ? '#0d4f6e' : '#e2e8f0'}`,
                    background: on ? '#e8f4f8' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <input type="checkbox" checked={on} onChange={() => toggleCategory(c.value)} style={{ marginTop: 2 }} />
                  <span>{c.label}</span>
                </label>
              );
            })}
          </div>
        </Card>

        <Card title="Farm">
          <Field label="Farm name" value={farmName} onChange={setFarmName} required />
          <Field label="Farm phone" value={farmPhone} onChange={setFarmPhone} />
          <Field label="Farm address / location" value={location} onChange={setLocation} />
          <Field label="Farm postcode" value={farmPostcode} onChange={setFarmPostcode} />
          <Field label="Farm LGA / borough" value={farmLga} onChange={setFarmLga} />
          <Field label="City" value={city} onChange={setCity} />
          <SelectOrCustom
            label="Farm size (acres)"
            value={farmSizeAcres}
            custom={farmSizeCustom}
            onChange={setFarmSizeAcres}
            onCustom={setFarmSizeCustom}
            options={FARM_SIZE_ACRES_OPTIONS}
          />
          <Select
            label="Currency (for prices)"
            value={currency}
            onChange={setCurrency}
            options={CURRENCY_OPTIONS.map((c) => c.code)}
            labels={CURRENCY_OPTIONS.map((c) => c.label)}
          />
        </Card>

        {ponds.map((pond, index) => (
          <Card
            key={index}
            title={`Pond ${pond.pondNumber}`}
            subtitle={index === 0 ? 'Add every pond you want to register now' : undefined}
          >
            <Field label="Pond name" value={pond.pondName} onChange={(v) => updatePond(index, { pondName: v })} required />
            <Field
              label="Pond number"
              value={String(pond.pondNumber)}
              onChange={(v) => updatePond(index, { pondNumber: Number(v) || 1 })}
              type="number"
            />
            <SelectOrCustom
              label="Pond type"
              value={pond.pondType}
              custom={pond.pondTypeCustom}
              onChange={(v) => updatePond(index, { pondType: v })}
              onCustom={(v) => updatePond(index, { pondTypeCustom: v })}
              options={POND_TYPE_OPTIONS}
            />
            <Field label="Length (m)" value={String(pond.lengthM)} onChange={(v) => updatePond(index, { lengthM: Number(v) })} type="number" />
            <Field label="Width (m)" value={String(pond.widthM)} onChange={(v) => updatePond(index, { widthM: Number(v) })} type="number" />
            <Field label="Depth (m)" value={String(pond.depthM)} onChange={(v) => updatePond(index, { depthM: Number(v) })} type="number" />
            <Select
              label="Culture system"
              value={pond.cultureSystem}
              onChange={(v) => updatePond(index, { cultureSystem: v })}
              options={CULTURE_SYSTEM_OPTIONS.map((o) => o.value)}
              labels={CULTURE_SYSTEM_OPTIONS.map((o) => o.label)}
            />

            <p style={{ margin: '0.5rem 0 0.35rem', fontSize: '0.85rem', color: '#555' }}>
              Fish stock (select all that apply)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.35rem', marginBottom: '0.75rem' }}>
              {FISH_SPECIES_OPTIONS.map((sp) => {
                const on = pond.fishSpecies.includes(sp);
                return (
                  <label
                    key={sp}
                    style={{
                      display: 'flex',
                      gap: 6,
                      fontSize: '0.82rem',
                      padding: '0.35rem 0.45rem',
                      borderRadius: 6,
                      border: `1px solid ${on ? '#0d4f6e' : '#e2e8f0'}`,
                      background: on ? '#e8f4f8' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggleFish(index, sp)} />
                    {sp}
                  </label>
                );
              })}
            </div>
            <Field
              label="Other fish type (optional)"
              value={pond.fishCustom}
              onChange={(v) => updatePond(index, { fishCustom: v })}
              placeholder="Type your own if not listed"
            />
            <Field label="Quantity stocked" value={String(pond.quantityStocked)} onChange={(v) => updatePond(index, { quantityStocked: Number(v) })} type="number" />
            <Field label="Average weight @ stocking (g)" value={String(pond.averageWeightAtStockingG)} onChange={(v) => updatePond(index, { averageWeightAtStockingG: Number(v) })} type="number" />
            <Field
              label={`Fingerling price (${curSym})`}
              value={String(pond.fingerlingPrice)}
              onChange={(v) => updatePond(index, { fingerlingPrice: Number(v) })}
              type="number"
            />
            <Field label="Date of stocking" value={pond.stockingDate} onChange={(v) => updatePond(index, { stockingDate: v })} type="date" />
            <Field
              label="Proposed date of sales"
              value={pond.proposedSalesDate}
              onChange={(v) => updatePond(index, { proposedSalesDate: v })}
              type="date"
            />
            {ponds.length > 1 && (
              <button
                type="button"
                onClick={() => setPonds((prev) => prev.filter((_, i) => i !== index))}
                style={{ ...btnStyle, background: '#b91c1c', marginTop: 4 }}
              >
                Remove this pond
              </button>
            )}
          </Card>
        ))}

        <button
          type="button"
          onClick={() => setPonds((prev) => [...prev, emptyPond(prev.length + 1)])}
          style={{ ...btnStyle, background: '#0f766e' }}
        >
          + Add another pond
        </button>

        <Card title="Feed (applied to all ponds)">
          <Field label="Feed name" value={feedName} onChange={setFeedName} />
          <SelectOrCustom
            label="Feed type"
            value={feedType}
            custom={feedTypeCustom}
            onChange={setFeedType}
            onCustom={setFeedTypeCustom}
            options={FEED_TYPE_OPTIONS}
          />
          <Field label="Feed maker" value={feedMaker} onChange={setFeedMaker} />
          <Field label="Feed quantity (bags)" value={feedBags} onChange={setFeedBags} type="number" />
          <Field
            label={`Crude protein (%) — min ${REGISTRATION_RANGES.crudeProteinPct.min}, max ${REGISTRATION_RANGES.crudeProteinPct.max}`}
            value={String(desiredCrudeProteinPct)}
            onChange={(v) => setProtein(Number(v))}
            type="number"
            min={REGISTRATION_RANGES.crudeProteinPct.min}
            max={REGISTRATION_RANGES.crudeProteinPct.max}
          />
          <Field label="Desired feed quantity (kg)" value={String(desiredFeedQuantityKg)} onChange={(v) => setFeedQty(Number(v))} type="number" />
        </Card>

        <Card title="Pond water (at setup)">
          <SelectOrCustom
            label="Water source"
            value={waterSource}
            custom={waterCustom}
            onChange={setWaterSource}
            onCustom={setWaterCustom}
            options={WATER_SOURCE_OPTIONS}
          />
          <Field
            label={`Initial pH (optional) — ${REGISTRATION_RANGES.initialPh.min} to ${REGISTRATION_RANGES.initialPh.max}`}
            value={initialPh}
            onChange={setInitialPh}
            type="number"
            min={REGISTRATION_RANGES.initialPh.min}
            max={REGISTRATION_RANGES.initialPh.max}
            step="0.1"
          />
          <Field
            label={`Initial dissolved O₂ mg/L (optional) — ${REGISTRATION_RANGES.dissolvedOxygenMgL.min} to ${REGISTRATION_RANGES.dissolvedOxygenMgL.max}`}
            value={initialDo}
            onChange={setInitialDo}
            type="number"
            min={REGISTRATION_RANGES.dissolvedOxygenMgL.min}
            max={REGISTRATION_RANGES.dissolvedOxygenMgL.max}
            step="0.1"
          />
        </Card>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        <button type="submit" style={btnStyle} disabled={loading}>
          {loading ? 'Saving…' : 'Register & view dashboard'}
        </button>
      </form>
    </main>
  );
}

function Field({
  label, value, onChange, type = 'text', required, placeholder, min, max, step,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
  placeholder?: string; min?: number; max?: number; step?: string;
}) {
  return (
    <label style={{ display: 'block', marginBottom: '0.75rem' }}>
      <span style={{ fontSize: '0.85rem', color: '#555' }}>{label}</span>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box' }}
      />
    </label>
  );
}

function Select({
  label, value, onChange, options, labels, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: readonly string[]; labels?: readonly string[]; required?: boolean;
}) {
  return (
    <label style={{ display: 'block', marginBottom: '0.75rem' }}>
      <span style={{ fontSize: '0.85rem', color: '#555' }}>{label}</span>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box' }}
      >
        <option value="">— Select —</option>
        {options.map((opt, i) => (
          <option key={opt} value={opt}>{labels?.[i] ?? opt}</option>
        ))}
      </select>
    </label>
  );
}

function SelectOrCustom({
  label, value, custom, onChange, onCustom, options,
}: {
  label: string; value: string; custom: string;
  onChange: (v: string) => void; onCustom: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block' }}>
        <span style={{ fontSize: '0.85rem', color: '#555' }}>{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box' }}
        >
          <option value="">— Select —</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          <option value={CUSTOM_OPTION_VALUE}>Other (fill yourself)</option>
        </select>
      </label>
      {value === CUSTOM_OPTION_VALUE && (
        <input
          type="text"
          value={custom}
          onChange={(e) => onCustom(e.target.value)}
          placeholder="Type your own"
          style={{ ...inputStyle, display: 'block', width: '100%', marginTop: 8, boxSizing: 'border-box' }}
        />
      )}
    </div>
  );
}
