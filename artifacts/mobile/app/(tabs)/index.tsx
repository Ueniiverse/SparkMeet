import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Platform, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { Event, CATEGORIES } from '@/lib/types';
import { COLORS } from '@/constants/colors';
import { EventCard } from '@/components/EventCard';
import { EventCardSkeleton } from '@/components/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfile } from '@/context/ProfileContext';

function getGreeting(name: string) {
  const h = new Date().getHours();
  const salutation = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend';
  return `${salutation}, ${name.split(' ')[0]}`;
}

export default function EventsFeedScreen() {
  const insets = useSafeAreaInsets();
  const { profile, canCreateEvent } = useProfile();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: events, isLoading, refetch } = useQuery<Event[]>({
    queryKey: ['events', activeCategory],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*')
        .in('status', ['upcoming', 'active'])
        .order('event_date', { ascending: true });
      if (activeCategory) query = query.eq('category', activeCategory);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCategoryPress = (key: string | null) => {
    Haptics.selectionAsync();
    setActiveCategory(prev => (prev === key ? null : key));
  };

  const greeting = profile?.display_name ? getGreeting(profile.display_name) : 'Hallo';
  const mainPhoto = profile?.profile_images?.[0];
  const topOffset = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topOffset + 8 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.headerSub}>Entdecke Events in deiner Nähe</Text>
        </View>
        <View style={styles.headerRight}>
          {canCreateEvent && (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/create-event'); }}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={20} color={COLORS.white} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.85}
          >
            {mainPhoto ? (
              <Image source={{ uri: mainPhoto }} style={styles.avatarThumb} />
            ) : (
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.avatarThumb}
              >
                <Ionicons name="person" size={18} color={COLORS.white} />
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        <TouchableOpacity
          style={[styles.catChip, !activeCategory && styles.catChipActive]}
          onPress={() => handleCategoryPress(null)}
          activeOpacity={0.8}
        >
          <Text style={[styles.catChipText, !activeCategory && styles.catChipTextActive]}>Alle</Text>
        </TouchableOpacity>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.catChip, isActive && styles.catChipActive]}
              onPress={() => handleCategoryPress(cat.key)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={cat.icon}
                size={13}
                color={isActive ? COLORS.white : COLORS.textMuted}
              />
              <Text style={[styles.catChipText, isActive && styles.catChipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={styles.listContent}>
          {[1, 2, 3].map(i => <EventCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <EventCard event={item} onPress={() => router.push(`/event/${item.id}`)} />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 88 },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            events && events.length > 0 ? (
              <Text style={styles.listHeader}>
                {events.length} Event{events.length !== 1 ? 's' : ''}{activeCategory ? ` in ${activeCategory}` : ''}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="calendar-outline" size={36} color={COLORS.textDim} />
              </View>
              <Text style={styles.emptyTitle}>Keine Events gefunden</Text>
              <Text style={styles.emptyText}>
                {activeCategory
                  ? `Aktuell keine ${activeCategory}-Events verfügbar.`
                  : 'Schau später nochmal rein!'}
              </Text>
              {activeCategory && (
                <TouchableOpacity style={styles.resetBtn} onPress={() => setActiveCategory(null)}>
                  <Text style={styles.resetBtnText}>Alle Events anzeigen</Text>
                </TouchableOpacity>
              )}
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
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2 },
  greeting: { color: COLORS.text, fontSize: 23, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  headerSub: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 3 },
  createBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarBtn: { borderRadius: 12, overflow: 'hidden' },
  avatarThumb: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  categoryScroll: { maxHeight: 42, flexGrow: 0 },
  categoryScrollContent: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 7,
    backgroundColor: COLORS.surface, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'Inter_500Medium' },
  catChipTextActive: { color: COLORS.white },
  listContent: { paddingHorizontal: 16, paddingTop: 14 },
  listHeader: {
    color: COLORS.textMuted, fontSize: 12, fontFamily: 'Inter_500Medium',
    marginBottom: 12, letterSpacing: 0.3,
  },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surfaceBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  emptyTitle: { color: COLORS.text, fontSize: 17, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 21 },
  resetBtn: {
    marginTop: 20, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: COLORS.primaryGlow, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary,
  },
  resetBtnText: { color: COLORS.primary, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
