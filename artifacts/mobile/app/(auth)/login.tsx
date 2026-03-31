import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence,
  withTiming, withRepeat, Easing, interpolateColor,
  FadeIn, FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Logo animation ──────────────────────────────────────────────────────────
const S = 60;
const CROSS = 300;
const HEART = 1500;
const PAUSE = 500;

function useLogoAnimation() {
  const shake = useSharedValue(0);
  const flashOpacity = useSharedValue(1);
  const flashScale = useSharedValue(1);
  const heartOpacity = useSharedValue(0);
  const heartScale = useSharedValue(0.4);
  const phase = useSharedValue(0);

  useEffect(() => {
    const shakeLoop = withSequence(
      withTiming(-7, { duration: S, easing: Easing.linear }),
      withTiming(7, { duration: S, easing: Easing.linear }),
      withTiming(-6, { duration: S, easing: Easing.linear }),
      withTiming(6, { duration: S, easing: Easing.linear }),
      withTiming(-4, { duration: S, easing: Easing.linear }),
      withTiming(4, { duration: S, easing: Easing.linear }),
      withTiming(-2, { duration: S, easing: Easing.linear }),
      withTiming(0, { duration: S, easing: Easing.linear }),
      withTiming(0, { duration: CROSS + HEART + CROSS + PAUSE }),
    );
    shake.value = withRepeat(shakeLoop, -1, false);

    flashOpacity.value = withRepeat(withSequence(
      withTiming(1, { duration: 8 * S }),
      withTiming(0, { duration: CROSS, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: HEART }),
      withTiming(1, { duration: CROSS, easing: Easing.in(Easing.quad) }),
      withTiming(1, { duration: PAUSE }),
    ), -1, false);

    flashScale.value = withRepeat(withSequence(
      withTiming(1, { duration: 8 * S }),
      withTiming(0.5, { duration: CROSS, easing: Easing.out(Easing.back(2)) }),
      withTiming(0.5, { duration: HEART }),
      withTiming(1, { duration: CROSS, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(1, { duration: PAUSE }),
    ), -1, false);

    heartOpacity.value = withRepeat(withSequence(
      withTiming(0, { duration: 8 * S }),
      withTiming(1, { duration: CROSS, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: HEART }),
      withTiming(0, { duration: CROSS, easing: Easing.in(Easing.quad) }),
      withTiming(0, { duration: PAUSE }),
    ), -1, false);

    heartScale.value = withRepeat(withSequence(
      withTiming(0.4, { duration: 8 * S }),
      withTiming(1, { duration: CROSS, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: HEART }),
      withTiming(0.4, { duration: CROSS, easing: Easing.in(Easing.back(1)) }),
      withTiming(0.4, { duration: PAUSE }),
    ), -1, false);

    phase.value = withRepeat(withSequence(
      withTiming(0, { duration: 8 * S + CROSS / 2 }),
      withTiming(1, { duration: 1 }),
      withTiming(1, { duration: HEART + CROSS / 2 - 1 }),
      withTiming(0, { duration: 1 }),
      withTiming(0, { duration: CROSS / 2 + PAUSE }),
    ), -1, false);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(phase.value, [0, 1], [COLORS.primary + '60', '#FF3B5560']),
  }));
  const glowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(phase.value, [0, 1], [COLORS.primary + '18', '#FF3B5518']),
  }));
  const flashIconStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
    transform: [{ scale: flashScale.value }],
    position: 'absolute',
  }));
  const heartIconStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
    position: 'absolute',
  }));

  return { containerStyle, ringStyle, glowStyle, flashIconStyle, heartIconStyle };
}

// ─── Auth logic ───────────────────────────────────────────────────────────────
type AuthStatus = 'idle' | 'loading' | 'registering';

