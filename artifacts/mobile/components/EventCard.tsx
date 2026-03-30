import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Event, CATEGORIES } from '@/lib/types';
import { COLORS } from '@/constants/colors';

interface EventCardProps {
  event: Event;
  onPress: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const spotsLeft = event.max_participants - (event.current_participants?.length ?? 0);
  const filled = event.current_participants?.length ?? 0;
  const categoryInfo = CATEGORIES.find(c => c.key === event.category);
  const eventDate = new Date(event.event_date);
  const now = new Date();
  const isToday = now.toDateString() === eventDate.toDateString();
  const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === eventDate.toDateString();

  const dayLabel = isToday
    ? 'Heute'
    : isTomorrow
    ? 'Morgen'
    : eventDate.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });

  const timeStr = eventDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const fillPercent = event.max_participants > 0 ? (filled / event.max_participants) * 100 : 0;
  const almostFull = spotsLeft <= 2 && spotsLeft > 0;
  const isFull = spotsLeft <= 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.imageContainer}>
        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name={categoryInfo?.icon ?? 'calendar-outline'} size={48} color={COLORS.primary} />
          </View>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(10,10,15,0.6)', 'rgba(10,10,15,0.97)']}
          locations={[0.2, 0.55, 1]}
          style={styles.gradient}
        />

        <View style={styles.topBadges}>
          <View style={styles.categoryBadge}>
            <Ionicons name={categoryInfo?.icon ?? 'calendar-outline'} size={12} color={COLORS.primary} />
            <Text style={styles.categoryBadgeText}>{event.category}</Text>
          </View>
          {event.is_premium_only && (
            <View style={styles.proBadge}>
              <Ionicons name="flash" size={10} color="#000" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>

        <View style={styles.imageBottom}>
          <Text style={styles.imageTitle} numberOfLines={2}>{event.title}</Text>
          <View style={styles.imageMeta}>
            <View style={styles.dateChip}>
              <Ionicons name="time-outline" size={12} color={COLORS.text} />
              <Text style={styles.dateChipText}>{dayLabel}, {timeStr}</Text>
            </View>
            {(almostFull || isFull) && (
              <View style={[styles.urgencyChip, { backgroundColor: isFull ? COLORS.error + '22' : COLORS.gold + '22' }]}>
                <Ionicons
                  name={isFull ? 'close-circle' : 'flame'}
                  size={11}
                  color={isFull ? COLORS.error : COLORS.gold}
                />
                <Text style={[styles.urgencyText, { color: isFull ? COLORS.error : COLORS.gold }]}>
                  {isFull ? 'Ausgebucht' : `Nur ${spotsLeft} frei`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.locationText} numberOfLines={1}>
            {event.location_name ?? 'Ort wird bekannt gegeben'}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.participantsSection}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, {
                width: `${fillPercent}%` as any,
                backgroundColor: isFull ? COLORS.error : almostFull ? COLORS.gold : COLORS.primary,
              }]} />
            </View>
            <Text style={styles.participantsText}>
              {filled}/{event.max_participants} Teilnehmer
            </Text>
          </View>
          <Text style={[styles.price, event.price === 0 && styles.priceFree]}>
            {event.price === 0 ? 'Kostenlos' : `${event.price.toFixed(0)} €`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  imageContainer: {
    height: 220,
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
  gradient: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: '100%',
  },
  topBadges: {
    position: 'absolute',
    top: 12, left: 12,
    flexDirection: 'row', gap: 6,
  },
  categoryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(10,10,15,0.72)',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(124,111,255,0.3)',
  },
  categoryBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  proBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20,
  },
  proBadgeText: {
    color: '#000',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  imageBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 14,
  },
  imageTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    lineHeight: 24,
    marginBottom: 8,
  },
  imageMeta: {
    flexDirection: 'row', gap: 8, flexWrap: 'wrap',
  },
  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 8,
  },
  dateChipText: {
    color: COLORS.text, fontSize: 12, fontFamily: 'Inter_500Medium',
  },
  urgencyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  urgencyText: {
    fontSize: 11, fontFamily: 'Inter_600SemiBold',
  },
  content: {
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12,
  },
  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10,
  },
  locationText: {
    color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1,
  },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  participantsSection: {
    flex: 1, gap: 5, marginRight: 12,
  },
  progressBarBg: {
    height: 4, borderRadius: 2, backgroundColor: COLORS.surfaceAlt, overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%', borderRadius: 2,
  },
  participantsText: {
    color: COLORS.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular',
  },
  price: {
    color: COLORS.text, fontSize: 14, fontFamily: 'Inter_700Bold',
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  priceFree: {
    color: COLORS.success,
    backgroundColor: COLORS.successDim,
  },
});
