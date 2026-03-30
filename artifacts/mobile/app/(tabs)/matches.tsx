import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Match, Profile, Event } from '@/lib/types';
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

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
        <Text style={styles.headerTitle}>Matches</Text>
      </View>

      {isLoading ? (
        <View>{[1, 2, 3].map(i => <MatchRowSkeleton key={i} />)}</View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const profile = item.other_profile;
            const photo = profile?.profile_images?.[0];
            return (
              <TouchableOpacity
                style={styles.matchRow}
                onPress={() => router.push(`/chat/${item.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.avatarContainer}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Ionicons name="person" size={24} color={COLORS.textMuted} />
                    </View>
                  )}
                  {(item.unread_count ?? 0) > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{item.unread_count}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.matchInfo}>
                  <View style={styles.matchTop}>
                    <Text style={styles.matchName}>{profile?.display_name ?? 'Unbekannt'}</Text>
                    <Text style={styles.matchTime}>{formatTime(item.last_message_at)}</Text>
                  </View>
                  <Text
                    style={[styles.lastMessage, (item.unread_count ?? 0) > 0 && styles.lastMessageUnread]}
                    numberOfLines={1}
                  >
                    {item.last_message ?? 'Ihr habt euch gegenseitig geliked!'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 80 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="heart-outline" size={40} color={COLORS.textDim} />
              </View>
              <Text style={styles.emptyTitle}>Noch keine Matches</Text>
              <Text style={styles.emptyText}>
                Nimm an Events teil, like andere Teilnehmer und warte auf ein gegenseitiges Match.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { color: COLORS.text, fontSize: 22, fontFamily: 'Inter_700Bold' },
  matchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  unreadBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: COLORS.background,
  },
  unreadBadgeText: { color: COLORS.white, fontSize: 11, fontFamily: 'Inter_700Bold' },
  matchInfo: { flex: 1 },
  matchTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  matchName: { color: COLORS.text, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  matchTime: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' },
  lastMessage: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular' },
  lastMessageUnread: { color: COLORS.text, fontFamily: 'Inter_500Medium' },
  separator: { height: 1, backgroundColor: COLORS.surfaceBorder, marginLeft: 90 },
  emptyState: { alignItems: 'center', paddingTop: 100, paddingHorizontal: 40 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontFamily: 'Inter_600SemiBold', marginBottom: 10 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
});
