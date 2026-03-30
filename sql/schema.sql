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

-- Only host can insert
DROP POLICY IF EXISTS "events_insert" ON events;
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (auth.uid() = host_id);

-- Only host can update event metadata (join/leave uses a SECURITY DEFINER RPC)
DROP POLICY IF EXISTS "events_update_host" ON events;
DROP POLICY IF EXISTS "events_update_participant" ON events;
CREATE POLICY "events_update_host" ON events FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "events_delete" ON events;
CREATE POLICY "events_delete" ON events FOR DELETE USING (auth.uid() = host_id);

-- Matches: users can only see their own matches
DROP POLICY IF EXISTS "matches_select" ON matches;
CREATE POLICY "matches_select" ON matches FOR SELECT USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Match creation uses SECURITY DEFINER RPC; direct insert only allowed if mutual like exists
DROP POLICY IF EXISTS "matches_insert" ON matches;
CREATE POLICY "matches_insert" ON matches FOR INSERT WITH CHECK (
  -- Caller must be one of the two parties
  (auth.uid() = user_id_1 OR auth.uid() = user_id_2)
  AND
  -- A mutual like must exist for this event between these two users
  EXISTS (
    SELECT 1 FROM event_likes el1
    JOIN event_likes el2
      ON el1.event_id = el2.event_id
      AND el1.from_user_id = el2.to_user_id
      AND el1.to_user_id = el2.from_user_id
    WHERE el1.event_id = matches.event_id
      AND (
        (el1.from_user_id = matches.user_id_1 AND el1.to_user_id = matches.user_id_2)
        OR
        (el1.from_user_id = matches.user_id_2 AND el1.to_user_id = matches.user_id_1)
      )
  )
);

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

-- Event likes: only participants can like, and only about other participants
DROP POLICY IF EXISTS "event_likes_select" ON event_likes;
CREATE POLICY "event_likes_select" ON event_likes FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

DROP POLICY IF EXISTS "event_likes_insert" ON event_likes;
CREATE POLICY "event_likes_insert" ON event_likes FOR INSERT WITH CHECK (
  auth.uid() = from_user_id AND
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_id
    AND auth.uid()::text = ANY(events.current_participants)
  )
);

-- ============================================================
-- SECURITY DEFINER RPCs
-- These bypass RLS to perform tightly-scoped participant updates
-- and match creation atomically.
-- ============================================================

