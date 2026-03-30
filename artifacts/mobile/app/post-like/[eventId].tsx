import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { Event, Profile } from '@/lib/types';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';

export default function PostLikeScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  useProfile();
  const queryClient = useQueryClient();
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const { data: event } = useQuery<Event>({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const { data } = await supabase.from('events').select('*').eq('id', eventId).single();
      return data!;
    },
  });

  const { data: participants, isLoading } = useQuery<Profile[]>({
    queryKey: ['event-participants', eventId],
    queryFn: async () => {
      if (!event) return [];
      const otherIds = event.current_participants.filter(id => id !== user?.id);
      if (otherIds.length === 0) return [];
      const { data } = await supabase.from('profiles').select('*').in('id', otherIds);
      return data ?? [];
    },
    enabled: !!event,
  });

  const toggleLike = (profileId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLikedIds(prev =>
      prev.includes(profileId) ? prev.filter(id => id !== profileId) : [...prev, profileId]
    );
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user || !eventId) return;
      const inserts = likedIds.map(toId => ({
        event_id: eventId,
        from_user_id: user.id,
        to_user_id: toId,
      }));
      if (inserts.length > 0) {
        await supabase.from('event_likes').upsert(inserts, { onConflict: 'event_id,from_user_id,to_user_id' });
      }
      // Create matches via SECURITY DEFINER RPC (enforces mutual like + free-tier cap)
      for (const toId of likedIds) {
        const { error: matchError } = await supabase.rpc('create_match', {
          p_event_id: eventId,
          p_other_user_id: toId,
        });
        if (matchError) {
          if (matchError.message.includes('FREE_LIMIT_MATCHES')) {
            router.push('/paywall');
            return;
          }
          // NO_MUTUAL_LIKE is expected when the other user hasn't liked back yet — ignore
          if (!matchError.message.includes('NO_MUTUAL_LIKE')) {
            throw matchError;
          }
        }
      }
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
    onError: (err: Error) => Alert.alert('Fehler', err.message),
  });

  if (submitted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 30 }]}>
        <View style={styles.successState}>
          <View style={styles.successIcon}>
            <Ionicons name="heart" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.successTitle}>Likes gesendet!</Text>
          <Text style={styles.successText}>
            {likedIds.length > 0
              ? `Du hast ${likedIds.length} Person${likedIds.length !== 1 ? 'en' : ''} geliked. Mutual Matches erscheinen in deinen Matches.`
              : 'Du hast niemanden geliked.'}
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)/matches')} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Zu den Matches</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Wen mochtest du?</Text>
          <Text style={styles.headerSub}>{event?.title}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.hint}>Tippe auf eine Person um sie zu liken. Nur bei gegenseitigem Like gibt es ein Match.</Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {(participants ?? []).map(p => {
            const liked = likedIds.includes(p.id);
            const photo = p.profile_images?.[0];
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.participantCard, liked && styles.participantCardLiked]}
                onPress={() => toggleLike(p.id)}
                activeOpacity={0.8}
              >
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.participantPhoto} />
                ) : (
                  <View style={[styles.participantPhoto, styles.participantPhotoPlaceholder]}>
                    <Ionicons name="person" size={28} color={COLORS.textMuted} />
                  </View>
                )}
                {liked && (
                  <View style={styles.likedOverlay}>
                    <Ionicons name="heart" size={32} color={COLORS.primary} />
                  </View>
                )}
                <Text style={styles.participantName}>{p.display_name}{p.age ? `, ${p.age}` : ''}</Text>
              </TouchableOpacity>
            );
          })}
          {(participants ?? []).length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color={COLORS.textDim} />
              <Text style={styles.emptyText}>Keine anderen Teilnehmer</Text>
            </View>
          )}
        </ScrollView>
      )}

      <View style={[styles.bottom, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 12 }]}>
        <TouchableOpacity
          style={[styles.submitBtn, submitMutation.isPending && { opacity: 0.6 }]}
          onPress={() => submitMutation.mutate()}
          disabled={submitMutation.isPending}
          activeOpacity={0.85}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitBtnText}>
              Weiter {likedIds.length > 0 ? `(${likedIds.length})` : ''}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  headerTitle: { color: COLORS.text, fontSize: 18, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  headerSub: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  hint: {
    color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular',
    paddingHorizontal: 20, marginBottom: 16, lineHeight: 20,
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  participantCard: {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: 18,
    overflow: 'hidden', borderWidth: 1.5, borderColor: COLORS.surfaceBorder,
  },
  participantCardLiked: { borderColor: COLORS.primary },
  participantPhoto: { width: '100%', aspectRatio: 4 / 5 },
  participantPhotoPlaceholder: { backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  likedOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(124, 111, 255, 0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  participantName: {
    color: COLORS.text, fontSize: 13, fontFamily: 'Inter_600SemiBold',
    paddingHorizontal: 10, paddingVertical: 10,
  },
  emptyState: { width: '100%', alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 15, fontFamily: 'Inter_400Regular' },
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.surfaceBorder,
    paddingTop: 14, paddingHorizontal: 20,
  },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, height: 54,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  successState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  successIcon: {
    width: 100, height: 100, borderRadius: 30,
    backgroundColor: COLORS.primaryGlow, alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  successTitle: { color: COLORS.text, fontSize: 26, fontFamily: 'Inter_700Bold', marginBottom: 12 },
  successText: { color: COLORS.textMuted, fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  doneBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, height: 54,
    alignItems: 'center', justifyContent: 'center', width: '100%',
  },
  doneBtnText: { color: COLORS.white, fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
