import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/types';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { useQueryClient } from '@tanstack/react-query';

export default function CreateEventScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('8');
  const [price, setPrice] = useState('0');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) { Alert.alert('Fehler', 'Bitte einen Titel eingeben.'); return; }
    if (!category) { Alert.alert('Fehler', 'Bitte eine Kategorie wählen.'); return; }
    if (!date || !time) { Alert.alert('Fehler', 'Bitte Datum und Uhrzeit eingeben (z.B. 25.04.2025 19:00).'); return; }
    if (!user) return;

    const [day, month, year] = date.split('.');
    const [hour, minute] = time.split(':');
    const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    if (isNaN(eventDate.getTime())) { Alert.alert('Fehler', 'Ungültiges Datum. Format: TT.MM.JJJJ'); return; }
    if (eventDate < new Date()) { Alert.alert('Fehler', 'Das Event muss in der Zukunft liegen.'); return; }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaving(true);

    const { error } = await supabase.from('events').insert({
      title: title.trim(),
      description: description.trim(),
      category,
      host_id: user.id,
      host_name: profile?.display_name ?? 'Unbekannt',
      location_name: locationName.trim(),
      address: address.trim(),
      event_date: eventDate.toISOString(),
      duration_minutes: 120,
      max_participants: parseInt(maxParticipants) || 8,
      current_participants: [user.id],
      price: parseFloat(price) || 0,
      status: 'upcoming',
      tags: [category],
    });

    setSaving(false);

    if (error) { Alert.alert('Fehler', error.message); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    queryClient.invalidateQueries({ queryKey: ['events'] });
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event erstellen</Text>
        <TouchableOpacity onPress={handleCreate} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.primary} size="small" /> : <Text style={styles.createBtn}>Erstellen</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 60 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Kategorie</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          <View style={styles.catRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.catChip, category === cat.key && styles.catChipActive]}
                onPress={() => { Haptics.selectionAsync(); setCategory(cat.key); }}
                activeOpacity={0.8}
              >
                <Ionicons name={cat.icon as any} size={14} color={category === cat.key ? COLORS.white : COLORS.textMuted} />
                <Text style={[styles.catChipText, category === cat.key && styles.catChipTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.inputGroup}>
          {[
            { placeholder: 'Titel *', value: title, onChange: setTitle, icon: 'pencil-outline' as const },
            { placeholder: 'Ort (z.B. Kochschule Mitte)', value: locationName, onChange: setLocationName, icon: 'location-outline' as const },
            { placeholder: 'Adresse', value: address, onChange: setAddress, icon: 'map-outline' as const },
            { placeholder: 'Datum (TT.MM.JJJJ)', value: date, onChange: setDate, icon: 'calendar-outline' as const },
            { placeholder: 'Uhrzeit (HH:MM)', value: time, onChange: setTime, icon: 'time-outline' as const },
            { placeholder: 'Max. Teilnehmer (4-12)', value: maxParticipants, onChange: setMaxParticipants, icon: 'people-outline' as const, keyboardType: 'number-pad' as const },
            { placeholder: 'Preis in € (0 = kostenlos)', value: price, onChange: setPrice, icon: 'cash-outline' as const, keyboardType: 'decimal-pad' as const },
          ].map((field, i) => (
            <View key={i} style={styles.inputWrapper}>
              <Ionicons name={field.icon} size={18} color={COLORS.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder={field.placeholder}
                placeholderTextColor={COLORS.textDim}
                value={field.value}
                onChangeText={field.onChange}
                keyboardType={(field as any).keyboardType ?? 'default'}
              />
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Beschreibung</Text>
        <View style={styles.bioWrapper}>
          <TextInput
            style={styles.bioInput}
            placeholder="Was erwartet die Teilnehmer?"
            placeholderTextColor={COLORS.textDim}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.surfaceBorder,
  },
  headerTitle: { color: COLORS.text, fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  createBtn: { color: COLORS.primary, fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 12, marginTop: 8 },
  catScroll: { marginBottom: 20, marginHorizontal: -20 },
  catRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: COLORS.surface, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_500Medium' },
  catChipTextActive: { color: COLORS.white },
  inputGroup: { gap: 10, marginBottom: 20 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surfaceBorder,
    borderRadius: 14, height: 52, paddingHorizontal: 14,
  },
  input: { flex: 1, color: COLORS.text, fontSize: 15, fontFamily: 'Inter_400Regular' },
  bioWrapper: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surfaceBorder,
    borderRadius: 14, padding: 14, marginBottom: 20,
  },
  bioInput: { color: COLORS.text, fontSize: 14, fontFamily: 'Inter_400Regular', minHeight: 100, lineHeight: 22 },
});
