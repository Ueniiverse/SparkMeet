import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleRegister = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password || !confirm) {
      Alert.alert('Fehlende Felder', 'Bitte alle Felder ausfüllen.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwörter stimmen nicht überein', 'Bitte überprüfe deine Eingabe.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Passwort zu kurz', 'Das Passwort muss mindestens 6 Zeichen haben.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Registrierung fehlgeschlagen', error.message);
      return;
    }

    if (data.user && !data.session) {
      Alert.alert(
        'E-Mail bestätigen',
        'Bitte bestätige deine E-Mail-Adresse und melde dich dann an.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
      return;
    }

    if (data.user) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    }
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
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <View style={styles.backBtnInner}>
              <Ionicons name="chevron-back" size={20} color={COLORS.text} />
            </View>
          </TouchableOpacity>

          <Text style={styles.heading}>Konto erstellen</Text>
          <Text style={styles.subheading}>Singles bei gemeinsamen Events treffen</Text>

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
                autoComplete="new-password"
                editable={!loading}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn} disabled={loading}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.field, focusedField === 'confirm' && styles.fieldFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color={focusedField === 'confirm' ? COLORS.primary : COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Passwort bestätigen"
                placeholderTextColor={COLORS.textDim}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showPw}
                autoComplete="new-password"
                editable={!loading}
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.registerBtn, loading && { opacity: 0.65 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.registerBtnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.registerBtnText}>Registrieren</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Bereits ein Konto? </Text>
            <TouchableOpacity onPress={() => router.back()} disabled={loading}>
              <Text style={styles.loginLink}>Anmelden</Text>
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
    height: 300, borderBottomLeftRadius: 200, borderBottomRightRadius: 200,
  },
  scroll: { paddingHorizontal: 28, flexGrow: 1 },
  backBtn: { marginBottom: 28, alignSelf: 'flex-start' },
  backBtnInner: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surfaceBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  heading: { color: COLORS.text, fontSize: 30, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginBottom: 8 },
  subheading: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 32, lineHeight: 20 },
  fields: { gap: 12, marginBottom: 24 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.surfaceBorder,
    borderRadius: 18, height: 58, paddingHorizontal: 18,
  },
  fieldFocused: { borderColor: COLORS.primary },
  input: { flex: 1, color: COLORS.text, fontSize: 15, fontFamily: 'Inter_400Regular' },
  eyeBtn: { padding: 4 },
  registerBtn: { borderRadius: 18, overflow: 'hidden', marginBottom: 24 },
  registerBtnGradient: { height: 58, alignItems: 'center', justifyContent: 'center' },
  registerBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular' },
  loginLink: { color: COLORS.primary, fontSize: 14, fontFamily: 'Inter_700Bold' },
});
