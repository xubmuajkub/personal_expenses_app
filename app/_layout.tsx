import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/store/auth';
import { useOnboarding } from '@/store/onboarding';
import { bootSyncForUser, stopSyncForUser } from '@/sync/bootstrap';
import { color } from '@/ui/theme';

export default function RootLayout() {
  const { session, loading, init } = useAuth();
  const onboardingDone = useOnboarding((s) => s.completed);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => { void init(); }, [init]);
  useEffect(() => { void useOnboarding.getState().load(); }, []);

  // Boot sync when signed in, stop on sign-out.
  useEffect(() => {
    if (session?.user?.id) void bootSyncForUser(session.user.id);
    else stopSyncForUser();
  }, [session?.user?.id]);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!session && !inAuth) {
      router.replace('/(auth)/sign-in');
    } else if (session && !onboardingDone && !inOnboarding) {
      router.replace('/(onboarding)/welcome');
    } else if (session && onboardingDone && (inAuth || inOnboarding)) {
      router.replace('/');
    }
  }, [loading, session, segments, router, onboardingDone]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg }}>
        <ActivityIndicator color={color.indigo500} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
