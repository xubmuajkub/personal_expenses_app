import { useState, useCallback } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Sheet } from '@/ui/Sheet';
import { Field } from '@/ui/Field';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { space } from '@/ui/theme';
import { openDb } from '@/db/sqlite';
import { getProfile, updateProfile } from '@/db/repos/profiles';
import { useAuth } from '@/store/auth';
import { showUndoToast } from '@/ui/UndoToast';

export default function ProfileScreen() {
  const user = useAuth((s) => s.user);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      void openDb().then((db) =>
        getProfile(db, user.id).then((p) => {
          if (p?.display_name) setDisplayName(p.display_name);
        }),
      );
    }, [user?.id]),
  );

  const handleSave = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const db = await openDb();
      await updateProfile(db, user.id, { display_name: displayName.trim() });
      showUndoToast({
        title: 'Profile saved.',
        actionLabel: 'OK',
        ttlMs: 2500,
        onAction: () => {},
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet title="Profile">
      <View style={{ marginBottom: space(4) }}>
        <Text variant="caption" tone="muted" caps style={{ marginBottom: space(2) }}>
          Email
        </Text>
        <Text variant="body">{user?.email ?? '—'}</Text>
      </View>

      <Field
        label="Display name"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Your name"
        accessibilityLabel="Display name"
      />

      <Button
        title="Save"
        variant="primary"
        loading={loading}
        onPress={handleSave}
        accessibilityLabel="Save profile"
      />
    </Sheet>
  );
}