-- join_event: Authenticated user joins an event
CREATE OR REPLACE FUNCTION join_event(p_event_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_participants TEXT[];
  v_max INT;
  v_is_premium BOOLEAN;
BEGIN
  SELECT current_participants, max_participants, is_premium_only
  INTO v_participants, v_max, v_is_premium
  FROM events WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  IF auth.uid()::text = ANY(v_participants) THEN
    RETURN; -- Already joined
  END IF;
  IF array_length(v_participants, 1) >= v_max THEN
    RAISE EXCEPTION 'Event is full';
  END IF;

  UPDATE events
  SET current_participants = array_append(current_participants, auth.uid()::text)
  WHERE id = p_event_id;

  UPDATE profiles
  SET events_joined = array_append(events_joined, p_event_id::text)
  WHERE id = auth.uid() AND NOT (p_event_id::text = ANY(events_joined));
END;
$$;

-- leave_event: Authenticated user leaves an event
CREATE OR REPLACE FUNCTION leave_event(p_event_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE events
  SET current_participants = array_remove(current_participants, auth.uid()::text)
  WHERE id = p_event_id;

  UPDATE profiles
  SET events_joined = array_remove(events_joined, p_event_id::text)
  WHERE id = auth.uid();
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION join_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION leave_event(UUID) TO authenticated;

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

-- Run this in Supabase Storage settings OR uncomment if using service_role:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('profile-images', 'profile-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED DATA — 10 Munich events for the next 2 weeks
-- ============================================================

INSERT INTO events (title, description, category, host_name, location_name, address, event_date, duration_minutes, max_participants, price, status, tags, is_premium_only) VALUES

('Gemeinsam Kochen: Pasta & Wein',
 'Wir kochen zusammen ein 3-Gang-Menü mit frischer Pasta und verkosten Weine aus der Toskana. Alle Level willkommen!',
 'Kochen', 'SparkMeet Team', 'Kochschule München Mitte', 'Sendlinger Str. 12, 80331 München',
 NOW() + INTERVAL '1 day' + INTERVAL '19 hours', 150, 8, 0, 'upcoming', ARRAY['Kochen', 'Wein'], false),

('Sonnenaufgang Yoga im Englischen Garten',
 'Begrüße den Morgen mit einer gemeinsamen Yoga-Session am Kleinhesseloher See. Matte mitbringen.',
 'Yoga', 'SparkMeet Team', 'Englischer Garten', 'Kleinhesseloher See, 80802 München',
 NOW() + INTERVAL '2 days' + INTERVAL '7 hours', 90, 12, 0, 'upcoming', ARRAY['Yoga', 'Natur'], false),

('Brettspielabend: Catan, Codenames & mehr',
 'Spieleabend mit Catan, Codenames, 7 Wonders und Mysterium. BYOB! Anfänger & Profis willkommen.',
 'Spieleabend', 'SparkMeet Team', 'Spielecafé Schwabing', 'Leopoldstr. 85, 80802 München',
 NOW() + INTERVAL '3 days' + INTERVAL '18 hours' + INTERVAL '30 minutes', 180, 8, 5, 'upcoming', ARRAY['Spiele', 'Gesellschaft'], false),

('Wanderung: Tegernsee Panoramaweg',
 'Entspannte 12km-Wanderung rund um den Tegernsee mit Picknick-Stop. Festes Schuhwerk empfohlen.',
 'Wandern', 'SparkMeet Team', 'Tegernsee', 'Bahnhof Tegernsee, 83684 Tegernsee',
 NOW() + INTERVAL '4 days' + INTERVAL '9 hours', 240, 12, 0, 'upcoming', ARRAY['Wandern', 'Natur'], false),

('Improv-Theater Workshop',
 'Lerne Improvisationstheater in einer lockeren Gruppe — kein Vorwissen nötig! Viel Spaß garantiert.',
 'Kreativ', 'SparkMeet Team', 'Theater Halle 7', 'Dachauer Str. 90, 80335 München',
 NOW() + INTERVAL '5 days' + INTERVAL '19 hours' + INTERVAL '30 minutes', 120, 8, 10, 'upcoming', ARRAY['Theater', 'Kreativ'], false),

('Yoga & Meditation im Olympiapark',
 'Kombinierter Yoga- und Meditations-Kurs für Einsteiger am Olympiasee. Bitte Matte mitbringen.',
 'Yoga', 'SparkMeet Team', 'Olympiapark München', 'Olympiazentrum, 80809 München',
 NOW() + INTERVAL '6 days' + INTERVAL '10 hours', 90, 10, 0, 'upcoming', ARRAY['Yoga', 'Meditation'], false),

('Craft-Beer Tasting',
 'Wir verkosten 8 lokale Craft-Biere aus Bayern mit kleinen Snacks. Kein Bierkenner nötig.',
 'Essen & Trinken', 'SparkMeet Team', 'Hopfenreich München', 'Nockherstr. 30, 81541 München',
 NOW() + INTERVAL '7 days' + INTERVAL '18 hours', 120, 8, 15, 'upcoming', ARRAY['Bier', 'Tasting'], false),

('Klettern für Einsteiger',
 'Kletterkurs für absolute Anfänger — Sicherung, Technik und erste Routen. Equipment inklusive.',
 'Sport', 'SparkMeet Team', 'DAV Kletterzentrum München', 'Thalkirchner Str. 207, 81371 München',
 NOW() + INTERVAL '8 days' + INTERVAL '17 hours', 150, 6, 12, 'upcoming', ARRAY['Klettern', 'Sport'], false),

('Sushi-Kochkurs',
 'Lerne Sushi-Rollen, Nigiri und Sashimi selbst herzustellen. Alle Zutaten werden gestellt.',
 'Kochen', 'SparkMeet Team', 'Kochschule Asiavibe', 'Rosenheimer Str. 145, 81671 München',
 NOW() + INTERVAL '10 days' + INTERVAL '18 hours' + INTERVAL '30 minutes', 180, 8, 25, 'upcoming', ARRAY['Kochen', 'Japan'], true),

('Abendspaziergang: Isar Nordufer',
 'Entspannter 8km-Abendspaziergang entlang der Isar von Wiener Platz bis Flaucher mit Grillstation.',
 'Wandern', 'SparkMeet Team', 'Wiener Platz', 'Wiener Platz, 81667 München',
 NOW() + INTERVAL '12 days' + INTERVAL '18 hours', 120, 12, 0, 'upcoming', ARRAY['Spazieren', 'Isar'], false)

ON CONFLICT DO NOTHING;
