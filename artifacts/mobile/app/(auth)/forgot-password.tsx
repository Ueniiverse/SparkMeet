import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email) { Alert.alert('Fehler', 'Bitte E-Mail eingeben.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) { Alert.alert('Fehler', error.message); return; }
    setSent(true);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.inner, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <Ionicons name="lock-open-outline" size={40} color={COLORS.primary} />
        </View>

        <Text style={styles.heading}>Passwort zurücksetzen</Text>
        <Text style={styles.subheading}>
          {sent
            ? 'Wir haben dir eine E-Mail mit dem Reset-Link gesendet.'
            : 'Gib deine E-Mail-Adresse ein und wir schicken dir einen Link.'}
        </Text>

        {!sent && (
          <>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="E-Mail"
                placeholderTextColor={COLORS.textDim}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.6 }]}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>{loading ? 'Senden...' : 'Link senden'}</Text>
            </TouchableOpacity>
          </>
        )}

        {sent && (
          <TouchableOpacity style={styles.button} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Zurück zum Login</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, paddingHorizontal: 24 },
  backBtn: { marginBottom: 32, alignSelf: 'flex-start' },
  iconContainer: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORS.primaryGlow, borderWidth: 1.5, borderColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24, alignSelf: 'center',
  },
  heading: { color: COLORS.text, fontSize: 26, fontFamily: 'Inter_700Bold', marginBottom: 10, textAlign: 'center' },
  subheading: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surfaceBorder,
    borderRadius: 16, height: 54, paddingHorizontal: 16, marginBottom: 16,
  },
  input: { flex: 1, color: COLORS.text, fontSize: 15, fontFamily: 'Inter_400Regular' },
  button: {
    backgroundColor: COLORS.primary, borderRadius: 16, height: 54,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
