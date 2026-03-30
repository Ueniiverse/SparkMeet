import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Match } from '@/lib/types';
import { COLORS } from '@/constants/colors';
import { MatchRowSkeleton } from '@/components/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: matches, isLoading } = useQuery<Match[]>({
    queryKey: ['matches', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });
      if (error) throw error;

      const enriched: Match[] = await Promise.all((data ?? []).map(async (m) => {
        const otherId = m.user_id_1 === user.id ? m.user_id_2 : m.user_id_1;
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', otherId).single();
        const { count } = await supabase.from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('match_id', m.id).eq('is_read', false).neq('sender_id', user.id);
        return { ...m, other_profile: profile ?? undefined, unread_count: count ?? 0 };
      }));
      return enriched;
    },
    enabled: !!user,
  });

  const formatTime = (ts: string | null) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Jetzt';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  };

  const topOffset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const unreadTotal = matches?.reduce((acc, m) => acc + (m.unread_count ?? 0), 0) ?? 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topOffset + 8 }]}>
        <View>
          <Text style={styles.headerTitle}>Matches</Text>
          {unreadTotal > 0 && (
            <Text style={styles.headerSub}>{unreadTotal} neue Nachricht{unreadTotal !== 1 ? 'en' : ''}</Text>
          )}
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="heart" size={16} color={COLORS.primary} />
          <Text style={styles.headerBadgeText}>{matches?.length ?? 0}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ paddingTop: 8 }}>
          {[1, 2, 3].map(i => <MatchRowSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const profile = item.other_profile;
            const photo = profile?.profile_images?.[0];
            const hasUnread = (item.unread_count ?? 0) > 0;
            const isNew = !item.last_message;
            return (
              <TouchableOpacity
                style={[styles.matchRow, hasUnread && styles.matchRowUnread]}
                onPress={() => router.push(`/chat/${item.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.avatarContainer}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.avatar} />
                  ) : (
                    <LinearGradient
                      colors={[COLORS.primaryGlow, COLORS.surfaceAlt]}
                      style={styles.avatar}
                    >
                      <Ionicons name="person" size={24} color={COLORS.textMuted} />
                    </LinearGradient>
                  )}
                  {hasUnread && (
                    <View style={styles.unreadDot}>
                      <Text style={styles.unreadDotText}>{item.unread_count}</Text>
                    </View>
                  )}
                  {isNew && !hasUnread && (
                    <View style={styles.newDot} />
                  )}
                </View>

                <View style={styles.matchInfo}>
                  <View style={styles.matchTop}>
                    <View style={styles.matchNameRow}>
                      <Text style={styles.matchName}>{profile?.display_name ?? 'Unbekannt'}</Text>
                      {profile?.age && (
                        <Text style={styles.matchAge}>{profile.age}</Text>
                      )}
                    </View>
                    <Text style={styles.matchTime}>{formatTime(item.last_message_at)}</Text>
                  </View>
                  <Text
                    style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
                    numberOfLines={1}
                  >
                    {isNew
                      ? 'Ihr habt euch gegenseitig geliked!'
                      : (item.last_message ?? '')}
                  </Text>
                  {isNew && (
                    <View style={styles.newMatchChip}>
                      <Ionicons name="sparkles" size={10} color={COLORS.primary} />
                      <Text style={styles.newMatchChipText}>Neues Match</Text>
                    </View>
                  )}
                </View>

                <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 88,
            paddingTop: 4,
          }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <LinearGradient
                colors={[COLORS.primaryGlow, 'transparent']}
                style={styles.emptyIconBg}
              >
                <Ionicons name="heart-outline" size={36} color={COLORS.primary} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>Noch keine Matches</Text>
              <Text style={styles.emptyText}>
                Nimm an Events teil, like andere Teilnehmer und warte auf ein gegenseitiges Match.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(tabs)')}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyBtnText}>Events entdecken</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  headerTitle: { color: COLORS.text, fontSize: 23, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  headerSub: { color: COLORS.primary, fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 3 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primaryGlow, borderWidth: 1, borderColor: COLORS.primary,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4,
  },
  headerBadgeText: { color: COLORS.primary, fontSize: 13, fontFamily: 'Inter_700Bold' },
  matchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 14,
  },
  matchRowUnread: { backgroundColor: 'rgba(124,111,255,0.04)' },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 58, height: 58, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute', top: -3, right: -3,
    backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 2.5, borderColor: COLORS.background,
  },
  unreadDotText: { color: COLORS.white, fontSize: 11, fontFamily: 'Inter_700Bold' },
  newDot: {
    position: 'absolute', top: -2, right: -2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2, borderColor: COLORS.background,
  },
  matchInfo: { flex: 1 },
  matchTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  matchNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  matchName: { color: COLORS.text, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  matchAge: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular' },
  matchTime: { color: COLORS.textDim, fontSize: 12, fontFamily: 'Inter_400Regular' },
  lastMessage: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  lastMessageUnread: { color: COLORS.text, fontFamily: 'Inter_500Medium' },
  newMatchChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primaryGlow, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start',
  },
  newMatchChipText: { color: COLORS.primary, fontSize: 11, fontFamily: 'Inter_500Medium' },
  separator: { height: 1, backgroundColor: COLORS.surfaceBorder, marginLeft: 92 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIconBg: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { color: COLORS.text, fontSize: 17, fontFamily: 'Inter_600SemiBold', marginBottom: 10 },
  emptyText: {
    color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular',
    textAlign: 'center', lineHeight: 22, marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyBtnText: { color: COLORS.white, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
