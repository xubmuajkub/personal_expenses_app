import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { Field } from '@/ui/Field';
import { Button } from '@/ui/Button';
import { space, color, radius } from '@/ui/theme';
import { openDb } from '@/db/sqlite';
import { getRate, setRate } from '@/db/repos/fx_rates';
import type { Currency } from '@/domain/types';

type Pair = { from: Currency; to: Currency };

const PAIRS: Pair[] = [
  { from: 'LAK', to: 'THB' },
  { from: 'LAK', to: 'USD' },
  { from: 'THB', to: 'LAK' },
  { from: 'THB', to: 'USD' },
  { from: 'USD', to: 'LAK' },
  { from: 'USD', to: 'THB' },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function FxSettings() {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const pairKey = (p: Pair) => `${p.from}_${p.to}`;

  const load = useCallback(async () => {
    const db = await openDb();
    const date = today();
    const loaded: Record<string, number> = {};
    await Promise.all(
      PAIRS.map(async (p) => {
        loaded[pairKey(p)] = await getRate(db, p.from, p.to, date);
      }),
    );
    setRates(loaded);
    setInputs({});
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const save = async (pair: Pair) => {
    const key = pairKey(pair);
    const raw = inputs[key] ?? '';
    const value = parseFloat(raw);
    if (isNaN(value) || value <= 0) return;
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      const db = await openDb();
      await setRate(db, today(), pair.from, pair.to, value);
      setRates((prev) => ({ ...prev, [key]: value }));
      setInputs((prev) => ({ ...prev, [key]: '' }));
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <Sheet title="FX rates">
      <Text variant="body" tone="muted" style={{ marginBottom: space(6) }}>
        Per-transaction overrides happen on the new-transaction screen. This page lets you override
        the day&apos;s cached rates locally.
      </Text>

      {PAIRS.map((pair) => {
        const key = pairKey(pair);
        const currentRate = rates[key];
        return (
          <View key={key} style={{ marginBottom: space(5) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space(2) }}>
              <View
                style={{
                  paddingHorizontal: space(3),
                  paddingVertical: space(1),
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  marginRight: space(2),
                  borderColor: color.indigo500,
                  backgroundColor: color.surfaceQuiet,
                }}
              >
                <Text variant="caption">{pair.from}</Text>
              </View>
              <Text variant="caption" tone="muted" style={{ marginRight: space(2) }}>→</Text>
              <View
                style={{
                  paddingHorizontal: space(3),
                  paddingVertical: space(1),
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  marginRight: space(3),
                  borderColor: color.indigo500,
                  backgroundColor: color.surfaceQuiet,
                }}
              >
                <Text variant="caption">{pair.to}</Text>
              </View>
              {currentRate !== undefined ? (
                <Text variant="caption" tone="muted">
                  current: {currentRate.toFixed(6)}
                </Text>
              ) : null}
            </View>
            <Field
              label={`New rate (${pair.from} → ${pair.to})`}
              value={inputs[key] ?? ''}
              onChangeText={(v) => setInputs((prev) => ({ ...prev, [key]: v }))}
              keyboardType="decimal-pad"
              placeholder={currentRate !== undefined ? String(currentRate.toFixed(6)) : '0.000000'}
            />
            <Button
              title="Save rate"
              variant="primary"
              loading={!!saving[key]}
              disabled={!inputs[key] || isNaN(parseFloat(inputs[key] ?? '')) || parseFloat(inputs[key] ?? '') <= 0}
              onPress={() => { void save(pair); }}
            />
          </View>
        );
      })}
    </Sheet>
  );
}
