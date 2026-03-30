import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Image, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { Match, Message, Profile, Event } from '@/lib/types';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');

  const { data: match } = useQuery<Match & { other_profile: Profile; event: Event }>({
    queryKey: ['match', matchId],
    queryFn: async () => {
      const { data } = await supabase.from('matches').select('*').eq('id', matchId).single();
      if (!data) throw new Error('Match not found');
      const otherId = data.user_id_1 === user?.id ? data.user_id_2 : data.user_id_1;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', otherId).single();
      const { data: event } = await supabase.from('events').select('*').eq('id', data.event_id).single();
      return { ...data, other_profile: profile!, event: event! };
    },
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['messages', matchId],
    queryFn: async () => {
      const { data } = await supabase.from('messages').select('*').eq('match_id', matchId).order('created_at', { ascending: false });
      // Mark as read
      if (data && user) {
        await supabase.from('messages').update({ is_read: true })
          .eq('match_id', matchId).neq('sender_id', user.id).eq('is_read', false);
      }
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['messages', matchId] });
        queryClient.invalidateQueries({ queryKey: ['matches'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: async (msgText: string) => {
      if (!user || !matchId) return;
      const { error } = await supabase.from('messages').insert({
        match_id: matchId,
        sender_id: user.id,
        text: msgText,
        is_read: false,
      });
      if (error) throw error;
      await supabase.from('matches').update({
        last_message: msgText,
        last_message_at: new Date().toISOString(),
      }).eq('id', matchId);
    },
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      queryClient.invalidateQueries({ queryKey: ['messages', matchId] });
    },
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    sendMutation.mutate(trimmed);
  };

  const photo = match?.other_profile?.profile_images?.[0];

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerProfile}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
              <Ionicons name="person" size={18} color={COLORS.textMuted} />
            </View>
          )}
          <View>
            <Text style={styles.headerName}>{match?.other_profile?.display_name ?? '...'}</Text>
            {match?.event?.title && (
              <Text style={styles.headerEvent} numberOfLines={1}>
                via {match.event.title}
              </Text>
            )}
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={messages}
        inverted
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.messageList, { paddingBottom: 16 }]}
        renderItem={({ item }) => {
          const isMine = item.sender_id === user?.id;
          return (
            <View style={[styles.messageBubbleRow, isMine && styles.messageBubbleRowRight]}>
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.text}</Text>
                <View style={styles.bubbleMeta}>
                  <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>{formatTime(item.created_at)}</Text>
                  {isMine && (
                    <Ionicons
                      name={item.is_read ? 'checkmark-done' : 'checkmark'}
                      size={12}
                      color={item.is_read ? COLORS.primary : 'rgba(255,255,255,0.5)'}
                    />
                  )}
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>Schreib die erste Nachricht!</Text>
          </View>
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 8 }]}>
          <TextInput
            style={styles.input}
            placeholder="Nachricht..."
            placeholderTextColor={COLORS.textDim}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim()}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.surfaceBorder,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerProfile: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' },
  headerAvatar: { width: 38, height: 38, borderRadius: 19 },
  headerAvatarPlaceholder: { backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  headerName: { color: COLORS.text, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  headerEvent: { color: COLORS.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', maxWidth: 180 },
  messageList: { paddingHorizontal: 16, paddingTop: 16 },
  messageBubbleRow: { flexDirection: 'row', marginBottom: 8 },
  messageBubbleRowRight: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
    borderBottomLeftRadius: 4,
  },
  bubbleMine: { backgroundColor: COLORS.primary, borderBottomLeftRadius: 18, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surfaceBorder },
  bubbleText: { color: COLORS.text, fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  bubbleTextMine: { color: COLORS.white },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'flex-end' },
  bubbleTime: { color: COLORS.textMuted, fontSize: 10, fontFamily: 'Inter_400Regular' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.6)' },
  emptyChat: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyChatText: { color: COLORS.textDim, fontSize: 14, fontFamily: 'Inter_400Regular' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.surfaceBorder,
  },
  input: {
    flex: 1, color: COLORS.text, fontSize: 15, fontFamily: 'Inter_400Regular',
    backgroundColor: COLORS.surfaceAlt, borderRadius: 22, paddingHorizontal: 16,
    paddingVertical: 10, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.surfaceAlt },
});
