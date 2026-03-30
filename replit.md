# SparkMeet — iOS Dating App

A production-ready iOS dating app built with Expo/React Native where singles connect through shared local events.

## Concept

No swiping — users join events (cooking, hiking, game nights, yoga, etc.), meet 4-8 singles, then anonymously like each other after the event. Mutual likes create matches with private chat.

## Architecture

- **Frontend**: Expo / React Native (Expo Router, file-based routing)
- **Backend/DB**: Supabase (auth, PostgreSQL, realtime, storage)
- **API Server**: Express.js (port 8080) — AI personality endpoint
- **AI**: Replit AI Integration (OpenAI via `http://localhost:1106/modelfarm/openai`)
- **State**: React Query for server state, React Context for auth/profile
- **Payments**: Mocked RevenueCat paywall (sets is_pro=true in Supabase)
- **Theme**: Dark mode only (#0A0A0F background, #7C6FFF primary purple)
- **Language**: German (all UI text in German)

## API Routing (Dev)

The Expo Metro dev server (port 18115) proxies `/api/*` requests to the Express API server (port 8080) via `metro.config.js` middleware. The API server calls the AI integration at `localhost:1106`. This means:
- All API calls from mobile work in both web preview and Expo Go
- AI key/URL never exposed to clients

## Key Files

```
artifacts/mobile/
  app/
    _layout.tsx          - Root layout (Auth + Profile providers)
    index.tsx            - Auth redirector (auth → onboarding → tabs)
    api/
      personality+api.ts - Expo Router API route (unused in dev; Metro proxy intercepts)
    (auth)/              - Login, Register, Forgot Password
    (onboarding)/        - 6-step onboarding:
      name-age.tsx       - Step 1: Name
      birthdate.tsx      - Step 2: Birthdate + live zodiac sign reveal (NEW)
      gender.tsx         - Step 3: Gender & looking-for
      interests.tsx      - Step 4: Event interests
      ai-interview.tsx   - Step 5: AI personality interview, 3 questions (NEW)
      photos.tsx         - Step 6: Profile photos (saves all to Supabase)
    (tabs)/              - Events feed, Matches list, Profile
    event/[id].tsx       - Event detail + join
    post-like/[eventId].tsx - Post-event anonymous liking
    chat/[matchId].tsx   - Match chat with realtime messages
    edit-profile.tsx     - Profile editing (height, occupation, zodiac read-only)
    create-event.tsx     - Create event (Pro only)
    paywall.tsx          - Freemium upgrade screen
  lib/
    supabase.ts          - Supabase client singleton
    types.ts             - TypeScript types, CATEGORIES, freemium constants
    zodiac.ts            - Zodiac sign calculation + element color helpers (NEW)
  context/
    AuthContext.tsx      - Supabase auth state
    ProfileContext.tsx   - Profile data + freemium limits
  components/
    EventCard.tsx        - Event card component
    Skeleton.tsx         - Loading skeleton components
  constants/
    colors.ts            - SparkMeet dark theme colors
  metro.config.js        - Proxy middleware: /api/* → localhost:8080 (NEW)

artifacts/api-server/
  src/
    routes/
      health.ts          - GET /api/healthz
      personality.ts     - POST /api/personality (AI personality summary) (NEW)
```

## Environment Variables

- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key (public)
- `EXPO_PUBLIC_DOMAIN` — Replit dev domain (set automatically by workflow)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — AI proxy URL (server-side only, localhost:1106)
- `AI_INTEGRATIONS_OPENAI_API_KEY` — Dummy key for AI SDK compatibility

## Database Setup

**IMPORTANT**: You must run `sql/schema.sql` in the Supabase SQL Editor before the app's database features will work:
1. Go to https://supabase.com/dashboard/project/oxjfeegkiqwwktxfgcrw/sql
2. Paste and run the entire contents of `sql/schema.sql`
3. Create a `profile-images` storage bucket (public) in Supabase Storage

**Migration (for existing databases)**:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthdate DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zodiac_sign TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personality_summary TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_answers JSONB DEFAULT '[]';
```

## Supabase Schema

- `profiles` — User profiles (now includes birthdate, zodiac_sign, height_cm, occupation, personality_summary, ai_answers)
- `events` — Local events with participants array
- `matches` — Mutual likes → matches between users
- `messages` — Chat messages per match (realtime)
- `event_likes` — Anonymous post-event likes (creates matches on mutual)

## Freemium Limits

- **Free**: 3 events max, 5 matches max, no event creation
- **Pro**: Unlimited events, matches, event creation, boost, premium event access
- Paywall mocked (sets `is_pro=true` and `pro_expires_at` in Supabase)

## Running

The Expo dev server runs on port 18115. Scan the QR code in the Replit URL bar with Expo Go to test on device.

## Languages & Key Dependencies

- TypeScript / React Native 0.81.5
- Expo SDK 54
- @supabase/supabase-js ^2.x
- @tanstack/react-query
- expo-router ~6.0.x
- expo-linear-gradient
- react-native-reanimated, expo-haptics, expo-image-picker, expo-location
