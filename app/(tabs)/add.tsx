import { useEffect } from 'react';
import { router } from 'expo-router';

export default function AddTab() {
  useEffect(() => {
    router.replace('/txn/new');
  }, []);
  return null;
}
