import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Sheet } from '@/ui/Sheet';
import { Field } from '@/ui/Field';
import { Chip } from '@/ui/Chip';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { color, space, radius } from '@/ui/theme';
import { COLOR_SWATCHES } from '@/ui/colorSwatches';
import { useAuth } from '@/store/auth';
import { openDb } from '@/db/sqlite';
import { createCategory } from '@/db/repos/categories';
import type { CategoryKind } from '@/domain/types';

const KINDS: CategoryKind[] = ['expense', 'income'];

export default function NewCategory() {
  const userId = useAuth((s) => s.user?.id)!;

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  async function save() {
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    setNameError('');
    setSaving(true);
    try {
      const db = await openDb();
      const trimmedIcon = icon.trim();
      await createCategory(db, {
        user_id: userId,
        name: name.trim(),
        ...(trimmedIcon ? { icon: trimmedIcon } : {}),
        ...(selectedColor ? { color: selectedColor } : {}),
        kind,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title="New category">
      <Field
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Groceries, Salary"
        error={nameError}
      />

      <Field
        label="Icon"
        value={icon}
        onChangeText={setIcon}
        placeholder="e.g. 🛒"
      />

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>
        Color
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
        {COLOR_SWATCHES.map(([name_, hex]) => {
          const isSelected = selectedColor === hex;
          return (
            <Pressable
              key={name_}
              onPress={() => setSelectedColor(isSelected ? null : hex)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.sm,
                backgroundColor: hex,
                marginRight: space(2),
                marginBottom: space(2),
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? color.fg : color.hairline,
              }}
            />
          );
        })}
      </View>

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>
        Kind
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
        {KINDS.map((k) => (
          <Chip key={k} label={k} selected={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>

      <Button title="Save" variant="primary" onPress={save} loading={saving} />
    </Sheet>
  );
}
