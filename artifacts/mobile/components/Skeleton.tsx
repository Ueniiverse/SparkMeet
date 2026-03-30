import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '@/constants/colors';

interface SkeletonProps {
  style?: ViewStyle;
}

export function Skeleton({ style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.skeleton, style, { opacity }]} />;
}

export function EventCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton style={styles.image} />
      <View style={styles.content}>
        <Skeleton style={styles.chip} />
        <Skeleton style={styles.title} />
        <Skeleton style={styles.meta} />
        <Skeleton style={styles.meta} />
      </View>
    </View>
  );
}

export function MatchRowSkeleton() {
  return (
    <View style={styles.matchRow}>
      <Skeleton style={styles.avatar} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton style={styles.matchName} />
        <Skeleton style={styles.matchMessage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 8,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  image: {
    height: 180,
    borderRadius: 0,
  },
  content: {
    padding: 14,
    gap: 10,
  },
  chip: {
    height: 22,
    width: 80,
    borderRadius: 6,
  },
  title: {
    height: 20,
    width: '85%',
    borderRadius: 6,
  },
  meta: {
    height: 14,
    width: '65%',
    borderRadius: 4,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  matchName: {
    height: 16,
    width: 120,
    borderRadius: 4,
  },
  matchMessage: {
    height: 14,
    width: '70%',
    borderRadius: 4,
  },
});
