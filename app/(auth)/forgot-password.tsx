import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Text } from '@/ui/Text';
import { Gradient, Pulse, Glass } from '@/ui/atoms';
import { getSupabase } from '@/lib/supabase';
import { color, radius, space } from '@/ui/theme';

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
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <Gradient
        preset="hero"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Pulse
        color={color.pulsePink}
        size={280}
        opacity={0.45}
        blur={50}
        style={{ position: 'absolute', top: -80, right: -80 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: space(6), paddingTop: space(10) }}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="display2" tone="onPulse" style={{ marginBottom: space(8) }}>
            Forgot password
          </Text>

          <Glass intensity="med" radius="lg" border style={{ borderRadius: radius.lg }}>
            <View style={{ padding: space(5) }}>
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
            </View>
          </Glass>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
