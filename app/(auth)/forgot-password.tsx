import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Text } from '@/ui/Text';
import { getSupabase } from '@/lib/supabase';
import { color, space } from '@/ui/theme';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setMsg(null);
    setLoading(true);
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: 'personalexpenses://reset',
    });
    setLoading(false);
    setMsg(error ? error.message : 'Reset email sent.');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: space(6), paddingTop: space(10) }}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="display2" style={{ marginBottom: space(8) }}>
          Forgot password
        </Text>

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />

        <Button title="Send reset link" onPress={submit} loading={loading} />

        {msg ? (
          <View style={{ marginTop: space(4) }}>
            <Text variant="body" tone={msg.includes('sent') ? 'success' : 'danger'}>
              {msg}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
