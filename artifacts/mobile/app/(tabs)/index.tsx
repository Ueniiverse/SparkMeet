import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  const cityName = profile?.city ?? 'deiner Stadt';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
        <View>
          <Text style={styles.headerTitle}>Events in {cityName}</Text>
          <Text style={styles.headerSub}>Finde dein nächstes Erlebnis</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="location-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
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
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.catChip, activeCategory === cat.key && styles.catChipActive]}
            onPress={() => handleCategoryPress(cat.key)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={cat.icon as any}
              size={14}
              color={activeCategory === cat.key ? COLORS.white : COLORS.textMuted}
            />
            <Text style={[styles.catChipText, activeCategory === cat.key && styles.catChipTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
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
            { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 80 }
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="calendar-outline" size={40} color={COLORS.textDim} />
              </View>
              <Text style={styles.emptyTitle}>Keine Events gefunden</Text>
              <Text style={styles.emptyText}>
                {activeCategory ? `Keine ${activeCategory}-Events in deiner Nähe.` : 'Aktuell keine Events verfügbar.'}
              </Text>
            </View>
          }
        />
      )}

      {canCreateEvent && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 80 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/create-event'); }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color={COLORS.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerTitle: { color: COLORS.text, fontSize: 22, fontFamily: 'Inter_700Bold' },
  headerSub: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  headerIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
  },
  categoryScroll: { maxHeight: 44, flexGrow: 0 },
  categoryScrollContent: { paddingHorizontal: 20, gap: 8, paddingBottom: 0, paddingTop: 4 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: COLORS.surface, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_500Medium' },
  catChipTextActive: { color: COLORS.white },
  listContent: { paddingHorizontal: 16, paddingTop: 12 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  fab: {
    position: 'absolute', right: 20,
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 8,
  },
});
