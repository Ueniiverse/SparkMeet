import { useEffect } from 'react';
import { router } from 'expo-router';

export default function RegisterScreen() {
  useEffect(() => {
    router.replace('/(auth)/login');
  }, []);
  return null;
}
