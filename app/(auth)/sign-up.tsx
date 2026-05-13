import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Text } from '@/ui/Text';
import { Gradient, Pulse, Glass } from '@/ui/atoms';
import { getSupabase } from '@/lib/supabase';
import { color, radius, space } from '@/ui/theme';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErr(null);
    setMsg(null);
    setLoading(true);
    const { data, error } = await getSupabase().auth.signUp({ email, password: pw });
    if (error) { setErr(error.message); setLoading(false); return; }
    if (!data.session) {
      setMsg('Check your email to confirm your account, then sign in.');
      setLoading(false);
      return;
    }
    setLoading(false);
    router.replace('/(onboarding)/welcome');
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <Gradient
        preset="hero"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Pulse
        color={color.pulseLilac}
        size={300}
        opacity={0.45}
        blur={50}
        style={{ position: 'absolute', bottom: -80, left: -80 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: space(6), paddingTop: space(10) }}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="display2" tone="onPulse" style={{ marginBottom: space(8) }}>
            Create account
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

              {msg ? (
                <Text variant="caption" tone="success" style={{ marginBottom: space(3) }}>
                  {msg}
                </Text>
              ) : null}

              <Button title="Create account" onPress={submit} loading={loading} />
            </View>
          </Glass>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
