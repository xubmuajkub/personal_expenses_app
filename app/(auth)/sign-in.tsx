import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Text } from '@/ui/Text';
import { AuroraArch } from '@/ui/AuroraArch';
import { getSupabase } from '@/lib/supabase';
import { signInWithGoogle } from '@/lib/google';
import { color, space } from '@/ui/theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onEmail() {
    setErr(null);
    setLoading(true);
    const { error } = await getSupabase().auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) setErr(error.message);
    else router.replace('/');
  }

  async function onGoogle() {
    setErr(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.replace('/');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <AuroraArch
        height={200}
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
        topRadius={0}
        bottomRadius={0}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: space(6), paddingTop: space(12) }}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="display2" style={{ marginBottom: space(8) }} tone="onDark">
            Sign in
          </Text>

          <View
            style={{
              backgroundColor: color.bg,
              borderRadius: 20,
              padding: space(5),
              marginTop: space(4),
            }}
          >
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
              autoComplete="password"
              textContentType="password"
            />

            {err ? (
              <Text variant="caption" tone="danger" style={{ marginBottom: space(3) }}>
                {err}
              </Text>
            ) : null}

            <Button title="Sign in" onPress={onEmail} loading={loading} variant="primary" />
            <View style={{ height: space(3) }} />
            <Button
              title="Continue with Google"
              onPress={onGoogle}
              loading={googleLoading}
              variant="secondary"
            />

            <View style={{ height: space(6) }} />

            <Link href="/(auth)/forgot-password" style={{ alignSelf: 'center' }}>
              <Text variant="body" tone="indigo">Forgot password?</Text>
            </Link>
            <View style={{ height: space(3) }} />
            <Link href="/(auth)/sign-up" style={{ alignSelf: 'center' }}>
              <Text variant="body" tone="indigo">Create account</Text>
            </Link>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
