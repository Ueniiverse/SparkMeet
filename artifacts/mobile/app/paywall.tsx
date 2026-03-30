import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';

const FEATURES = [
  { icon: 'calendar-outline', text: 'Unlimitierte Events joinen' },
  { icon: 'sparkles-outline', text: 'Events selbst erstellen' },
  { icon: 'heart-outline', text: 'Unbegrenzte Matches & Chat' },
  { icon: 'eye-outline', text: 'Sehen wer dich liked (vor Match)' },
  { icon: 'flash-outline', text: '1x Wöchentlicher Boost' },
  { icon: 'star-outline', text: 'Premium-Events Zugang' },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { refreshProfile } = useProfile();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500)); // Mock purchase delay
    try {
      if (!user) throw new Error('Not logged in');
      const proExpiresAt = new Date();
      if (selectedPlan === 'monthly') proExpiresAt.setMonth(proExpiresAt.getMonth() + 1);
      else proExpiresAt.setFullYear(proExpiresAt.getFullYear() + 1);
      await supabase.from('profiles').update({
        is_pro: true,
        pro_expires_at: proExpiresAt.toISOString(),
      }).eq('id', user.id);
      await refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Willkommen bei Pro!', 'Du hast SparkMeet Pro freigeschaltet.', [
        { text: 'Weiter', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Fehler', e?.message ?? 'Kauf fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = () => {
    Alert.alert('Käufe wiederherstellen', 'Keine Käufe gefunden. Bitte kontaktiere den Support.');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoRow}>
          <View style={styles.proIcon}>
            <Ionicons name="flash" size={36} color="#000" />
          </View>
        </View>
        <Text style={styles.headline}>SparkMeet Pro</Text>
        <Text style={styles.subheadline}>Keine Limits. Mehr Matches. Bessere Erlebnisse.</Text>

        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon as any} size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
              <Ionicons name="checkmark" size={16} color={COLORS.success} />
            </View>
          ))}
        </View>

        <View style={styles.plansRow}>
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
            onPress={() => { Haptics.selectionAsync(); setSelectedPlan('monthly'); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.planName, selectedPlan === 'monthly' && styles.planNameSelected]}>Monatlich</Text>
            <Text style={[styles.planPrice, selectedPlan === 'monthly' && styles.planPriceSelected]}>7,99 €</Text>
            <Text style={[styles.planPer, selectedPlan === 'monthly' && styles.planPerSelected]}>/Monat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.planCard, styles.planCardBest, selectedPlan === 'yearly' && styles.planCardSelected]}
            onPress={() => { Haptics.selectionAsync(); setSelectedPlan('yearly'); }}
            activeOpacity={0.8}
          >
            <View style={styles.bestBadge}>
              <Text style={styles.bestBadgeText}>BESTES ANGEBOT</Text>
            </View>
            <Text style={[styles.planName, selectedPlan === 'yearly' && styles.planNameSelected]}>Jährlich</Text>
            <Text style={[styles.planPrice, selectedPlan === 'yearly' && styles.planPriceSelected]}>49,99 €</Text>
            <Text style={[styles.planPer, selectedPlan === 'yearly' && styles.planPerSelected]}>/Jahr · 48% Ersparnis</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 16 }]}>
        <TouchableOpacity
          style={[styles.purchaseBtn, loading && { opacity: 0.6 }]}
          onPress={handlePurchase}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.purchaseBtnText}>
              Pro freischalten · {selectedPlan === 'monthly' ? '7,99 €/Mo' : '49,99 €/Jahr'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn}>
          <Text style={styles.restoreBtnText}>Käufe wiederherstellen</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Durch die Anmeldung stimmst du unseren Nutzungsbedingungen und Datenschutzrichtlinien zu.
          Das Abonnement verlängert sich automatisch.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  content: { paddingHorizontal: 24, paddingTop: 8 },
  logoRow: { alignItems: 'center', marginBottom: 16 },
  proIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center',
  },
  headline: { color: COLORS.text, fontSize: 32, fontFamily: 'Inter_700Bold', textAlign: 'center', marginBottom: 8 },
  subheadline: { color: COLORS.textMuted, fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  featureList: { gap: 12, marginBottom: 32 },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  featureIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.primaryGlow, alignItems: 'center', justifyContent: 'center',
  },
  featureText: { flex: 1, color: COLORS.text, fontSize: 14, fontFamily: 'Inter_400Regular' },
  plansRow: { flexDirection: 'row', gap: 12 },
  planCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 18, padding: 18, alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.surfaceBorder, position: 'relative',
  },
  planCardBest: { borderColor: COLORS.primary },
  planCardSelected: { borderColor: COLORS.gold, backgroundColor: COLORS.goldDim },
  bestBadge: {
    position: 'absolute', top: -10, alignSelf: 'center',
    backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  bestBadgeText: { color: COLORS.white, fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  planName: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 8, marginBottom: 6 },
  planNameSelected: { color: COLORS.text },
  planPrice: { color: COLORS.text, fontSize: 26, fontFamily: 'Inter_700Bold' },
  planPriceSelected: { color: COLORS.text },
  planPer: { color: COLORS.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4, textAlign: 'center' },
  planPerSelected: { color: COLORS.textMuted },
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.surfaceBorder,
    paddingTop: 16, paddingHorizontal: 24, gap: 12,
  },
  purchaseBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, height: 56,
    alignItems: 'center', justifyContent: 'center',
  },
  purchaseBtnText: { color: COLORS.white, fontSize: 16, fontFamily: 'Inter_700Bold' },
  restoreBtn: { alignItems: 'center' },
  restoreBtnText: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular' },
  legal: { color: COLORS.textDim, fontSize: 10, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 16 },
});
