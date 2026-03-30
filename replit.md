# SparkMeet — iOS Dating App

A production-ready iOS dating app built with Expo/React Native where singles connect through shared local events.

## Concept

No swiping — users join events (cooking, hiking, game nights, yoga, etc.), meet 4-8 singles, then anonymously like each other after the event. Mutual likes create matches with private chat.

## Architecture

- **Frontend**: Expo / React Native (Expo Router, file-based routing)
- **Backend/DB**: Supabase (auth, PostgreSQL, realtime, storage)
- **State**: React Query for server state, React Context for auth/profile
- **Payments**: Mocked RevenueCat paywall (sets is_pro=true in Supabase)
- **Theme**: Dark mode only (#0A0A0F background, #7C6FFF primary purple)

## Key Files

```
artifacts/mobile/
  app/
    _layout.tsx          - Root layout (Auth + Profile providers)
    index.tsx            - Auth redirector (auth → onboarding → tabs)
    (auth)/              - Login, Register, Forgot Password
    (onboarding)/        - 5-step onboarding (welcome, name/age, gender, interests, photos)
    (tabs)/              - Events feed, Matches list, Profile
    event/[id].tsx       - Event detail + join
    post-like/[eventId].tsx - Post-event anonymous liking
    chat/[matchId].tsx   - Match chat with realtime messages
    edit-profile.tsx     - Profile editing
    create-event.tsx     - Create event (Pro only)
    paywall.tsx          - Freemium upgrade screen
  lib/
    supabase.ts          - Supabase client singleton
    types.ts             - TypeScript types, CATEGORIES, freemium constants
  context/
    AuthContext.tsx      - Supabase auth state
    ProfileContext.tsx   - Profile data + freemium limits
  components/
    EventCard.tsx        - Event card component
    Skeleton.tsx         - Loading skeleton components
  constants/
    colors.ts            - SparkMeet dark theme colors
```

## Environment Variables

- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key (public)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-side only)
- `SUPABASE_PROJECT_REF` — Project reference: oxjfeegkiqwwktxfgcrw

## Database Setup

**IMPORTANT**: You must run `sql/schema.sql` in the Supabase SQL Editor before the app's database features will work:
1. Go to https://supabase.com/dashboard/project/oxjfeegkiqwwktxfgcrw/sql
2. Paste and run the entire contents of `sql/schema.sql`
3. Create a `profile-images` storage bucket (public) in Supabase Storage

## Supabase Schema

- `profiles` — User profiles extending auth.users
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
- react-native-reanimated, expo-haptics, expo-image-picker, expo-location
