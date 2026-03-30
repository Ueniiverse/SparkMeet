import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(onboarding)/name-age');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 30 }]}>
      <View style={styles.content}>
        <View style={styles.logoRing}>
          <Ionicons name="flash" size={52} color={COLORS.primary} />
        </View>
        <Text style={styles.appName}>SparkMeet</Text>
        <Text style={styles.tagline}>Dating durch echte Erlebnisse</Text>

        <View style={styles.features}>
          {[
            { icon: 'calendar-outline', text: 'Joinen lokale Events' },
            { icon: 'people-outline', text: 'Treffe 4-8 Singles' },
            { icon: 'heart-outline', text: 'Matche anonym danach' },
            { icon: 'chatbubbles-outline', text: 'Chatte mit Matches' },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon as any} size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.steps}>
          {[0, 1, 2, 3, 4].map(i => (
            <View key={i} style={[styles.step, i === 0 && styles.stepActive]} />
          ))}
        </View>
        <TouchableOpacity style={styles.button} onPress={handleStart} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Los geht's</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 28 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoRing: {
    width: 110, height: 110, borderRadius: 30,
    backgroundColor: COLORS.primaryGlow, borderWidth: 2, borderColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  appName: { color: COLORS.text, fontSize: 36, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  tagline: { color: COLORS.textMuted, fontSize: 15, fontFamily: 'Inter_400Regular', marginBottom: 48 },
  features: { gap: 16, width: '100%' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.primaryGlow, alignItems: 'center', justifyContent: 'center',
  },
  featureText: { color: COLORS.text, fontSize: 15, fontFamily: 'Inter_500Medium' },
  bottom: { gap: 20 },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  step: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceAlt },
  stepActive: { width: 24, backgroundColor: COLORS.primary },
  button: {
    backgroundColor: COLORS.primary, borderRadius: 18, height: 58,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  buttonText: { color: COLORS.white, fontSize: 17, fontFamily: 'Inter_600SemiBold' },
});
