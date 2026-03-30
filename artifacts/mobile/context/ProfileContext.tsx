import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile, FREE_MAX_EVENTS, FREE_MAX_MATCHES, isProActive } from '@/lib/types';
import { useAuth } from './AuthContext';

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  isPro: boolean;
  canJoinEvent: boolean;
  canCreateMatch: boolean;
  canCreateEvent: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  loading: true,
  isPro: false,
  canJoinEvent: true,
  canCreateMatch: true,
  canCreateEvent: false,
  refreshProfile: async () => {},
  updateProfile: async () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchCount, setMatchCount] = useState(0);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data);

      const { count } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);
      setMatchCount(count ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) return;
    const { data } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (data) setProfile(data);
  };

  const isPro = isProActive(profile);
  const eventsJoined = profile?.events_joined?.length ?? 0;

  return (
    <ProfileContext.Provider value={{
      profile,
      loading,
      isPro,
      canJoinEvent: isPro || eventsJoined < FREE_MAX_EVENTS,
      canCreateMatch: isPro || matchCount < FREE_MAX_MATCHES,
      canCreateEvent: isPro,
      refreshProfile: fetchProfile,
      updateProfile,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
