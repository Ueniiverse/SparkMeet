import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Alert, ScrollView, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const QUESTIONS = [
  'Was macht dich in deiner Freizeit am glücklichsten?',
  'Wie würden deine engsten Freunde dich in drei Worten beschreiben?',
  'Was ist ein Traum, den du in deinem Leben noch verwirklichen möchtest?',
];

type Phase = 'questions' | 'loading' | 'result';

export default function AiInterviewScreen() {
  const insets = useSafeAreaInsets();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState(['', '', '']);
  const [phase, setPhase] = useState<Phase>('questions');
  const [summary, setSummary] = useState('');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [currentQ]);

  const animateTransition = (cb: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      cb();
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  };

  const handleNextQuestion = () => {
    if (!answers[currentQ].trim()) {
      Alert.alert('Bitte antworte', 'Schreib etwas — auch kurze Antworten sind perfekt.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentQ < QUESTIONS.length - 1) {
      animateTransition(() => setCurrentQ(q => q + 1));
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setPhase('loading');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const payload = QUESTIONS.map((q, i) => ({ question: q, answer: answers[i] }));
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const url = domain ? `https://${domain}/api/personality` : '/api/personality';

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      });

      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = (await res.json()) as { summary?: string; error?: string };
      if (data.error) throw new Error(data.error);

      setSummary(data.summary ?? '');
      setPhase('result');
    } catch (e: unknown) {
      const fallback = `${answers[0].slice(0, 40)}… Eine Person voller Herzlichkeit und Neugier, die das Leben in vollen Zügen genießt.`;
      setSummary(fallback);
      setPhase('result');
    }
  };

  const handleFinish = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const payload = QUESTIONS.map((q, i) => ({ question: q, answer: answers[i] }));
    await AsyncStorage.setItem('onboarding_personality_summary', summary);
    await AsyncStorage.setItem('onboarding_ai_answers', JSON.stringify(payload));
    router.push('/(onboarding)/photos');
  };

  const setAnswer = (text: string) => {
    setAnswers(prev => {
      const next = [...prev];
      next[currentQ] = text;
      return next;
    });
  };

  if (phase === 'loading') {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#7C6FFF22', '#7C6FFF44']} style={styles.loadingCard}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>KI analysiert deine Persönlichkeit{'\n'}Einen Moment bitte...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (phase === 'result') {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }]}>
        <View style={styles.steps}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <View key={i} style={[styles.step, i === 4 && styles.stepActive]} />
          ))}
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={styles.resultIconWrap}>
            <LinearGradient colors={[COLORS.primary + '44', COLORS.primary + '22']} style={styles.resultIconBg}>
              <Ionicons name="sparkles" size={36} color={COLORS.primary} />
            </LinearGradient>
          </View>
          <Text style={styles.resultHeading}>Deine Persönlichkeit</Text>
          <Text style={styles.resultSubheading}>
            Basierend auf deinen Antworten hat unsere KI folgendes ermittelt:
          </Text>
          <LinearGradient colors={['#7C6FFF18', '#7C6FFF30']} style={styles.summaryCard}>
            <Text style={styles.summaryText}>"{summary}"</Text>
          </LinearGradient>
          <Text style={styles.resultNote}>
            Diese Beschreibung ist auf deinem Profil sichtbar und kann später bearbeitet werden.
          </Text>
        </View>
        <TouchableOpacity style={styles.nextBtn} onPress={handleFinish} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>Weiter zu Fotos</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => {
            if (currentQ > 0) {
              animateTransition(() => setCurrentQ(q => q - 1));
            } else {
              router.back();
            }
          }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.steps}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <View key={i} style={[styles.step, i === 4 && styles.stepActive]} />
          ))}
        </View>

        <View style={styles.aiHeader}>
          <LinearGradient colors={[COLORS.primary + '44', COLORS.primary + '22']} style={styles.aiIconBg}>
            <Ionicons name="sparkles" size={22} color={COLORS.primary} />
          </LinearGradient>
          <View>
            <Text style={styles.aiLabel}>KI-Persönlichkeitsanalyse</Text>
            <Text style={styles.aiSub}>Frage {currentQ + 1} von {QUESTIONS.length}</Text>
          </View>
        </View>

        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${((currentQ + 1) / QUESTIONS.length) * 100}%` as `${number}%` }]} />
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.question}>{QUESTIONS[currentQ]}</Text>
          <TextInput
            ref={inputRef}
            style={styles.answerInput}
            value={answers[currentQ]}
            onChangeText={setAnswer}
            placeholder="Deine Antwort..."
            placeholderTextColor={COLORS.textDim}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            returnKeyType="default"
            selectionColor={COLORS.primary}
          />
        </Animated.View>

        <View style={styles.dotIndicators}>
          {QUESTIONS.map((_, i) => (
            <View
              key={i}
              style={[styles.dotIndicator, i === currentQ && styles.dotIndicatorActive, i < currentQ && styles.dotIndicatorDone]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={handleNextQuestion} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>
            {currentQ < QUESTIONS.length - 1 ? 'Nächste Frage' : 'Antworten absenden'}
          </Text>
          <Ionicons name={currentQ < QUESTIONS.length - 1 ? 'arrow-forward' : 'checkmark'} size={20} color={COLORS.white} />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.background, paddingHorizontal: 24 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  backBtn: { marginBottom: 20, alignSelf: 'flex-start' },
  steps: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  step: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceAlt },
  stepActive: { width: 24, backgroundColor: COLORS.primary },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  aiIconBg: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  aiLabel: { color: COLORS.text, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  aiSub: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  progressBarBg: {
    height: 3, backgroundColor: COLORS.surfaceAlt, borderRadius: 2, marginBottom: 28,
  },
  progressBarFill: {
    height: 3, backgroundColor: COLORS.primary, borderRadius: 2,
  },
  question: {
    color: COLORS.text, fontSize: 22, fontFamily: 'Inter_700Bold',
    lineHeight: 32, marginBottom: 20,
  },
  answerInput: {
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.surfaceBorder,
    borderRadius: 16, padding: 16, color: COLORS.text,
    fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 24,
    minHeight: 120,
  },
  dotIndicators: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 24 },
  dotIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceAlt },
  dotIndicatorActive: { backgroundColor: COLORS.primary, width: 24 },
  dotIndicatorDone: { backgroundColor: COLORS.primary + '66' },
  nextBtn: {
    backgroundColor: COLORS.primary, borderRadius: 18, height: 58,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  nextBtnText: { color: COLORS.white, fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  loadingCard: {
    padding: 36, borderRadius: 24, alignItems: 'center', gap: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  loadingText: {
    color: COLORS.textMuted, fontSize: 15, fontFamily: 'Inter_400Regular',
    textAlign: 'center', lineHeight: 24,
  },
  resultIconWrap: { alignItems: 'center', marginBottom: 24 },
  resultIconBg: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  resultHeading: { color: COLORS.text, fontSize: 26, fontFamily: 'Inter_700Bold', textAlign: 'center', marginBottom: 10 },
  resultSubheading: {
    color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular',
    textAlign: 'center', marginBottom: 20, lineHeight: 22,
  },
  summaryCard: { padding: 20, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 16 },
  summaryText: { color: COLORS.text, fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 24, fontStyle: 'italic', textAlign: 'center' },
  resultNote: { color: COLORS.textDim, fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 18 },
});
