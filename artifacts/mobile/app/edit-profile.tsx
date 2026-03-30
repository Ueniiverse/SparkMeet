import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Image, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/types';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfile } from '@/context/ProfileContext';
import { useAuth } from '@/context/AuthContext';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [age, setAge] = useState(String(profile?.age ?? ''));
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [photos, setPhotos] = useState<string[]>(profile?.profile_images ?? []);
  const [saving, setSaving] = useState(false);

  const toggleInterest = (key: string) => {
    Haptics.selectionAsync();
    setInterests(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const addPhoto = async () => {
    if (photos.length >= 6) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 5], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user) return;
    if (!displayName.trim()) { Alert.alert('Fehler', 'Name darf nicht leer sein.'); return; }
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) { Alert.alert('Fehler', 'Ungültiges Alter.'); return; }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaving(true);

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const uri = photos[i];
        if (uri.startsWith('http')) {
          uploadedUrls.push(uri);
          continue;
        }
        const ext = uri.split('.').pop() ?? 'jpg';
        const fileName = `${user.id}/${Date.now()}_${i}.${ext}`;
        const response = await fetch(uri);
        const blob = await response.blob();
        const { data } = await supabase.storage.from('profile-images').upload(fileName, blob, { contentType: `image/${ext}`, upsert: true });
        if (data) {
          const { data: urlData } = supabase.storage.from('profile-images').getPublicUrl(fileName);
          uploadedUrls.push(urlData.publicUrl);
        } else {
          uploadedUrls.push(uri);
        }
      }

      const { error } = await supabase.from('profiles').update({
        display_name: displayName.trim(),
        age: ageNum,
        bio: bio.trim(),
        city: city.trim(),
        interests,
        profile_images: uploadedUrls,
        last_active: new Date().toISOString(),
      }).eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert('Fehler', e?.message ?? 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil bearbeiten</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={COLORS.primary} size="small" />
          ) : (
            <Text style={styles.saveBtn}>Speichern</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Fotos</Text>
        <View style={styles.photosGrid}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <TouchableOpacity
              key={i}
              style={[styles.photoSlot, photos[i] && styles.photoSlotFilled]}
              onPress={photos[i] ? () => removePhoto(i) : addPhoto}
              activeOpacity={0.8}
            >
              {photos[i] ? (
                <>
                  <Image source={{ uri: photos[i] }} style={styles.photo} />
                  <View style={styles.removeBtn}>
                    <Ionicons name="close" size={12} color={COLORS.white} />
                  </View>
                </>
              ) : (
                <Ionicons name="add" size={24} color={COLORS.textDim} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Infos</Text>
        <View style={styles.inputGroup}>
          {[
            { label: 'Name', value: displayName, onChange: setDisplayName, icon: 'person-outline' as const },
            { label: 'Stadt', value: city, onChange: setCity, icon: 'location-outline' as const },
          ].map(field => (
            <View key={field.label} style={styles.inputWrapper}>
              <Ionicons name={field.icon} size={18} color={COLORS.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder={field.label}
                placeholderTextColor={COLORS.textDim}
                value={field.value}
                onChangeText={field.onChange}
              />
            </View>
          ))}
          <View style={styles.inputWrapper}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              placeholder="Alter"
              placeholderTextColor={COLORS.textDim}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Bio</Text>
        <View style={styles.bioWrapper}>
          <TextInput
            style={styles.bioInput}
            placeholder="Erzähl etwas über dich... (max. 300 Zeichen)"
            placeholderTextColor={COLORS.textDim}
            value={bio}
            onChangeText={t => setBio(t.slice(0, 300))}
            multiline
            numberOfLines={4}
          />
          <Text style={styles.bioCounter}>{bio.length}/300</Text>
        </View>

        <Text style={styles.sectionTitle}>Interessen</Text>
        <View style={styles.interestsGrid}>
          {CATEGORIES.map(cat => {
            const selected = interests.includes(cat.key);
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.interestChip, selected && styles.interestChipSelected]}
                onPress={() => toggleInterest(cat.key)}
                activeOpacity={0.8}
              >
                <Ionicons name={cat.icon as any} size={14} color={selected ? COLORS.primary : COLORS.textMuted} />
                <Text style={[styles.interestChipText, selected && styles.interestChipTextSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
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
  saveBtn: { color: COLORS.primary, fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 12, marginTop: 8 },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  photoSlot: {
    width: '31%', aspectRatio: 4 / 5, borderRadius: 12,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.surfaceBorder,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative',
  },
  photoSlotFilled: { borderStyle: 'solid', borderColor: 'transparent' },
  photo: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
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
  bioInput: { color: COLORS.text, fontSize: 14, fontFamily: 'Inter_400Regular', minHeight: 80, lineHeight: 22 },
  bioCounter: { color: COLORS.textDim, fontSize: 11, fontFamily: 'Inter_400Regular', alignSelf: 'flex-end', marginTop: 6 },
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 },
  interestChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: COLORS.surface, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.surfaceBorder,
  },
  interestChipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  interestChipText: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'Inter_500Medium' },
  interestChipTextSelected: { color: COLORS.primary },
});
