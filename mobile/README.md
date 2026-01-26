# ChipInPool Mobile App

React Native mobile app for ChipInPool using Expo.

## Prerequisites

- Node.js 20+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Xcode (for iOS development on Mac)
- Android Studio (for Android development)

## Setup

1. **Install dependencies:**
   ```bash
   cd mobile
   npm install
   ```

2. **Start development server:**
   ```bash
   npm start
   ```

3. **Run on device/simulator:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your phone

## Development Builds

For features like Stripe payments, Apple Pay, and Google Pay, you need a development build (Expo Go won't work).

1. **Login to EAS:**
   ```bash
   eas login
   ```

2. **Configure project:**
   ```bash
   eas build:configure
   ```

3. **Create development build:**
   ```bash
   # For iOS
   eas build --profile development --platform ios

   # For Android
   eas build --profile development --platform android

   # For both
   npm run build:dev
   ```

4. **Install the development build** on your device and run the app.

## Project Structure

```
mobile/
├── src/
│   ├── app/           # App entry point
│   ├── navigation/    # Navigation stacks and tabs
│   ├── screens/       # Screen components
│   │   ├── auth/      # Authentication screens
│   │   └── ...        # App screens
│   ├── components/    # Shared components
│   ├── services/      # API client, Stripe
│   ├── hooks/         # Custom hooks (useAuth, etc.)
│   └── types/         # Type definitions
├── assets/            # Images, fonts
├── app.json           # Expo configuration
├── package.json
└── tsconfig.json
```

## Key Features

- **Authentication**: Email/password login, phone verification, 2FA
- **Pools**: Create, view, and contribute to pools
- **Wallet**: View balance, transactions, add funds
- **Virtual Cards**: View and manage pool virtual cards
- **Payment Methods**: Link bank accounts and debit cards
- **Profile**: User settings and account management

## API Configuration

The app connects to the ChipInPool backend. Update the API URL in `app.json`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://chipinpool.azurewebsites.net"
    }
  }
}
```

## Stripe Integration

The app uses `@stripe/stripe-react-native` for:
- Card payments
- Apple Pay
- Google Pay
- Payment method management

Configure merchant identifier in `app.json`:
```json
{
  "plugins": [
    [
      "@stripe/stripe-react-native",
      {
        "merchantIdentifier": "merchant.com.chipinpool",
        "enableGooglePay": true
      }
    ]
  ]
}
```

## Building for Production

```bash
# Preview build (internal testing)
npm run build:preview

# Production build (App Store/Play Store)
npm run build:prod
```

## App Store Submission

1. Create app in App Store Connect
2. Create app in Google Play Console
3. Run production build
4. Submit via EAS Submit:
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```
