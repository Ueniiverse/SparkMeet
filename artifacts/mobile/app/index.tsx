import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '@/constants/colors';

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (authLoading || (session && profileLoading)) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/login" />;

  const hasProfile = profile?.display_name && profile?.age && (profile?.profile_images?.length ?? 0) > 0;
  if (!hasProfile) return <Redirect href="/(onboarding)" />;

  return <Redirect href="/(tabs)" />;
}
