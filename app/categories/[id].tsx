import { useCallback, useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Sheet } from '@/ui/Sheet';
import { Field } from '@/ui/Field';
import { Chip } from '@/ui/Chip';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { color, space, radius } from '@/ui/theme';
import { COLOR_SWATCHES } from '@/ui/colorSwatches';
import { openDb } from '@/db/sqlite';
import { getCategory, updateCategory } from '@/db/repos/categories';
import type { Category, CategoryKind } from '@/domain/types';

const KINDS: CategoryKind[] = ['expense', 'income'];

export default function EditCategory() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [category, setCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [nameError, setNameError] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void (async () => {
        const db = await openDb();
        const cat = await getCategory(db, id);
        if (!cat) return;
        setCategory(cat);
        setName(cat.name);
        setIcon(cat.icon ?? '');
        setSelectedColor(cat.color ?? null);
        setKind(cat.kind);
      })();
    }, [id]),
  );

  async function save() {
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    if (!id) return;
    setNameError('');
    setSaving(true);
    try {
      const db = await openDb();
      const trimmedIcon = icon.trim();
      await updateCategory(db, id, {
        name: name.trim(),
        icon: trimmedIcon ? trimmedIcon : null,
        color: selectedColor,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  function archive() {
    if (!category || !id) return;
    Alert.alert(
      category.archived ? 'Unarchive category?' : 'Archive category?',
      category.archived
        ? 'This category will appear in your list again.'
        : 'This category will be hidden from the main list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: category.archived ? 'Unarchive' : 'Archive',
          style: category.archived ? 'default' : 'destructive',
          onPress: async () => {
            setArchiving(true);
            try {
              const db = await openDb();
              await updateCategory(db, id, { archived: !category.archived });
              router.back();
            } finally {
              setArchiving(false);
            }
          },
        },
      ],
    );
  }

  if (!category) return null;

  return (
    <Sheet title="Edit category">
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
        {COLOR_SWATCHES.map(([swatchName, hex]) => {
          const isSelected = selectedColor === hex;
          return (
            <Pressable
              key={swatchName}
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

      <Button
        title="Save"
        variant="primary"
        onPress={save}
        loading={saving}
        style={{ marginBottom: space(3) }}
      />

      <Button
        title={category.archived ? 'Unarchive category' : 'Archive category'}
        variant="secondary"
        onPress={archive}
        loading={archiving}
        {...(!category.archived ? { style: { borderColor: color.danger } } : {})}
      />
    </Sheet>
  );
}
