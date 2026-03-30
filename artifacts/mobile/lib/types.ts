export interface Profile {
  id: string;
  display_name: string | null;
  age: number | null;
  bio: string | null;
  profile_images: string[];
  interests: string[];
  city: string | null;
  gender: string | null;
  looking_for: string | null;
  is_pro: boolean;
  pro_expires_at: string | null;
  notification_token: string | null;
  events_joined: string[];
  created_at: string;
  last_active: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  category: string;
  host_id: string;
  host_name: string | null;
  image_url: string | null;
  location_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  event_date: string;
  duration_minutes: number;
  max_participants: number;
  current_participants: string[];
  price: number;
  is_premium_only: boolean;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  tags: string[];
  created_at: string;
}

export interface Match {
  id: string;
  user_id_1: string;
  user_id_2: string;
  event_id: string;
  status: string;
  initiated_by: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  other_profile?: Profile;
  event?: Event;
  unread_count?: number;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  text: string;
  is_read: boolean;
  created_at: string;
}

export interface EventLike {
  id: string;
  event_id: string;
  from_user_id: string;
  to_user_id: string;
  created_at: string;
}

export const CATEGORIES = [
  { key: 'Kochen', icon: 'restaurant-outline', label: 'Kochen' },
  { key: 'Wandern', icon: 'trail-sign-outline', label: 'Wandern' },
  { key: 'Sport', icon: 'football-outline', label: 'Sport' },
  { key: 'Kultur', icon: 'color-palette-outline', label: 'Kultur' },
  { key: 'Spieleabend', icon: 'game-controller-outline', label: 'Spieleabend' },
  { key: 'Café', icon: 'cafe-outline', label: 'Café' },
  { key: 'Konzert', icon: 'musical-notes-outline', label: 'Konzert' },
  { key: 'Yoga', icon: 'body-outline', label: 'Yoga' },
] as const;

export type CategoryKey = typeof CATEGORIES[number]['key'];

export const FREE_MAX_EVENTS = 3;
export const FREE_MAX_MATCHES = 5;

export function isProActive(profile: Profile | null): boolean {
  if (!profile?.is_pro) return false;
  if (!profile.pro_expires_at) return true;
  return new Date(profile.pro_expires_at) > new Date();
}
