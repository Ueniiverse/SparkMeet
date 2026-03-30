import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export default function PhotosScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Berechtigung benötigt', 'Bitte erlaube Zugriff auf deine Fotos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 5], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPhotos(prev => [...prev, result.assets[0].uri].slice(0, 6));
    }
  };

  const removePhoto = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    if (photos.length === 0) { Alert.alert('Fehler', 'Bitte mindestens ein Foto hinzufügen.'); return; }
    if (!user) { Alert.alert('Fehler', 'Nicht angemeldet.'); return; }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUploading(true);

    try {
      const name = await AsyncStorage.getItem('onboarding_name') ?? '';
      const age = parseInt(await AsyncStorage.getItem('onboarding_age') ?? '0');
      const gender = await AsyncStorage.getItem('onboarding_gender') ?? '';
      const looking_for = await AsyncStorage.getItem('onboarding_looking_for') ?? '';
      const interests = JSON.parse(await AsyncStorage.getItem('onboarding_interests') ?? '[]');

      let city = '';
      if (Platform.OS !== 'web') {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
            const geo = await Location.reverseGeocodeAsync(loc.coords);
            if (geo[0]) city = geo[0].city ?? geo[0].region ?? '';
          }
        } catch { }
      }

      const uploadedUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const uri = photos[i];
        const ext = uri.split('.').pop() ?? 'jpg';
        const fileName = `${user.id}/${Date.now()}_${i}.${ext}`;
        const response = await fetch(uri);
        const blob = await response.blob();
        const { data, error } = await supabase.storage
          .from('profile-images')
          .upload(fileName, blob, { contentType: `image/${ext}`, upsert: true });
        if (data) {
          const { data: urlData } = supabase.storage.from('profile-images').getPublicUrl(fileName);
          uploadedUrls.push(urlData.publicUrl);
        } else {
          uploadedUrls.push(uri);
        }
      }

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        display_name: name,
        age,
        gender,
        looking_for,
        interests,
        city,
        profile_images: uploadedUrls,
        events_joined: [],
        is_pro: false,
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
      });

      if (error) throw error;

      await AsyncStorage.multiRemove([
        'onboarding_name', 'onboarding_age', 'onboarding_gender',
        'onboarding_looking_for', 'onboarding_interests',
      ]);

      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Fehler', e?.message ?? 'Profil konnte nicht gespeichert werden.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color={COLORS.text} />
      </TouchableOpacity>
      <View style={styles.steps}>
        {[0, 1, 2, 3, 4].map(i => (
          <View key={i} style={[styles.step, i === 4 && styles.stepActive]} />
        ))}
      </View>

      <Text style={styles.heading}>Deine Fotos</Text>
      <Text style={styles.subheading}>Füge 1-6 Fotos hinzu. Dein erstes Foto ist dein Hauptbild.</Text>

      <View style={styles.grid}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <TouchableOpacity
            key={i}
            style={[styles.photoSlot, photos[i] && styles.photoSlotFilled]}
            onPress={photos[i] ? () => removePhoto(i) : pickPhoto}
            activeOpacity={0.8}
          >
            {photos[i] ? (
              <>
                <Image source={{ uri: photos[i] }} style={styles.photo} />
                <View style={styles.removeBtn}>
                  <Ionicons name="close" size={14} color={COLORS.white} />
                </View>
                {i === 0 && (
                  <View style={styles.mainBadge}>
                    <Text style={styles.mainBadgeText}>Haupt</Text>
                  </View>
                )}
              </>
            ) : (
              <Ionicons name="add" size={28} color={i < photos.length ? COLORS.primary : COLORS.textDim} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.nextBtn, (photos.length === 0 || uploading) && styles.nextBtnDisabled]}
        onPress={handleFinish}
        disabled={photos.length === 0 || uploading}
        activeOpacity={0.85}
      >
        {uploading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <>
            <Text style={styles.nextBtnText}>Profil fertigstellen</Text>
            <Ionicons name="checkmark" size={20} color={COLORS.white} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 24 },
  backBtn: { marginBottom: 20, alignSelf: 'flex-start' },
  steps: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  step: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceAlt },
  stepActive: { width: 24, backgroundColor: COLORS.primary },
  heading: { color: COLORS.text, fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  subheading: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 28, lineHeight: 22 },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignContent: 'flex-start' },
  photoSlot: {
    width: '31%', aspectRatio: 4 / 5,
    backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 1.5, borderColor: COLORS.surfaceBorder,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', position: 'relative',
  },
  photoSlotFilled: { borderStyle: 'solid', borderColor: 'transparent' },
  photo: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  mainBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: COLORS.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  mainBadgeText: { color: COLORS.white, fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  nextBtn: {
    backgroundColor: COLORS.primary, borderRadius: 18, height: 58,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: COLORS.white, fontSize: 17, fontFamily: 'Inter_600SemiBold' },
});
