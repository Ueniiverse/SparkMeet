import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { CATEGORIES, IoniconsName } from '@/lib/types';
import { getZodiacColorBySign } from '@/lib/zodiac';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { signOut, user } = useAuth();
  const { profile, isPro } = useProfile();
  const [deleting, setDeleting] = useState(false);

  const { data: matchCount = 0 } = useQuery<number>({
    queryKey: ['match-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase.from('matches').select('*', { count: 'exact', head: true })
        .or(`user_id_1.eq.${user!.id},user_id_2.eq.${user!.id}`);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: streak = 0 } = useQuery<number>({
    queryKey: ['streak', user?.id, profile?.events_joined],
    queryFn: async () => {
      const joined = profile?.events_joined ?? [];
      if (joined.length === 0) return 0;
      const { data } = await supabase
        .from('events').select('event_date').in('id', joined)
        .lte('event_date', new Date().toISOString()).order('event_date', { ascending: false });
      if (!data || data.length === 0) return 0;
      const weekKey = (d: Date) => {
        const epoch = new Date(d.getFullYear(), 0, 1);
        return `${d.getFullYear()}-${Math.floor((d.getTime() - epoch.getTime()) / 6048e5)}`;
      };
      const weeks = new Set(data.map(e => weekKey(new Date(e.event_date))));
      let count = 0;
      const cursor = new Date();
      while (weeks.has(weekKey(cursor))) { count++; cursor.setDate(cursor.getDate() - 7); }
      return count;
    },
    enabled: !!user && (profile?.events_joined?.length ?? 0) > 0,
  });

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Abmelden', 'Möchtest du dich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abmelden', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Konto löschen',
      'Dein Profil, alle Matches und Nachrichten werden unwiderruflich gelöscht.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Weiter',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Wirklich löschen?',
              'Diese Aktion kann nicht rückgängig gemacht werden.',
              [
                { text: 'Abbrechen', style: 'cancel' },
                {
                  text: 'Konto löschen',
                  style: 'destructive',
                  onPress: confirmDeleteAccount,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Keine Sitzung');

      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const url = domain ? `https://${domain}/api/account` : '/api/account';

      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const json = await res.json() as { success?: boolean; error?: string };

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Unbekannter Fehler');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await signOut();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
      Alert.alert('Fehler', `Konto konnte nicht gelöscht werden: ${msg}`);
    } finally {
      setDeleting(false);
    }
  };

  const mainPhoto = profile?.profile_images?.[0];
  const eventsJoined = profile?.events_joined?.length ?? 0;
  const topOffset = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const stats: { label: string; value: string | number; icon: IoniconsName; color: string }[] = [
    { label: 'Events', value: eventsJoined, icon: 'calendar', color: COLORS.primary },
    { label: 'Matches', value: matchCount, icon: 'heart', color: '#FF6B8A' },
    { label: 'Streak', value: streak > 0 ? `${streak}W` : '—', icon: 'flame', color: COLORS.gold },
  ];

  const zodiacColor = profile?.zodiac_sign
    ? getZodiacColorBySign(profile.zodiac_sign)
    : COLORS.primary;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topOffset + 8, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 88 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mein Profil</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/edit-profile')}>
          <Ionicons name="create-outline" size={18} color={COLORS.text} />
          <Text style={styles.editBtnText}>Bearbeiten</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        <LinearGradient
          colors={['rgba(124,111,255,0.18)', 'rgba(124,111,255,0.04)', 'transparent']}
          style={styles.profileCardGradient}
        />
        <View style={styles.photoWrapper}>
          {mainPhoto ? (
            <Image source={{ uri: mainPhoto }} style={styles.photo} />
          ) : (
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.photo}>
              <Ionicons name="person" size={44} color={COLORS.white} />
            </LinearGradient>
          )}
          {isPro && (
            <View style={styles.proBadge}>
              <Ionicons name="flash" size={10} color="#000" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>
          {profile?.display_name ?? 'Name'}{profile?.age ? `, ${profile.age}` : ''}
        </Text>

        <View style={styles.metaRow}>
          {profile?.city && (
            <View style={styles.metaChip}>
              <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
              <Text style={styles.metaChipText}>{profile.city}</Text>
            </View>
          )}
          {profile?.zodiac_sign && (
            <View style={[styles.metaChip, { borderColor: zodiacColor + '44', backgroundColor: zodiacColor + '18' }]}>
              <Ionicons name="star" size={12} color={zodiacColor} />
              <Text style={[styles.metaChipText, { color: zodiacColor }]}>{profile.zodiac_sign}</Text>
            </View>
          )}
          {profile?.occupation && (
            <View style={styles.metaChip}>
              <Ionicons name="briefcase-outline" size={12} color={COLORS.textMuted} />
              <Text style={styles.metaChipText}>{profile.occupation}</Text>
            </View>
          )}
          {profile?.height_cm && (
            <View style={styles.metaChip}>
              <Ionicons name="resize-outline" size={12} color={COLORS.textMuted} />
              <Text style={styles.metaChipText}>{profile.height_cm} cm</Text>
            </View>
          )}
        </View>

        {profile?.bio && (
          <Text style={styles.bio} numberOfLines={3}>{profile.bio}</Text>
        )}
      </View>

      <View style={styles.statsRow}>
        {stats.map((s, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: s.color + '22' }]}>
              <Ionicons name={s.icon} size={16} color={s.color} />
            </View>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {profile?.personality_summary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Persönlichkeit</Text>
          <LinearGradient colors={['#7C6FFF18', '#7C6FFF28']} style={styles.personalityCard}>
            <View style={styles.personalityHeader}>
              <View style={styles.personalityIconWrap}>
                <Ionicons name="sparkles" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.personalityLabel}>KI-Persönlichkeitsanalyse</Text>
            </View>
            <Text style={styles.personalityText}>"{profile.personality_summary}"</Text>
          </LinearGradient>
        </View>
      )}

      {profile?.interests && profile.interests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interessen</Text>
          <View style={styles.chips}>
            {profile.interests.map((interest, i) => {
              const cat = CATEGORIES.find(c => c.key === interest);
              return (
                <View key={i} style={styles.interestChip}>
                  {cat && <Ionicons name={cat.icon} size={13} color={COLORS.primary} />}
                  <Text style={styles.interestChipText}>{interest}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {!isPro && (
        <TouchableOpacity
          style={styles.proCard}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/paywall'); }}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.proCardGradient}
          >
            <View style={styles.proCardLeft}>
              <View style={styles.proIconWrap}>
                <Ionicons name="flash" size={22} color="#000" />
              </View>
              <View>
                <Text style={styles.proCardTitle}>SparkMeet Pro</Text>
                <Text style={styles.proCardSub}>Unbegrenzte Events, Matches & mehr</Text>
              </View>
            </View>
            <View style={styles.proCardArrow}>
              <Ionicons name="chevron-forward" size={16} color="rgba(0,0,0,0.6)" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      <View style={styles.menuSection}>
        {(
          [
            { icon: 'create-outline' as IoniconsName, label: 'Profil bearbeiten', action: () => router.push('/edit-profile'), color: COLORS.text },
            { icon: 'shield-checkmark-outline' as IoniconsName, label: 'Datenschutz', action: () => {}, color: COLORS.text },
            { icon: 'help-circle-outline' as IoniconsName, label: 'Hilfe & Support', action: () => {}, color: COLORS.text },
          ] as { icon: IoniconsName; label: string; action: () => void; color: string }[]
        ).map((item, i, arr) => (
          <React.Fragment key={i}>
            <TouchableOpacity style={styles.menuItem} onPress={item.action} activeOpacity={0.75}>
              <View style={[styles.menuIconWrap, { backgroundColor: COLORS.surfaceAlt }]}>
                <Ionicons name={item.icon} size={17} color={item.color} />
              </View>
              <Text style={[styles.menuItemText, { color: item.color }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={15} color={COLORS.textDim} />
            </TouchableOpacity>
            {i < arr.length - 1 && <View style={styles.menuDivider} />}
          </React.Fragment>
        ))}
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
        <Text style={styles.signOutText}>Abmelden</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.deleteBtn, deleting && { opacity: 0.5 }]}
        onPress={handleDeleteAccount}
        disabled={deleting}
        activeOpacity={0.8}
      >
        {deleting ? (
          <ActivityIndicator size="small" color={COLORS.textDim} />
        ) : (
          <Ionicons name="trash-outline" size={16} color={COLORS.textDim} />
        )}
        <Text style={styles.deleteBtnText}>
          {deleting ? 'Wird gelöscht...' : 'Konto löschen'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { color: COLORS.text, fontSize: 23, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surfaceBorder,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  editBtnText: { color: COLORS.text, fontSize: 13, fontFamily: 'Inter_500Medium' },
  profileCard: {
    backgroundColor: COLORS.surface, borderRadius: 24,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
    alignItems: 'center', padding: 24, marginBottom: 16,
    overflow: 'hidden', position: 'relative',
  },
  profileCardGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  photoWrapper: { position: 'relative', marginBottom: 14 },
  photo: {
    width: 104, height: 104, borderRadius: 30,
    borderWidth: 3, borderColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  proBadge: {
    position: 'absolute', bottom: -5, right: -5,
    backgroundColor: COLORS.gold, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 3,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 2, borderColor: COLORS.background,
  },
  proBadgeText: { color: '#000', fontSize: 9, fontFamily: 'Inter_700Bold' },
  name: { color: COLORS.text, fontSize: 22, fontFamily: 'Inter_700Bold', marginBottom: 10 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 12 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  metaChipText: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' },
  bio: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
    alignItems: 'center', paddingVertical: 16, gap: 4,
  },
  statIconWrap: {
    width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  statValue: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' },
  section: { marginBottom: 20 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' },
  personalityCard: {
    padding: 16, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(124,111,255,0.25)',
  },
  personalityHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  personalityIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(124,111,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  personalityLabel: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'Inter_500Medium' },
  personalityText: { color: COLORS.text, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22, fontStyle: 'italic' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: COLORS.primaryGlow, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(124,111,255,0.3)',
  },
  interestChipText: { color: COLORS.primary, fontSize: 13, fontFamily: 'Inter_500Medium' },
  proCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  proCardGradient: { padding: 1, borderRadius: 20 },
  proCardLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'transparent', padding: 15,
  },
  proIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  proCardTitle: { color: '#000', fontSize: 15, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  proCardSub: { color: 'rgba(0,0,0,0.65)', fontSize: 12, fontFamily: 'Inter_400Regular' },
  proCardArrow: { position: 'absolute', right: 16, top: '50%' },
  menuSection: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
    overflow: 'hidden', marginBottom: 16,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  menuIconWrap: {
    width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  menuItemText: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  menuDivider: { height: 1, backgroundColor: COLORS.surfaceBorder, marginLeft: 62 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.errorDim, borderWidth: 1, borderColor: COLORS.error + '33',
    borderRadius: 16, padding: 14,
  },
  signOutText: { color: COLORS.error, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, marginBottom: 8, padding: 12,
  },
  deleteBtnText: { color: COLORS.textDim, fontSize: 13, fontFamily: 'Inter_400Regular' },
});
