import { useState } from 'react';
import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Text } from '@/ui/Text';
import { getSupabase } from '@/lib/supabase';
import { color, space } from '@/ui/theme';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErr(null);
    setLoading(true);
    const { error } = await getSupabase().auth.signUp({ email, password: pw });
    setLoading(false);
    if (error) setErr(error.message);
    else router.replace('/(onboarding)/welcome');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: space(6), paddingTop: space(10) }}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="display2" style={{ marginBottom: space(8) }}>
          Create account
        </Text>

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <Field
          label="Password"
          value={pw}
          onChangeText={setPw}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />

        {err ? (
          <Text variant="caption" tone="danger" style={{ marginBottom: space(3) }}>
            {err}
          </Text>
        ) : null}

        <Button title="Create account" onPress={submit} loading={loading} />
      </ScrollView>
    </SafeAreaView>
  );
}
