import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getZodiacInfo, getElementColor, calculateAge } from '@/lib/zodiac';

export default function BirthdateScreen() {
  const insets = useSafeAreaInsets();
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const d = parseInt(day);
  const m = parseInt(month);
  const y = parseInt(year);

  const isValidDate =
    day.length >= 1 && month.length >= 1 && year.length === 4 &&
    d >= 1 && d <= 31 && m >= 1 && m <= 12 &&
    y >= 1920 && y <= new Date().getFullYear() - 16;

  const zodiacInfo = isValidDate ? getZodiacInfo(d, m) : null;
  const elementColor = zodiacInfo ? getElementColor(zodiacInfo.element) : COLORS.primary;

  const showZodiac = isValidDate && zodiacInfo;

  React.useEffect(() => {
    if (showZodiac) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);
    }
  }, [showZodiac]);

  const handleNext = async () => {
    if (!isValidDate || !zodiacInfo) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const birthdateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const age = calculateAge(birthdateStr);
    await AsyncStorage.setItem('onboarding_birthdate', birthdateStr);
    await AsyncStorage.setItem('onboarding_zodiac_sign', zodiacInfo.sign);
    await AsyncStorage.setItem('onboarding_age', String(age));
    router.push('/(onboarding)/gender');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color={COLORS.text} />
      </TouchableOpacity>
      <View style={styles.steps}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <View key={i} style={[styles.step, i === 1 && styles.stepActive]} />
        ))}
      </View>

      <Text style={styles.heading}>Dein Geburtstag</Text>
      <Text style={styles.subheading}>
        Damit ermitteln wir dein Sternzeichen und dein Alter.
      </Text>

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tag</Text>
          <TextInput
            style={styles.input}
            value={day}
            onChangeText={v => {
              const n = v.replace(/\D/g, '').slice(0, 2);
              setDay(n);
              if (n.length === 2) monthRef.current?.focus();
            }}
            keyboardType="number-pad"
            placeholder="TT"
            placeholderTextColor={COLORS.textDim}
            maxLength={2}
            returnKeyType="next"
            onSubmitEditing={() => monthRef.current?.focus()}
            selectionColor={COLORS.primary}
          />
        </View>
        <Text style={styles.separator}>/</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Monat</Text>
          <TextInput
            ref={monthRef}
            style={styles.input}
            value={month}
            onChangeText={v => {
              const n = v.replace(/\D/g, '').slice(0, 2);
              setMonth(n);
              if (n.length === 2) yearRef.current?.focus();
            }}
            keyboardType="number-pad"
            placeholder="MM"
            placeholderTextColor={COLORS.textDim}
            maxLength={2}
            returnKeyType="next"
            onSubmitEditing={() => yearRef.current?.focus()}
            selectionColor={COLORS.primary}
          />
        </View>
        <Text style={styles.separator}>/</Text>
        <View style={[styles.inputGroup, { flex: 1.5 }]}>
          <Text style={styles.inputLabel}>Jahr</Text>
          <TextInput
            ref={yearRef}
            style={styles.input}
            value={year}
            onChangeText={v => setYear(v.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            placeholder="JJJJ"
            placeholderTextColor={COLORS.textDim}
            maxLength={4}
            returnKeyType="done"
            selectionColor={COLORS.primary}
          />
        </View>
      </View>

      {showZodiac && zodiacInfo && (
        <Animated.View style={[styles.zodiacCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={[elementColor + '22', elementColor + '44']}
            style={styles.zodiacGradient}
          >
            <View style={styles.zodiacHeader}>
              <View style={[styles.zodiacIconBg, { backgroundColor: elementColor + '33' }]}>
                <Ionicons name="star" size={22} color={elementColor} />
              </View>
              <View style={styles.zodiacText}>
                <Text style={[styles.zodiacSign, { color: elementColor }]}>{zodiacInfo.sign}</Text>
                <Text style={styles.zodiacElement}>{zodiacInfo.element}-Zeichen</Text>
              </View>
              <View style={[styles.elementBadge, { backgroundColor: elementColor + '33' }]}>
                <Text style={[styles.elementBadgeText, { color: elementColor }]}>{zodiacInfo.element}</Text>
              </View>
            </View>
            <Text style={styles.zodiacDescription}>{zodiacInfo.description}</Text>
          </LinearGradient>
        </Animated.View>
      )}

      <View style={{ flex: 1 }} />

      <TouchableOpacity
        style={[styles.nextBtn, !isValidDate && styles.nextBtnDisabled]}
        onPress={handleNext}
        disabled={!isValidDate}
        activeOpacity={0.85}
      >
        <Text style={styles.nextBtnText}>Weiter</Text>
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
  subheading: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 32, lineHeight: 22 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  inputGroup: { flex: 1 },
  inputLabel: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.surfaceBorder,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    color: COLORS.text, fontSize: 20, fontFamily: 'Inter_600SemiBold', textAlign: 'center',
  },
  separator: { color: COLORS.textDim, fontSize: 24, fontFamily: 'Inter_300Light', paddingBottom: 12 },
  zodiacCard: { marginTop: 28, borderRadius: 20, overflow: 'hidden' },
  zodiacGradient: { padding: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  zodiacHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  zodiacIconBg: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  zodiacText: { flex: 1 },
  zodiacSign: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  zodiacElement: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  elementBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  elementBadgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  zodiacDescription: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  nextBtn: {
    backgroundColor: COLORS.primary, borderRadius: 18, height: 58,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: COLORS.white, fontSize: 17, fontFamily: 'Inter_600SemiBold' },
});
