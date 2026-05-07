import { Redirect } from 'expo-router';

// Settings root redirects to the more tab which contains the settings hub
export default function SettingsIndex() {
  return <Redirect href="/settings/profile" />;
}
