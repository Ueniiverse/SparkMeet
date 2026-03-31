import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ProfileProvider, useProfile } from "@/context/ProfileContext";
import { COLORS } from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const segments = useSegments();

  useEffect(() => {
    if (authLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(onboarding)";
    const inTabs = segments[0] === "(tabs)";

    if (!session) {
      if (!inAuthGroup) {
        router.replace("/(auth)/login");
      }
      return;
    }

    if (profileLoading) return;

    const hasProfile =
      !!profile?.display_name &&
      !!profile?.age &&
      (profile?.profile_images?.length ?? 0) > 0;

    if (!hasProfile) {
      if (!inOnboarding) {
        router.replace("/(onboarding)");
      }
    } else {
      if (inAuthGroup || inOnboarding || !segments[0]) {
        router.replace("/(tabs)");
      }
    }
  }, [session, authLoading, profile, profileLoading, segments]);

  // Only block rendering when a session exists and profile is still fetching.
  // During the initial auth check (authLoading) we render children right away so
  // the login screen is visible immediately — no double-spinner on app start.
  if (session && profileLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <AuthGuard>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="event/[id]" />
        <Stack.Screen name="post-like/[eventId]" />
        <Stack.Screen name="chat/[matchId]" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="create-event" />
        <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
      </Stack>
    </AuthGuard>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <ProfileProvider>
                  <RootLayoutNav />
                </ProfileProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
