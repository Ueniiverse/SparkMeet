import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event, CATEGORIES } from '@/lib/types';
import { COLORS } from '@/constants/colors';

interface EventCardProps {
  event: Event;
  onPress: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const spotsLeft = event.max_participants - (event.current_participants?.length ?? 0);
  const categoryInfo = CATEGORIES.find(c => c.key === event.category);
  const eventDate = new Date(event.event_date);
  const isToday = new Date().toDateString() === eventDate.toDateString();

  const dateStr = isToday
    ? `Heute, ${eventDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
    : eventDate.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' }) +
      `, ${eventDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.imageContainer}>
        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name={categoryInfo?.icon ?? 'calendar-outline'} size={40} color={COLORS.primary} />
          </View>
        )}
        {event.is_premium_only && (
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        )}
        <View style={styles.spotsBadge}>
          <Ionicons name="people-outline" size={12} color={spotsLeft <= 2 ? COLORS.error : COLORS.success} />
          <Text style={[styles.spotsText, { color: spotsLeft <= 2 ? COLORS.error : COLORS.success }]}>
            {spotsLeft} frei
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.categoryRow}>
          <View style={styles.categoryChip}>
            <Ionicons name={categoryInfo?.icon ?? 'calendar-outline'} size={12} color={COLORS.primary} />
            <Text style={styles.categoryText}>{event.category}</Text>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{dateStr}</Text>
        </View>
        {event.location_name && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>{event.location_name}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.participantsRow}>
            <Ionicons name="people-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.participantsText}>
              {event.current_participants?.length ?? 0}/{event.max_participants}
            </Text>
          </View>
          <Text style={styles.price}>
            {event.price === 0 ? 'Kostenlos' : `${event.price.toFixed(2)} €`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  imageContainer: {
    height: 180,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: COLORS.gold,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  proBadgeText: {
    color: '#000',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  spotsBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(10,10,15,0.8)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spotsText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  content: {
    padding: 14,
  },
  categoryRow: {
    marginBottom: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryGlow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    color: COLORS.primary,
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantsText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  price: {
    color: COLORS.success,
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
});
