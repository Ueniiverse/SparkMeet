import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { signOut, user } = useAuth();
  const { profile, isPro } = useProfile();

  const { data: matchCount = 0 } = useQuery<number>({
    queryKey: ['match-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase.from('matches').select('*', { count: 'exact', head: true })
        .or(`user_id_1.eq.${user!.id},user_id_2.eq.${user!.id}`);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await signOut();
  };

  const mainPhoto = profile?.profile_images?.[0];
  const eventsJoined = profile?.events_joined?.length ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0), paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 80 }
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/edit-profile')}
        >
          <Ionicons name="settings-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.photoContainer}>
          {mainPhoto ? (
            <Image source={{ uri: mainPhoto }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Ionicons name="person" size={48} color={COLORS.textMuted} />
            </View>
          )}
          {isPro && (
            <View style={styles.proBadge}>
              <Ionicons name="flash" size={12} color="#000" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>{profile?.display_name ?? 'Name'}{profile?.age ? `, ${profile.age}` : ''}</Text>
        {profile?.city && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.locationText}>{profile.city}</Text>
          </View>
        )}
        {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
      </View>

      <View style={styles.statsRow}>
        {[
          { label: 'Events', value: eventsJoined },
          { label: 'Matches', value: matchCount },
          { label: 'Streak', value: '—' },
        ].map((stat, i) => (
          <View key={i} style={styles.statBox}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {profile?.interests && profile.interests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interessen</Text>
          <View style={styles.interestChips}>
            {profile.interests.map((interest, i) => (
              <View key={i} style={styles.interestChip}>
                <Text style={styles.interestChipText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {!isPro && (
        <TouchableOpacity
          style={styles.proCard}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/paywall'); }}
          activeOpacity={0.85}
        >
          <View style={styles.proCardIcon}>
            <Ionicons name="flash" size={22} color="#000" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.proCardTitle}>SparkMeet Pro</Text>
            <Text style={styles.proCardSub}>Unbegrenzte Events, Matches & mehr</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#000" />
        </TouchableOpacity>
      )}

      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/edit-profile')} activeOpacity={0.8}>
          <Ionicons name="create-outline" size={20} color={COLORS.text} />
          <Text style={styles.menuItemText}>Profil bearbeiten</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity style={styles.menuItem} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={[styles.menuItemText, { color: COLORS.error }]}>Abmelden</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  headerTitle: { color: COLORS.text, fontSize: 22, fontFamily: 'Inter_700Bold' },
  settingsBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
  },
  profileSection: { alignItems: 'center', marginBottom: 28 },
  photoContainer: { position: 'relative', marginBottom: 16 },
  photo: { width: 100, height: 100, borderRadius: 30, borderWidth: 3, borderColor: COLORS.primary },
  photoPlaceholder: { backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  proBadge: {
    position: 'absolute', bottom: -6, right: -6,
    backgroundColor: COLORS.gold, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 2, borderColor: COLORS.background,
  },
  proBadgeText: { color: '#000', fontSize: 10, fontFamily: 'Inter_700Bold' },
  name: { color: COLORS.text, fontSize: 24, fontFamily: 'Inter_700Bold', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  locationText: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular' },
  bio: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  statsRow: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: 18, padding: 20, marginBottom: 24, gap: 0,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { color: COLORS.text, fontSize: 24, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  statLabel: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' },
  section: { marginBottom: 24 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 12 },
  interestChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: COLORS.primaryGlow, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.primary,
  },
  interestChipText: { color: COLORS.primary, fontSize: 13, fontFamily: 'Inter_500Medium' },
  proCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.gold, borderRadius: 18, padding: 16, marginBottom: 24,
  },
  proCardIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  proCardTitle: { color: '#000', fontSize: 15, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  proCardSub: { color: 'rgba(0,0,0,0.6)', fontSize: 12, fontFamily: 'Inter_400Regular' },
  menuSection: {
    backgroundColor: COLORS.surface, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  menuItemText: { flex: 1, color: COLORS.text, fontSize: 15, fontFamily: 'Inter_400Regular' },
  menuDivider: { height: 1, backgroundColor: COLORS.surfaceBorder, marginHorizontal: 16 },
});
