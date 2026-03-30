import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Fehler', 'Bitte E-Mail und Passwort eingeben.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Anmeldung fehlgeschlagen', error.message);
  };

  const handleAppleSignIn = () => {
    Alert.alert('Apple Sign-In', 'Apple Sign-In wird in Kürze verfügbar sein.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoRing}>
            <Ionicons name="flash" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>SparkMeet</Text>
          <Text style={styles.subtitle}>Verbinde dich über gemeinsame Erlebnisse</Text>
        </View>

        <TouchableOpacity style={styles.appleButton} onPress={handleAppleSignIn} activeOpacity={0.85}>
          <Ionicons name="logo-apple" size={20} color={COLORS.text} />
          <Text style={styles.appleButtonText}>Mit Apple anmelden</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>oder per E-Mail</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="E-Mail"
              placeholderTextColor={COLORS.textDim}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Passwort"
              placeholderTextColor={COLORS.textDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
              autoComplete="current-password"
            />
            <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeButton}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <View style={styles.loadingDots}>
              <Text style={styles.loginButtonText}>...</Text>
            </View>
          ) : (
            <Text style={styles.loginButtonText}>Anmelden</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotButton}
          onPress={() => router.push('/(auth)/forgot-password')}
        >
          <Text style={styles.forgotText}>Passwort vergessen?</Text>
        </TouchableOpacity>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Noch kein Konto? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}>Registrieren</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: 24, flexGrow: 1 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoRing: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1.5, borderColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  appName: { color: COLORS.text, fontSize: 32, fontFamily: 'Inter_700Bold', marginBottom: 6 },
  subtitle: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  appleButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surfaceBorder,
    borderRadius: 16, height: 54, marginBottom: 20,
  },
  appleButtonText: { color: COLORS.text, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.surfaceBorder },
  dividerText: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular' },
  inputGroup: { gap: 12, marginBottom: 20 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surfaceBorder,
    borderRadius: 16, height: 54, paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: COLORS.text, fontSize: 15, fontFamily: 'Inter_400Regular' },
  eyeButton: { padding: 4 },
  loginButton: {
    backgroundColor: COLORS.primary, borderRadius: 16, height: 54,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: { color: COLORS.white, fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  loadingDots: { alignItems: 'center', justifyContent: 'center' },
  forgotButton: { alignItems: 'center', marginBottom: 24 },
  forgotText: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular' },
  registerRow: { flexDirection: 'row', justifyContent: 'center' },
  registerText: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular' },
  registerLink: { color: COLORS.primary, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
