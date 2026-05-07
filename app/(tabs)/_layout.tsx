import { Tabs } from 'expo-router';
import { TabBar } from '@/ui/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="transactions" />
      <Tabs.Screen name="add" />
      <Tabs.Screen name="budgets" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
