import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence,
  withTiming, withRepeat, Easing, interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Logo animation ───────────────────────────────────────────────────────────
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
    shake.value = withRepeat(withSequence(
      withTiming(-7, { duration: S, easing: Easing.linear }),
      withTiming(7, { duration: S, easing: Easing.linear }),
      withTiming(-6, { duration: S, easing: Easing.linear }),
      withTiming(6, { duration: S, easing: Easing.linear }),
      withTiming(-4, { duration: S, easing: Easing.linear }),
      withTiming(4, { duration: S, easing: Easing.linear }),
      withTiming(-2, { duration: S, easing: Easing.linear }),
      withTiming(0, { duration: S, easing: Easing.linear }),
      withTiming(0, { duration: CROSS + HEART + CROSS + PAUSE }),
    ), -1, false);

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

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const logo = useLogoAnimation();

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      Alert.alert('Fehlende Felder', 'Bitte E-Mail und Passwort eingeben.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
    setLoading(false);
    if (error) {
      Alert.alert('Anmeldung fehlgeschlagen', error.message);
    } else {
      router.replace('/');
    }
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
            <Text style={styles.slogan}>Triff Menschen, nicht Profile.</Text>
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
                editable={!loading}
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
                autoComplete="current-password"
                editable={!loading}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn} disabled={loading}>
                <Ionicons
                  name={showPw ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => router.push('/(auth)/forgot-password')}
            disabled={loading}
          >
            <Text style={styles.forgotText}>Passwort vergessen?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.65 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.loginBtnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginBtnText}>Anmelden</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Noch kein Konto? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')} disabled={loading}>
              <Text style={styles.registerLink}>Registrieren</Text>
            </TouchableOpacity>
          </View>
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
  appName: {
    color: COLORS.text, fontSize: 34, fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5, marginBottom: 6,
  },
  slogan: {
    color: COLORS.textMuted, fontSize: 15, fontFamily: 'Inter_400Regular',
    textAlign: 'center', letterSpacing: 0.1,
  },
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
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 22 },
  forgotText: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular' },
  loginBtn: { borderRadius: 18, overflow: 'hidden', marginBottom: 28 },
  loginBtnGradient: { height: 58, alignItems: 'center', justifyContent: 'center' },
  loginBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },
  registerRow: { flexDirection: 'row', justifyContent: 'center' },
  registerText: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular' },
  registerLink: { color: COLORS.primary, fontSize: 14, fontFamily: 'Inter_700Bold' },
});
