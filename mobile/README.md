# ChipIn Mobile

## Overview

ChipIn Mobile is the React Native companion app for the ChipIn social payments platform. It connects to the same backend API as the web app and provides native mobile features including Apple Pay, Google Pay, push notifications, and biometric authentication.

## Version

- App Version: 2.0.1
- Build: 12
- iOS Bundle Identifier: com.chipinpool.mobile
- Android Package: com.chipinpool.app

## Tech Stack

- Expo SDK 51
- React Native 0.74
- TypeScript
- React Navigation (Bottom tabs + nested stacks)
- TanStack React Query (data fetching)
- @stripe/stripe-react-native (payments)
- expo-secure-store (session persistence)
- expo-linear-gradient (UI gradients)
- @expo/vector-icons (Ionicons)

## Directory Structure

```
mobile/
├── App.js              # Entry point
├── app.json            # Expo configuration
├── app.config.js       # Dynamic Expo config
├── eas.json            # EAS Build configuration
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
├── assets/             # App icons and splash screens
├── screenshots/        # App store screenshots
├── src/
│   ├── App.tsx         # Root component with providers
│   ├── screens/        # Screen components
│   │   ├── auth/       # Auth screens (Welcome, Login, Register)
│   │   ├── HomeScreen.tsx
│   │   ├── PoolsScreen.tsx
│   │   ├── PoolDetailsScreen.tsx
│   │   ├── CreatePoolScreen.tsx
│   │   ├── WalletScreen.tsx
│   │   ├── CardsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── UserProfileScreen.tsx
│   │   ├── UserSearchScreen.tsx
│   │   ├── SpendNowScreen.tsx
│   │   ├── RewardsScreen.tsx
│   │   ├── NotificationsScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── SecurityScreen.tsx
│   │   ├── RecurringScreen.tsx
│   │   ├── ActivityScreen.tsx
│   │   ├── PaymentMethodsScreen.tsx
│   │   ├── ArchivedPoolsScreen.tsx
│   │   └── ...
│   ├── navigation/     # Navigation setup
│   │   ├── RootNavigator.tsx  # Root stack (Auth vs App)
│   │   ├── AppTabs.tsx        # Tab navigator + nested stacks
│   │   └── AuthStack.tsx      # Auth flow navigator
│   ├── services/       # API & external services
│   │   └── api.ts      # API client connecting to backend
│   ├── theme/          # Theme system
│   │   └── ThemeContext.tsx # Dynamic theming (System/Light/Dark)
│   ├── components/     # Reusable components
│   ├── hooks/          # Custom hooks
│   └── types/          # TypeScript type definitions
└── store/              # Redux store config (if used)
```

## Navigation Structure

```
RootNavigator
├── AuthStack
│   ├── Welcome
│   ├── Login
│   └── Register
└── AppTabs (Bottom Tab Navigator)
    ├── HomeTab
    ├── PoolsStack
    │   ├── PoolsList
    │   ├── PoolDetails
    │   ├── CreatePool
    │   ├── SpendNow
    │   ├── ArchivedPools
    │   ├── UserProfile
    │   └── UserSearch
    ├── WalletTab
    ├── CardsTab
    └── ProfileStack (Modal)
        ├── ProfileMain
        ├── Settings
        ├── Security
        ├── PaymentMethods
        ├── Notifications
        ├── NotificationSettings
        ├── Activity
        ├── Rewards
        ├── Recurring
        ├── UserProfile
        ├── UserSearch
        └── Info pages (Terms, Privacy, About, etc.)
```

## Theme System

The app supports three theme modes: System (follows device setting), Light, and Dark.

- Light theme: Clean fintech palette with white backgrounds and green (#00A878) accents.
- Dark theme: Neo-fintech style with navy (#001F3F) backgrounds and mint (#7FFFD4) accents.
- Theme preference is persisted via SecureStore under the key `@chipinpool_theme_mode`.
- All screens access theme colors through the `useTheme()` hook exported from `src/theme/ThemeContext.tsx`.

## API Connection

- Connects to the backend API. The URL is configurable via `app.config.js` under `extra.apiUrl`.
- Default production endpoint: Azure-hosted backend (`https://chipinpool-csekdvghcqepcthm.centralus-01.azurewebsites.net`).
- Session cookies are persisted via expo-secure-store, allowing sessions to survive app restarts.
- Supports both password-based login (email or username) and OTP-based authentication (email/phone).

## Getting Started

### Prerequisites

- Node.js 20+
- Expo CLI (`npx expo`)
- iOS Simulator or Android Emulator (or physical device with Expo Go)

### Installation

```bash
cd mobile
npm install
```

### Development

```bash
npx expo start
```

Press `i` to open on iOS Simulator, `a` for Android Emulator, or scan the QR code with Expo Go on a physical device.

### Development Builds

For features that require native modules (Stripe payments, Apple Pay, Google Pay, biometric authentication), a development build is required since Expo Go does not support custom native code.

```bash
eas login
eas build:configure
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Production Builds

```bash
npx eas-cli build --platform ios
npx eas-cli build --platform android
```

### App Store Submission

```bash
npx eas-cli submit --platform ios
npx eas-cli submit --platform android
```

## Key Features

- Dashboard with activity preview, notifications badge, and quick actions
- Pool management (create, contribute, share, spend)
- Wallet with balance, transaction history, deposits, and withdrawals
- Virtual Visa cards display
- Spend Now marketplace with category filters and pool/wallet selector
- Activity feed with filtered transaction history
- Notifications with mark-all-read
- Rewards with badges, points history, and leaderboard
- User profiles and following system with search
- Settings with profile editing, theme toggle, and privacy controls
- Security screen with KYC status
- Auto-contributions (recurring scheduled payments)

## Stripe Integration

The app uses `@stripe/stripe-react-native` for payment processing:

- Card payments
- Apple Pay (iOS)
- Google Pay (Android)
- Payment method management
- Financial connections for bank account linking

The Stripe publishable key is fetched from the backend at runtime via `/api/stripe/config`. The merchant identifier is configured as `merchant.com.chipinpool`.

## Push Notifications

Push notifications are handled via `expo-notifications`. The notification icon uses the mint accent color (#7FFFD4). Push tokens are registered with the backend through the `/api/user/push-token` endpoint.

## Biometric Authentication

The app supports biometric authentication (Face ID, Touch ID, fingerprint) via `expo-local-authentication` for secure access on supported devices.
