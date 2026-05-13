import { ScrollView, Pressable, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Coins,
  Tag,
  Wallet,
  Repeat,
  Store,
  Bell,
  RefreshCw,
  Database,
  Activity,
  Info,
  LogOut,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react-native';
import { Text } from '@/ui/Text';
import { Glass } from '@/ui/atoms';
import { color, radius, space } from '@/ui/theme';
import { useAuth } from '@/store/auth';

interface RowProps {
  label: string;
  icon: LucideIcon;
  hint?: string;
  onPress: () => void;
  danger?: boolean;
}

function Row({ label, icon: Icon, hint, onPress, danger }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        marginHorizontal: space(4),
        marginBottom: space(2),
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Glass
        intensity="soft"
        radius="md"
        border
        style={{
          borderRadius: radius.md,
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: space(3.5),
          paddingHorizontal: space(4),
        }}
      >
        <Icon size={20} color={danger ? color.danger : color.fg} />
        <View style={{ flex: 1, marginLeft: space(3) }}>
          <Text variant="bodyLg" tone={danger ? 'danger' : 'fg'}>
            {label}
          </Text>
        </View>
        {hint ? (
          <Text variant="caption" tone="muted" style={{ marginRight: space(2) }}>
            {hint}
          </Text>
        ) : null}
        <ChevronRight size={18} color={color.muted} />
      </Glass>
    </Pressable>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={{ marginBottom: space(5) }}>
      <Text
        variant="caption"
        tone="muted"
        caps
        style={{ paddingHorizontal: space(5), paddingVertical: space(2) }}
      >
        {title}
      </Text>
      {children}
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
        <Row label="Profile" icon={User} onPress={() => router.push('/settings/profile')} />
        <Row label="Base currency" icon={Coins} onPress={() => router.push('/settings/base-currency')} />
      </Section>

      <Section title="Manage">
        <Row label="Categories" icon={Tag} onPress={() => router.push('/categories')} />
        <Row label="Accounts" icon={Wallet} onPress={() => router.push('/accounts')} />
        <Row label="Recurring" icon={Repeat} onPress={() => router.push('/recurring')} />
        <Row label="Merchant rules" icon={Store} onPress={() => router.push('/settings/merchant-rules')} />
        <Row label="Notification rules" icon={Bell} onPress={() => router.push('/settings/notif-rules')} />
      </Section>

      <Section title="Settings">
        <Row label="FX rates" icon={RefreshCw} onPress={() => router.push('/settings/fx')} />
        <Row label="Notifications" icon={Bell} onPress={() => router.push('/settings/notifications')} />
        <Row label="Data" icon={Database} onPress={() => router.push('/settings/data')} />
        <Row label="Diagnostics" icon={Activity} onPress={() => router.push('/settings/diagnostics')} />
        <Row label="About" icon={Info} onPress={() => router.push('/settings/about')} />
      </Section>

      <Section title="Session">
        <Row label="Sign out" icon={LogOut} danger onPress={handleSignOut} />
      </Section>

      <View style={{ height: space(10) }} />
    </ScrollView>
  );
}
