import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIES } from '@/lib/types';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function InterestsScreen() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (key: string) => {
    Haptics.selectionAsync();
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleNext = async () => {
    if (selected.length === 0) { Alert.alert('Fehler', 'Wähle mindestens ein Interesse aus.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem('onboarding_interests', JSON.stringify(selected));
    router.push('/(onboarding)/photos');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color={COLORS.text} />
      </TouchableOpacity>
      <View style={styles.steps}>
        {[0, 1, 2, 3, 4].map(i => (
          <View key={i} style={[styles.step, i === 3 && styles.stepActive]} />
        ))}
      </View>

      <Text style={styles.heading}>Deine Interessen</Text>
      <Text style={styles.subheading}>Wähle die Events, die dich begeistern.</Text>

      <View style={styles.grid}>
        {CATEGORIES.map(cat => {
          const isSelected = selected.includes(cat.key);
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggle(cat.key)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                <Ionicons name={cat.icon} size={22} color={isSelected ? COLORS.primary : COLORS.textMuted} />
              </View>
              <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>{cat.label}</Text>
              {isSelected && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={10} color={COLORS.white} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
        <Text style={styles.nextBtnText}>Weiter ({selected.length})</Text>
        <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 24 },
  backBtn: { marginBottom: 20, alignSelf: 'flex-start' },
  steps: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  step: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceAlt },
  stepActive: { width: 24, backgroundColor: COLORS.primary },
  heading: { color: COLORS.text, fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  subheading: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 28 },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignContent: 'flex-start' },
  chip: {
    width: '47%', backgroundColor: COLORS.surface,
    borderWidth: 1.5, borderColor: COLORS.surfaceBorder,
    borderRadius: 16, padding: 16, alignItems: 'center',
    position: 'relative',
  },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  iconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  iconWrapSelected: { backgroundColor: 'rgba(124, 111, 255, 0.15)' },
  chipLabel: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_500Medium' },
  chipLabelSelected: { color: COLORS.primary },
  checkBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  nextBtn: {
    backgroundColor: COLORS.primary, borderRadius: 18, height: 58,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16,
  },
  nextBtnText: { color: COLORS.white, fontSize: 17, fontFamily: 'Inter_600SemiBold' },
});
