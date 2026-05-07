import { ScrollView, Pressable, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/ui/Text';
import { color, space } from '@/ui/theme';
import { useAuth } from '@/store/auth';

interface RowProps {
  label: string;
  hint?: string;
  onPress: () => void;
  danger?: boolean;
}

function Row({ label, hint, onPress, danger }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: space(4),
        paddingHorizontal: space(5),
        backgroundColor: pressed ? color.hairline : color.surface,
        borderBottomWidth: 1,
        borderBottomColor: color.hairline,
      })}
    >
      <Text variant="bodyLg" tone={danger ? 'danger' : 'fg'}>
        {label}
      </Text>
      {hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : (
        <Text variant="caption" tone="muted">
          ›
        </Text>
      )}
    </Pressable>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={{ marginBottom: space(6) }}>
      <Text
        variant="caption"
        tone="muted"
        caps
        style={{ paddingHorizontal: space(5), paddingVertical: space(2) }}
      >
        {title}
      </Text>
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: color.hairline,
          borderBottomWidth: 1,
          borderBottomColor: color.hairline,
        }}
      >
        {children}
      </View>
    </View>
  );
}

export default function MoreTab() {
  const router = useRouter();
  const signOut = useAuth((s) => s.signOut);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => void signOut(),
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ paddingTop: space(12), paddingBottom: space(4), paddingHorizontal: space(5) }}>
        <Text variant="display3">More</Text>
      </View>

      <Section title="Account">
        <Row label="Profile" onPress={() => router.push('/settings/profile')} />
        <Row label="Base currency" onPress={() => router.push('/settings/base-currency')} />
      </Section>

      <Section title="Manage">
        <Row label="Categories" onPress={() => router.push('/categories')} />
        <Row label="Accounts" onPress={() => router.push('/accounts')} />
        <Row label="Recurring" onPress={() => router.push('/recurring')} />
        <Row label="Merchant rules" onPress={() => router.push('/settings/merchant-rules')} />
        <Row label="Notification rules" onPress={() => router.push('/settings/notif-rules')} />
      </Section>

      <Section title="Settings">
        <Row label="FX rates" onPress={() => router.push('/settings/fx')} />
        <Row label="Notifications" onPress={() => router.push('/settings/notifications')} />
        <Row label="Data" onPress={() => router.push('/settings/data')} />
        <Row label="Diagnostics" onPress={() => router.push('/settings/diagnostics')} />
        <Row label="About" onPress={() => router.push('/settings/about')} />
      </Section>

      <Section title="Session">
        <Row label="Sign out" danger onPress={handleSignOut} />
      </Section>

      <View style={{ height: space(10) }} />
    </ScrollView>
  );
}
