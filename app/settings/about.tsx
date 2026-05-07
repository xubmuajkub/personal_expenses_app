import { View, Linking } from 'react-native';
import Constants from 'expo-constants';
import { Sheet } from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { space } from '@/ui/theme';
import { useAuth } from '@/store/auth';
import { showUndoToast } from '@/ui/UndoToast';

const version = Constants.expoConfig?.version ?? '0.1.0';
const buildNumber =
  (Constants.expoConfig?.ios as { buildNumber?: string } | undefined)?.buildNumber ??
  (Constants.expoConfig?.android as { versionCode?: number } | undefined)?.versionCode?.toString() ??
  'dev';

export default function AboutScreen() {
  const signOut = useAuth((s) => s.signOut);

  const handleSignOut = async () => {
    showUndoToast({
      title: 'Signing out…',
      actionLabel: 'Cancel',
      ttlMs: 2500,
      onAction: () => {},
    });
    await signOut();
  };

  return (
    <Sheet title="About">
      <View style={{ alignItems: 'center', paddingVertical: space(8) }}>
        <Text variant="display3" style={{ marginBottom: space(2) }}>
          Personal Expenses
        </Text>
        <Text variant="body" tone="muted">
          Version {version}
        </Text>
        <Text variant="caption" tone="muted" style={{ marginTop: space(1) }}>
          Build {buildNumber}
        </Text>
      </View>

      <Button
        title="View specification"
        variant="secondary"
        onPress={() =>
          void Linking.openURL(
            'https://github.com/jasoncruises/personal_expenses/blob/main/docs/superpowers/specs/2026-05-07-personal-expenses-design.md',
          )
        }
        style={{ marginBottom: space(3) }}
        accessibilityLabel="View specification"
      />

      <Button
        title="Sign out"
        variant="ghost"
        onPress={() => void handleSignOut()}
        accessibilityLabel="Sign out"
      />
    </Sheet>
  );
}
