import { useState } from 'react';
import { Platform, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Text } from '@/ui/Text';
import { createAccount } from '@/db/repos/accounts';
import { openDb } from '@/db/sqlite';
import { useAuth } from '@/store/auth';
import { color, space } from '@/ui/theme';

export default function CreateFirstAccount() {
  const userId = useAuth((s) => s.user?.id);
  const [name, setName] = useState('BCEL Savings');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function next() {
    if (!userId) return;
    setErr(null);
    setLoading(true);
    try {
      const db = await openDb();
      await createAccount(db, { user_id: userId, name, type: 'bank', currency: 'LAK' });
      router.push(
        Platform.OS === 'android' ? '/(onboarding)/android-notif-permission' : '/',
      );
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flex: 1, padding: space(6), justifyContent: 'center' }}>
        <Text variant="display3" style={{ marginBottom: space(2) }}>
          Your main account
        </Text>
        <Text variant="body" tone="muted" style={{ marginBottom: space(5) }}>
          We&apos;ll use this as the default for BCEL notifications. You can add more later.
        </Text>
        <Field label="Account name" value={name} onChangeText={setName} />
        <Button title="Create account" onPress={next} loading={loading} />
        {err ? <Text variant="body" tone="danger">{err}</Text> : null}
      </View>
    </SafeAreaView>
  );
}
