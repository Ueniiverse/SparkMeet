import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NameAgeScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');

  const handleNext = async () => {
    if (!name.trim()) { Alert.alert('Fehler', 'Bitte deinen Namen eingeben.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem('onboarding_name', name.trim());
    router.push('/(onboarding)/birthdate');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color={COLORS.text} />
      </TouchableOpacity>

      <View style={styles.steps}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <View key={i} style={[styles.step, i === 0 && styles.stepActive]} />
        ))}
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>Wie heißt du?</Text>
        <Text style={styles.subheading}>Dein Vorname wird anderen angezeigt.</Text>

        <View style={styles.inputGroup}>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color={COLORS.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              placeholder="Vorname"
              placeholderTextColor={COLORS.textDim}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNext}
              selectionColor={COLORS.primary}
            />
          </View>
        </View>
      </View>

      <TouchableOpacity style={[styles.nextBtn, !name.trim() && styles.nextBtnDisabled]} onPress={handleNext} activeOpacity={0.85} disabled={!name.trim()}>
        <Text style={styles.nextBtnText}>Weiter</Text>
        <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 24 },
  backBtn: { marginBottom: 20, alignSelf: 'flex-start' },
  steps: { flexDirection: 'row', gap: 8, marginBottom: 40 },
  step: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceAlt },
  stepActive: { width: 24, backgroundColor: COLORS.primary },
  content: { flex: 1 },
  heading: { color: COLORS.text, fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 10 },
  subheading: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 36, lineHeight: 22 },
  inputGroup: { gap: 12 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surfaceBorder,
    borderRadius: 16, height: 56, paddingHorizontal: 16,
  },
  input: { flex: 1, color: COLORS.text, fontSize: 16, fontFamily: 'Inter_400Regular' },
  nextBtn: {
    backgroundColor: COLORS.primary, borderRadius: 18, height: 58,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: COLORS.white, fontSize: 17, fontFamily: 'Inter_600SemiBold' },
});
