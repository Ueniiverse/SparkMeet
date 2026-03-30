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
-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

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

-- Only host can update event metadata (join/leave uses SECURITY DEFINER RPCs)
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

-- Match creation restricted: caller must be a party AND a mutual event_like must exist
DROP POLICY IF EXISTS "matches_insert" ON matches;
CREATE POLICY "matches_insert" ON matches FOR INSERT WITH CHECK (
  (auth.uid() = user_id_1 OR auth.uid() = user_id_2)
  AND
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

-- Event likes: only participants can like
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
-- Bypass RLS for tightly-scoped participant operations.
-- Freemium limits enforced server-side here.
-- ============================================================

-- Free tier constants
-- FREE_MAX_EVENTS = 3, FREE_MAX_MATCHES = 5

-- join_event: Authenticated user joins an event (enforces free-tier caps + premium-only gate)
CREATE OR REPLACE FUNCTION join_event(p_event_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_participants TEXT[];
  v_max INT;
  v_is_premium BOOLEAN;
  v_user_events_count INT;
  v_user_is_pro BOOLEAN;
  v_user_pro_expires TIMESTAMPTZ;
BEGIN
  -- Load event info
  SELECT current_participants, max_participants, is_premium_only
  INTO v_participants, v_max, v_is_premium
  FROM events WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Already joined — idempotent
  IF auth.uid()::text = ANY(v_participants) THEN
    RETURN;
  END IF;

  -- Load caller's Pro status
  SELECT is_pro, pro_expires_at, array_length(events_joined, 1)
  INTO v_user_is_pro, v_user_pro_expires, v_user_events_count
  FROM profiles WHERE id = auth.uid();

  -- Determine effective Pro status (expired subscriptions treated as free)
  IF v_user_pro_expires IS NOT NULL AND v_user_pro_expires < NOW() THEN
    v_user_is_pro := FALSE;
  END IF;

  -- Enforce premium-only gate
  IF v_is_premium AND NOT COALESCE(v_user_is_pro, FALSE) THEN
    RAISE EXCEPTION 'PREMIUM_ONLY';
  END IF;

  -- Enforce free-tier event cap (3 events max)
  IF NOT COALESCE(v_user_is_pro, FALSE) AND COALESCE(v_user_events_count, 0) >= 3 THEN
    RAISE EXCEPTION 'FREE_LIMIT_EVENTS';
  END IF;

  -- Check capacity
  IF COALESCE(array_length(v_participants, 1), 0) >= v_max THEN
    RAISE EXCEPTION 'Event is full';
  END IF;

  -- Join
  UPDATE events
  SET current_participants = array_append(current_participants, auth.uid()::text)
  WHERE id = p_event_id;

  UPDATE profiles
  SET events_joined = array_append(events_joined, p_event_id::text),
      last_active = NOW()
  WHERE id = auth.uid() AND NOT (p_event_id::text = ANY(COALESCE(events_joined, ARRAY[]::TEXT[])));
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
  SET events_joined = array_remove(events_joined, p_event_id::text),
      last_active = NOW()
  WHERE id = auth.uid();
END;
$$;

-- create_match: Atomically check mutual like + free-tier match cap + create match
-- Returns the new match id, or NULL if match already exists
CREATE OR REPLACE FUNCTION create_match(p_event_id UUID, p_other_user_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match_id UUID;
  v_match_count INT;
  v_is_pro BOOLEAN;
  v_pro_expires TIMESTAMPTZ;
  v_mutual BOOLEAN;
BEGIN
  -- Verify mutual event_like exists
  SELECT EXISTS(
    SELECT 1 FROM event_likes el1
    JOIN event_likes el2
      ON el1.event_id = el2.event_id
      AND el1.from_user_id = el2.to_user_id
      AND el1.to_user_id = el2.from_user_id
    WHERE el1.event_id = p_event_id
      AND el1.from_user_id = auth.uid()
      AND el1.to_user_id = p_other_user_id
  ) INTO v_mutual;

  IF NOT v_mutual THEN
    RAISE EXCEPTION 'NO_MUTUAL_LIKE';
  END IF;

  -- Check if match already exists
  SELECT id INTO v_match_id FROM matches
  WHERE event_id = p_event_id
    AND (
      (user_id_1 = auth.uid() AND user_id_2 = p_other_user_id) OR
      (user_id_1 = p_other_user_id AND user_id_2 = auth.uid())
    )
  LIMIT 1;

  IF v_match_id IS NOT NULL THEN
    RETURN v_match_id; -- Already exists
  END IF;

  -- Load caller's Pro status
  SELECT is_pro, pro_expires_at INTO v_is_pro, v_pro_expires
  FROM profiles WHERE id = auth.uid();

  IF v_pro_expires IS NOT NULL AND v_pro_expires < NOW() THEN
    v_is_pro := FALSE;
  END IF;

  -- Enforce free-tier match cap (5 matches max)
  IF NOT COALESCE(v_is_pro, FALSE) THEN
    SELECT COUNT(*) INTO v_match_count FROM matches
    WHERE user_id_1 = auth.uid() OR user_id_2 = auth.uid();

    IF v_match_count >= 5 THEN
      RAISE EXCEPTION 'FREE_LIMIT_MATCHES';
    END IF;
  END IF;

  -- Create the match
  INSERT INTO matches (user_id_1, user_id_2, event_id, status, initiated_by)
  VALUES (auth.uid(), p_other_user_id, p_event_id, 'matched', auth.uid())
  RETURNING id INTO v_match_id;

  RETURN v_match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_match(UUID, UUID) TO authenticated;

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
-- Uses only the 8 app categories: Kochen, Wandern, Sport, Kultur,
-- Spieleabend, Café, Konzert, Yoga
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
 NOW() + INTERVAL '3 days' + INTERVAL '18 hours' + INTERVAL '30 minutes', 180, 8, 5, 'upcoming', ARRAY['Spieleabend'], false),

('Wanderung: Tegernsee Panoramaweg',
 'Entspannte 12km-Wanderung rund um den Tegernsee mit Picknick-Stop. Festes Schuhwerk empfohlen.',
 'Wandern', 'SparkMeet Team', 'Tegernsee', 'Bahnhof Tegernsee, 83684 Tegernsee',
 NOW() + INTERVAL '4 days' + INTERVAL '9 hours', 240, 12, 0, 'upcoming', ARRAY['Wandern', 'Natur'], false),

('Kulturabend: Pinakothek & Abendessen',
 'Gemeinsamer Besuch der Pinakothek der Moderne, anschließend Abendessen in der Nähe. Eintritt inklusive.',
 'Kultur', 'SparkMeet Team', 'Pinakothek der Moderne', 'Barer Str. 40, 80333 München',
 NOW() + INTERVAL '5 days' + INTERVAL '17 hours', 180, 8, 10, 'upcoming', ARRAY['Kultur', 'Kunst'], false),

('Yoga & Meditation im Olympiapark',
 'Kombinierter Yoga- und Meditations-Kurs für Einsteiger am Olympiasee. Bitte Matte mitbringen.',
 'Yoga', 'SparkMeet Team', 'Olympiapark München', 'Olympiazentrum, 80809 München',
 NOW() + INTERVAL '6 days' + INTERVAL '10 hours', 90, 10, 0, 'upcoming', ARRAY['Yoga', 'Meditation'], false),

('Café-Hopping Schwabing',
 'Wir besuchen 3 ausgesuchte Cafés in Schwabing — Kaffee, Kuchen und gute Gespräche garantiert.',
 'Café', 'SparkMeet Team', 'Treffpunkt Münchner Freiheit', 'Münchner Freiheit, 80802 München',
 NOW() + INTERVAL '7 days' + INTERVAL '14 hours', 150, 8, 0, 'upcoming', ARRAY['Café', 'Schwabing'], false),

('Klettern für Einsteiger',
 'Kletterkurs für absolute Anfänger — Sicherung, Technik und erste Routen. Equipment inklusive.',
 'Sport', 'SparkMeet Team', 'DAV Kletterzentrum München', 'Thalkirchner Str. 207, 81371 München',
 NOW() + INTERVAL '8 days' + INTERVAL '17 hours', 150, 6, 12, 'upcoming', ARRAY['Sport', 'Klettern'], false),

('Jazzkonzert: Blue Note Evening',
 'Live-Jazz-Abend mit lokalen Münchner Bands. Dresscode: smart casual. Tisch-Reservierung inklusive.',
 'Konzert', 'SparkMeet Team', 'Jazz-Bar Unterfahrt', 'Einsteinstr. 42, 81675 München',
 NOW() + INTERVAL '10 days' + INTERVAL '20 hours', 180, 8, 25, 'upcoming', ARRAY['Konzert', 'Jazz'], true),

('Sushi-Kochkurs',
 'Lerne Sushi-Rollen, Nigiri und Sashimi selbst herzustellen. Alle Zutaten werden gestellt.',
 'Kochen', 'SparkMeet Team', 'Kochschule Asiavibe', 'Rosenheimer Str. 145, 81671 München',
 NOW() + INTERVAL '12 days' + INTERVAL '18 hours' + INTERVAL '30 minutes', 180, 8, 20, 'upcoming', ARRAY['Kochen', 'Japan'], false)

ON CONFLICT DO NOTHING;
