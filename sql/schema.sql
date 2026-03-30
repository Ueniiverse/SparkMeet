-- SparkMeet Database Schema
-- Run this entire file in your Supabase SQL Editor (https://app.supabase.com/project/oxjfeegkiqwwktxfgcrw/sql)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  age INTEGER,
  bio TEXT CHECK (char_length(bio) <= 300),
  profile_images TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  city TEXT,
  gender TEXT,
  looking_for TEXT,
  is_pro BOOLEAN DEFAULT FALSE,
  pro_expires_at TIMESTAMPTZ,
  notification_token TEXT,
  events_joined TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  host_id UUID REFERENCES profiles(id),
  host_name TEXT,
  image_url TEXT,
  location_name TEXT,
  address TEXT,
  latitude FLOAT,
  longitude FLOAT,
  event_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 120,
  max_participants INTEGER DEFAULT 8,
  current_participants TEXT[] DEFAULT '{}',
  price FLOAT DEFAULT 0,
  is_premium_only BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'upcoming',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches (mutual likes between two users from same event)
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id_1 UUID REFERENCES profiles(id),
  user_id_2 UUID REFERENCES profiles(id),
  event_id UUID REFERENCES events(id),
  status TEXT DEFAULT 'matched',
  initiated_by UUID,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event likes (post-event anonymous likes)
CREATE TABLE IF NOT EXISTS event_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  from_user_id UUID REFERENCES profiles(id),
  to_user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, from_user_id, to_user_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_likes ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Events
DROP POLICY IF EXISTS "events_select" ON events;
CREATE POLICY "events_select" ON events FOR SELECT USING (true);

DROP POLICY IF EXISTS "events_insert" ON events;
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "events_update_host" ON events;
CREATE POLICY "events_update_host" ON events FOR UPDATE USING (auth.uid() = host_id OR auth.uid() = ANY(current_participants));

DROP POLICY IF EXISTS "events_delete" ON events;
CREATE POLICY "events_delete" ON events FOR DELETE USING (auth.uid() = host_id);

-- Matches
DROP POLICY IF EXISTS "matches_select" ON matches;
CREATE POLICY "matches_select" ON matches FOR SELECT USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

DROP POLICY IF EXISTS "matches_insert" ON matches;
CREATE POLICY "matches_insert" ON matches FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "matches_update" ON matches;
CREATE POLICY "matches_update" ON matches FOR UPDATE USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Messages
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = messages.match_id
    AND (matches.user_id_1 = auth.uid() OR matches.user_id_2 = auth.uid())
  )
);

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = match_id
    AND (matches.user_id_1 = auth.uid() OR matches.user_id_2 = auth.uid())
  )
);

DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = match_id
    AND (matches.user_id_1 = auth.uid() OR matches.user_id_2 = auth.uid())
  )
);

-- Event likes
DROP POLICY IF EXISTS "event_likes_select" ON event_likes;
CREATE POLICY "event_likes_select" ON event_likes FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

DROP POLICY IF EXISTS "event_likes_insert" ON event_likes;
CREATE POLICY "event_likes_insert" ON event_likes FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

-- Run this in Supabase Storage settings OR uncomment if using service_role:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('profile-images', 'profile-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policy: anyone can read, authenticated users can upload
-- (Set up in Supabase Storage UI: Storage > profile-images > Policies)

-- ============================================================
-- SAMPLE DATA (optional - delete after testing)
-- ============================================================
-- Uncomment below to add sample events after creating your first user account:

/*
INSERT INTO events (title, description, category, host_name, location_name, address, event_date, max_participants, price, status) VALUES
('Gemeinsames Kochen: Italienisch', 'Wir kochen zusammen ein 3-Gang-Menü! Alle Level willkommen.', 'Kochen', 'SparkMeet Team', 'Kochschule Mitte', 'Berliner Str. 42, Berlin', NOW() + INTERVAL '3 days', 8, 0, 'upcoming'),
('Sonnenuntergang Wanderung', 'Entspannte 10km Wanderung mit Picknick am Gipfel.', 'Wandern', 'SparkMeet Team', 'Teufelsberg', 'Am Teufelsberg 1, Berlin', NOW() + INTERVAL '5 days', 12, 0, 'upcoming'),
('Brettspielabend', 'Spieleabend mit Catan, Codenames und mehr. BYOB!', 'Spieleabend', 'SparkMeet Team', 'Spielecafé Kreuzberg', 'Oranienstr. 10, Berlin', NOW() + INTERVAL '2 days', 8, 5, 'upcoming'),
('Yoga im Park', 'Anfängerfreundlicher Yoga-Kurs im Freien.', 'Yoga', 'SparkMeet Team', 'Volkspark Friedrichshain', 'Am Volkspark, Berlin', NOW() + INTERVAL '1 day', 10, 0, 'upcoming');
*/
