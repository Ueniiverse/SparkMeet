import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GENDERS = ['Mann', 'Frau', 'Non-binär', 'Sonstiges'];
const LOOKING_FOR = ['Frauen', 'Männer', 'Alle'];

export default function GenderScreen() {
  const insets = useSafeAreaInsets();
  const [gender, setGender] = useState('');
  const [lookingFor, setLookingFor] = useState('');

  const handleNext = async () => {
    if (!gender) { Alert.alert('Fehler', 'Bitte dein Geschlecht auswählen.'); return; }
    if (!lookingFor) { Alert.alert('Fehler', 'Bitte auswählen, wen du suchst.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem('onboarding_gender', gender);
    await AsyncStorage.setItem('onboarding_looking_for', lookingFor);
    router.push('/(onboarding)/interests');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color={COLORS.text} />
      </TouchableOpacity>
      <View style={styles.steps}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <View key={i} style={[styles.step, i === 2 && styles.stepActive]} />
        ))}
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>Ich bin...</Text>
        <View style={styles.optionsGrid}>
          {GENDERS.map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.option, gender === g && styles.optionSelected]}
              onPress={() => { Haptics.selectionAsync(); setGender(g); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionText, gender === g && styles.optionTextSelected]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.heading2}>Ich suche...</Text>
        <View style={styles.optionsRow}>
          {LOOKING_FOR.map(l => (
            <TouchableOpacity
              key={l}
              style={[styles.option, styles.optionFlex, lookingFor === l && styles.optionSelected]}
              onPress={() => { Haptics.selectionAsync(); setLookingFor(l); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionText, lookingFor === l && styles.optionTextSelected]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
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
  heading: { color: COLORS.text, fontSize: 24, fontFamily: 'Inter_700Bold', marginBottom: 20 },
  heading2: { color: COLORS.text, fontSize: 24, fontFamily: 'Inter_700Bold', marginTop: 32, marginBottom: 20 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionsRow: { flexDirection: 'row', gap: 10 },
  option: {
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.surfaceBorder,
    borderRadius: 14,
  },
  optionFlex: { flex: 1, alignItems: 'center' },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  optionText: { color: COLORS.textMuted, fontSize: 15, fontFamily: 'Inter_500Medium' },
  optionTextSelected: { color: COLORS.primary },
  nextBtn: {
    backgroundColor: COLORS.primary, borderRadius: 18, height: 58,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  nextBtnText: { color: COLORS.white, fontSize: 17, fontFamily: 'Inter_600SemiBold' },
});
