import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  Alert, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { Event } from '@/lib/types';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile, canJoinEvent, refreshProfile } = useProfile();
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: ['event', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
  });

  const isJoined = event?.current_participants?.includes(user?.id ?? '') ?? false;
  const spotsLeft = event ? event.max_participants - (event.current_participants?.length ?? 0) : 0;
  const isFull = spotsLeft <= 0 && !isJoined;
  const isPast = event ? new Date(event.event_date) < new Date(Date.now() - 30 * 60 * 1000) : false;
  const isCompleted = event?.status === 'completed' || (isPast && event?.status !== 'cancelled');

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!user || !event) return;
      if (!canJoinEvent && !isJoined) {
        router.push('/paywall');
        throw new Error('Limit reached');
      }
      if (event.is_premium_only && !profile?.is_pro && !isJoined) {
        router.push('/paywall');
        throw new Error('Premium Only');
      }
      if (isJoined) {
        const { error } = await supabase.rpc('leave_event', { p_event_id: event.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('join_event', { p_event_id: event.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      refreshProfile();
    },
    onError: (err: Error) => {
      if (err.message !== 'Limit reached' && err.message !== 'Premium Only') Alert.alert('Fehler', err.message);
    },
  });

  if (isLoading || !event) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const eventDate = new Date(event.event_date);
  const dateStr = eventDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = eventDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <View style={styles.heroContainer}>
          {event.image_url ? (
            <Image source={{ uri: event.image_url }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="calendar-outline" size={60} color={COLORS.primary} />
            </View>
          )}
          <View style={[styles.heroOverlay, { paddingTop: insets.top }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          {event.is_premium_only && (
            <View style={styles.proBadge}>
              <Ionicons name="flash" size={12} color="#000" />
              <Text style={styles.proBadgeText}>PRO EVENT</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.categoryRow}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{event.category}</Text>
            </View>
          </View>

          <Text style={styles.title}>{event.title}</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Datum & Uhrzeit</Text>
                <Text style={styles.infoValue}>{dateStr}</Text>
                <Text style={styles.infoValue}>{timeStr} Uhr · {event.duration_minutes} Min.</Text>
              </View>
            </View>
            {event.address && (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Ort</Text>
                  <Text style={styles.infoValue}>{event.location_name}</Text>
                  <Text style={styles.infoValueMuted}>{event.address}</Text>
                </View>
              </View>
            )}
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="people-outline" size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Teilnehmer</Text>
                <Text style={styles.infoValue}>
                  {event.current_participants?.length ?? 0} von {event.max_participants} Personen
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="person-outline" size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Veranstalter</Text>
                <Text style={styles.infoValue}>{event.host_name ?? 'Unbekannt'}</Text>
              </View>
            </View>
          </View>

          {event.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Beschreibung</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>
          )}

          {event.tags && event.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {event.tags.map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {isCompleted && isJoined && (
            <TouchableOpacity
              style={styles.postEventBtn}
              onPress={() => router.push(`/post-like/${event.id}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="heart-outline" size={20} color={COLORS.white} />
              <Text style={styles.postEventBtnText}>Teilnehmer liken</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {!isCompleted && (
        <View style={[styles.stickyBar, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 12 }]}>
          <View style={styles.stickyLeft}>
            <Text style={styles.stickySpots}>
              {isFull ? 'Ausgebucht' : `${spotsLeft} Plätze frei`}
            </Text>
            <Text style={styles.stickyPrice}>
              {event.price === 0 ? 'Kostenlos' : `${event.price.toFixed(2)} €`}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.joinBtn,
              isJoined && styles.joinBtnJoined,
              (isFull && !isJoined) && styles.joinBtnFull,
              joinMutation.isPending && { opacity: 0.6 },
            ]}
            onPress={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
            activeOpacity={0.85}
          >
            {joinMutation.isPending ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.joinBtnText}>
                {isJoined ? 'Dabei ✓' : isFull ? 'Warteliste' : 'Teilnehmen'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  heroContainer: { height: 280, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { width: '100%', height: '100%', backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, padding: 16 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  proBadge: {
    position: 'absolute', top: 56, right: 16,
    backgroundColor: COLORS.gold, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  proBadgeText: { color: '#000', fontSize: 11, fontFamily: 'Inter_700Bold' },
  content: { padding: 20 },
  categoryRow: { marginBottom: 12 },
  categoryChip: {
    alignSelf: 'flex-start', backgroundColor: COLORS.primaryGlow,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.primary,
  },
  categoryText: { color: COLORS.primary, fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  title: { color: COLORS.text, fontSize: 24, fontFamily: 'Inter_700Bold', lineHeight: 32, marginBottom: 20 },
  infoCard: {
    backgroundColor: COLORS.surface, borderRadius: 18, padding: 16,
    gap: 14, marginBottom: 24, borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  infoRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  infoIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.primaryGlow, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  infoLabel: { color: COLORS.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginBottom: 3 },
  infoValue: { color: COLORS.text, fontSize: 14, fontFamily: 'Inter_500Medium' },
  infoValueMuted: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 10 },
  description: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.surfaceAlt, borderRadius: 10 },
  tagText: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular' },
  postEventBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 16, height: 52, marginTop: 8,
  },
  postEventBtnText: { color: COLORS.white, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.surfaceBorder,
  },
  stickyLeft: { gap: 2 },
  stickySpots: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' },
  stickyPrice: { color: COLORS.text, fontSize: 18, fontFamily: 'Inter_700Bold' },
  joinBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14,
    minWidth: 130, alignItems: 'center',
  },
  joinBtnJoined: { backgroundColor: COLORS.success },
  joinBtnFull: { backgroundColor: COLORS.surfaceAlt },
  joinBtnText: { color: COLORS.white, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