const STATUS_LABELS: Record<AuthStatus, string> = {
  idle: '',
  loading: 'Wird geprüft...',
  registering: 'Konto wird erstellt...',
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle');
  const logo = useLogoAnimation();

  const isLoading = authStatus !== 'idle';

  const handleContinue = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      Alert.alert('Fehlende Felder', 'Bitte E-Mail und Passwort eingeben.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Passwort zu kurz', 'Das Passwort muss mindestens 6 Zeichen haben.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAuthStatus('loading');

    // 1. Try sign in first
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (!loginError && loginData.session) {
      // Existing user logged in
      setAuthStatus('idle');
      router.replace('/');
      return;
    }

    // 2. If "Invalid login credentials" → could be unknown email OR wrong password
    if (loginError?.message === 'Invalid login credentials') {
      setAuthStatus('registering');

      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });

      // Email already exists → wrong password
      if (signupError?.message?.toLowerCase().includes('already registered') ||
          signupError?.message?.toLowerCase().includes('already been registered')) {
        setAuthStatus('idle');
        Alert.alert('Falsches Passwort', 'Diese E-Mail ist bereits registriert. Bitte überprüfe dein Passwort.');
        return;
      }

      if (signupError) {
        setAuthStatus('idle');
        Alert.alert('Registrierung fehlgeschlagen', signupError.message);
        return;
      }

      if (signupData.user) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAuthStatus('idle');

        if (signupData.session) {
          // Email confirmation disabled in Supabase → directly logged in → onboarding
          router.replace('/');
        } else {
          // Email confirmation still enabled in Supabase
          Alert.alert(
            'Konto erstellt',
            'Bitte bestätige deine E-Mail-Adresse und melde dich dann an.',
            [{ text: 'OK' }]
          );
        }
        return;
      }
    }

    // 3. Any other error (network, etc.)
    setAuthStatus('idle');
    Alert.alert('Fehler', loginError?.message ?? 'Unbekannter Fehler. Bitte erneut versuchen.');
  };

  const handleAppleSignIn = () => {
    Alert.alert('Apple Sign-In', 'Apple Sign-In wird in Kürze verfügbar sein.');
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(124,111,255,0.18)', 'rgba(124,111,255,0.05)', 'transparent']}
        locations={[0, 0.4, 1]}
        style={styles.topGlow}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <Animated.View style={[styles.logoRingWrapper, logo.containerStyle]}>
              <Animated.View style={[styles.logoRing, logo.ringStyle]}>
                <Animated.View style={[styles.logoInner, logo.glowStyle]}>
                  <Animated.View style={logo.flashIconStyle}>
                    <Ionicons name="flash" size={34} color={COLORS.primary} />
                  </Animated.View>
                  <Animated.View style={logo.heartIconStyle}>
                    <Ionicons name="heart" size={34} color="#FF3B55" />
                  </Animated.View>
                </Animated.View>
              </Animated.View>
            </Animated.View>
            <Text style={styles.appName}>SparkMeet</Text>
            <Text style={styles.tagline}>Einfach E-Mail eingeben — wir erkennen ob du neu bist</Text>
          </View>

          {/* Apple */}
          <TouchableOpacity style={styles.appleBtn} onPress={handleAppleSignIn} activeOpacity={0.85}>
            <Ionicons name="logo-apple" size={20} color={COLORS.text} />
            <Text style={styles.appleBtnText}>Mit Apple anmelden</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>oder per E-Mail</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Fields */}
          <View style={styles.fields}>
            <View style={[styles.field, focusedField === 'email' && styles.fieldFocused]}>
              <Ionicons name="mail-outline" size={18} color={focusedField === 'email' ? COLORS.primary : COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="E-Mail"
                placeholderTextColor={COLORS.textDim}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!isLoading}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={[styles.field, focusedField === 'password' && styles.fieldFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color={focusedField === 'password' ? COLORS.primary : COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Passwort"
                placeholderTextColor={COLORS.textDim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoComplete="password"
                editable={!isLoading}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn} disabled={isLoading}>
                <Ionicons
                  name={showPw ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => router.push('/(auth)/forgot-password')}
            disabled={isLoading}
          >
            <Text style={styles.forgotText}>Passwort vergessen?</Text>
          </TouchableOpacity>

          {/* Status hint */}
          {isLoading && (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.statusRow}>
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.statusText}>{STATUS_LABELS[authStatus]}</Text>
            </Animated.View>
          )}

          {/* CTA */}
          <TouchableOpacity
            style={[styles.loginBtn, isLoading && { opacity: 0.65 }]}
            onPress={handleContinue}
            disabled={isLoading}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.loginBtnGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginBtnText}>Weiter</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Hint */}
          <Text style={styles.hint}>
            Noch kein Konto? Einfach loslegen — wir erstellen es automatisch.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  topGlow: {
    position: 'absolute', top: 0, left: -60, right: -60,
    height: 380, borderBottomLeftRadius: 200, borderBottomRightRadius: 200,
  },
  scroll: { paddingHorizontal: 28, flexGrow: 1 },
  logoSection: { alignItems: 'center', marginBottom: 44 },
  logoRingWrapper: { marginBottom: 18 },
  logoRing: {
    width: 88, height: 88, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  logoInner: {
    width: 72, height: 72, borderRadius: 20,
    borderWidth: 1.5, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  appName: { color: COLORS.text, fontSize: 34, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginBottom: 8 },
  tagline: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 19 },
  appleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surfaceBorder,
    borderRadius: 18, height: 56, marginBottom: 22,
  },
  appleBtnText: { color: COLORS.text, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.surfaceBorder },
  dividerText: { color: COLORS.textDim, fontSize: 13, fontFamily: 'Inter_400Regular' },
  fields: { gap: 12, marginBottom: 14 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.surfaceBorder,
    borderRadius: 18, height: 58, paddingHorizontal: 18,
  },
  fieldFocused: { borderColor: COLORS.primary },
  input: { flex: 1, color: COLORS.text, fontSize: 15, fontFamily: 'Inter_400Regular' },
  eyeBtn: { padding: 4 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 18 },
  forgotText: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statusText: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular' },
  loginBtn: { borderRadius: 18, overflow: 'hidden', marginBottom: 20 },
  loginBtnGradient: { height: 58, alignItems: 'center', justifyContent: 'center' },
  loginBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },
  hint: {
    color: COLORS.textDim, fontSize: 12, fontFamily: 'Inter_400Regular',
    textAlign: 'center', lineHeight: 17, paddingHorizontal: 12,
  },
});
