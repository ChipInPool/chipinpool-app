# ChipIn - Social Payments & Pooling Platform

## Overview

ChipIn is a social payments and fund pooling application that allows users to split transactions, pool funds, and shop together online and in-store. Users can create pools for trips, gifts, purchases, events, or recurring expenses, invite friends to contribute, and spend collected funds via virtual cards.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state, React Context for auth state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with minimalist theme (navy blue #001F3F primary, mint green #7FFFD4 accent, slate gray #708090 text, white backgrounds)
- **Fonts**: Poppins bold (headings), Inter 400-600 (body text)
- **Animations**: Framer Motion for interactive elements

**Key Design Decisions**:
- Component-based architecture with reusable UI primitives from shadcn/ui
- Form handling with React Hook Form and Zod validation
- Path aliases configured (`@/` for client source, `@shared/` for shared code)
- PWA-ready with manifest.json and service worker support

### Backend Architecture

- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Style**: RESTful JSON API endpoints under `/api/` prefix
- **Session Management**: express-session with cookie-based sessions
- **Password Hashing**: bcrypt for secure password storage

**Key Design Decisions**:
- Shared schema definitions between frontend and backend via `@shared/schema.ts`
- Storage interface pattern (`IStorage`) abstracting database operations
- Development uses Vite middleware for HMR; production serves static build
- Request logging middleware for API debugging

### Data Storage

- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Migrations**: Drizzle Kit (`drizzle-kit push` for schema sync)
- **Connection**: node-postgres (pg) Pool

**Database Schema**:
- `users`: User accounts with balance, stats, notification preferences, and profile info
- `pools`: Fund collection pools with targets, deadlines, and status
- `contributions`: Individual contributions to pools
- `comments`: Discussion on pools
- `notifications`: User notification system
- `virtualCards`: Virtual payment cards linked to pools
- `transactions`: Spending transactions from virtual cards (with receipt/notes support)
- `badges` / `userBadges`: Gamification badges
- `recurringContributions`: Scheduled recurring payments
- `follows`: Social follow relationships between users
- `apiAccessRequests`: Developer API access requests
- `adminAuditLogs`: Audit trail for all admin actions (suspend, unsuspend, etc.)
- `walletDeposits`: Wallet deposit history from Stripe payments
- `walletWithdrawals`: Wallet withdrawal history to bank accounts
- `merchants`: ChipInPay merchant accounts for 3rd party integrations
- `merchantApiKeys`: API keys for merchants with hashed secrets
- `merchantCheckoutSessions`: Checkout sessions with reservation/hold logic
- `merchantWebhookDeliveries`: Webhook delivery logs for merchants
- `merchantPayouts`: Merchant payout history
- `bankAccounts`: Linked bank accounts for payouts (stores routing/account numbers locally)
- `poolTransferRequests`: Pool fund transfer requests with status tracking

## Recent Changes (January 2026)

### New Features Added:
1. **Recurring Contributions Dashboard** (`/recurring`) - Manage all recurring payments in one place
2. **Pool Analytics** (`/pool/:id/analytics`) - Detailed insights on contribution trends and patterns
3. **Activity Feed** (`/activity`) - See what people you follow are doing
4. **Settings Page** (`/settings`) - Notification preferences and theme toggle
5. **Split Calculator** (`/split-calculator`) - Easy bill splitting tool with per-person breakdown and quick pool creation
6. **Pool Templates** - Quick templates for common pool types (birthday, trip, wedding, etc.)
7. **Transaction History** (`/transactions`) - Tabbed view with Card/Pool transactions and Wallet activity (deposits/withdrawals)
8. **Receipt Attachments** - Transactions support receipt URLs and notes
9. **Dark/Light Theme Toggle** - User can switch themes from navbar dropdown (desktop & mobile)
10. **KYC Verification Flow** - Identity verification prompted after signup, required to create pools
    - Uses Stripe Identity (real identity verification, no demo fallback)
11. **Virtual Cards** - Real Stripe Issuing virtual cards with secure ephemeral key-based card detail retrieval
12. **Production Mode** - All APIs use live/production mode (no demo data, no mock fallbacks)
13. **Admin Portal** (`/admin`) - Complete administrative interface with:
    - Dashboard with platform metrics (users, pools, contributions, KYC status)
    - User management with search, suspend/unsuspend actions
    - Pool management with status filtering
    - Transaction monitoring
    - Admin audit logging for all actions
    - Role-based access control (requires `role: 'admin'` in users table)
14. **ChipInPay Merchant Integration** - 3rd party checkout API for businesses:
    - Merchant registration and approval workflow (`/merchant`)
    - API key management with secure hashing
    - Checkout session creation with reservation/hold logic
    - 5% fee calculation and tracking
    - Webhook system for real-time status updates
    - Customer checkout flow (`/chipinpay/checkout/:sessionId`)
    - Admin merchant management (approve/suspend)
15. **Multi-Factor Authentication (MFA)** - TOTP-based 2FA with recovery codes:
    - QR code setup via Google Authenticator or any TOTP app
    - Recovery codes (8 codes) for account recovery
    - MFA verification required during login when enabled
    - Recovery code regeneration (requires current TOTP verification)
16. **Expanded Notification System** - Per-channel per-category notification preferences:
    - Categories: Pool Activity, Security Alerts, KYC Updates, Card Activity, Wallet Activity, Account Changes
    - Channels: Email and SMS with independent per-category toggles
    - Automatic notifications for: 2FA enable/disable, password reset, KYC verification, wallet withdrawals
    - Global channel opt-out respected (notifyEmail/notifySMS gates all category notifications)
17. **Pool Withdrawals** - Simplified bank withdrawal system:
    - Users link bank accounts via Stripe Financial Connections (secure OAuth bank login)
    - Pool creators can withdraw funds to their own linked bank account
    - Pool creators can send transfer requests to any contributor
    - Contributors receive notifications and can accept/decline transfer requests
    - Accept flow includes bank account selection
    - Transfer tracking with status: pending → accepted → completed/cancelled/failed
    - **Regular Users**: Link bank via Financial Connections, receive ACH payouts (1-3 days, free) or instant payouts via debit card (1.5% fee)
    - **Merchants**: Use Stripe Connect for ACH payouts (automated daily payouts from ChipInPay revenue)
    - Legacy Plaid-linked accounts still supported for existing users

### ChipInPay Merchant API:
- `POST /api/v1/merchant/checkout` - Create checkout session
- `GET /api/v1/merchant/checkout/:sessionId` - Get session status
- `POST /api/v1/merchant/checkout/:sessionId/cancel` - Cancel session

### Theme System:
- Custom ThemeProvider in `client/src/components/theme-provider.tsx`
- Light theme: Clean fintech palette with teal primary, blue-gray accents
- Dark theme: Neo-fintech with deep navy and electric lime
- Theme toggle in both desktop navbar and mobile menu

### Authentication & User Registration

**Session Management:**
- Session-based authentication using express-session
- Passwords hashed with bcrypt (10 rounds)
- Auth context provider on frontend manages login state
- Protected routes redirect to `/login` when unauthenticated
- Session stored in cookies (7-day expiry, httpOnly, secure in production)

**User Profile Fields:**
- `firstName`, `lastName`: Full name (required)
- `username`: Unique handle starting with @ (required, lowercase, letters/numbers/underscores only)
- `email`: Unique email address (required)
- `phone`: Phone number with SMS verification (required)
- `dateOfBirth`: Must be 18+ years old (required)
- `authProvider`: 'email', 'google', or 'apple'
- `kycStatus`: Identity verification status via Stripe Identity

**Registration Flow:**
1. User fills form: first/last name, username, email, phone, DOB, password
2. User clicks "Verify Phone & Continue" - SMS code sent via ClickSend
3. User enters 6-digit code from SMS
4. Account created, user logged in automatically
5. Optional KYC verification prompt shown (Stripe Identity)

**Social Login (Coming Soon):**
- Google and Apple sign-in buttons are visible but show "Coming Soon" toast
- Backend OAuth routes will be implemented when credentials are configured

## External Dependencies

### Third-Party Services (Production APIs)
- **Stripe Financial Connections**: Bank account linking and verification for regular users (OAuth-based secure bank login)
- **Stripe Connect**: Payouts to users and merchants (Express accounts for users, Standard for merchants)
- **Plaid** (legacy): Older bank account links still supported via Plaid Transfer API for payouts
- **Stripe**: Payments, Stripe Identity (KYC), Stripe Issuing (virtual cards), Stripe Connect (ChipInPay merchants only)
- **Resend**: Email invitations
- **ClickSend**: SMS invitations
- **Fonts**: Google Fonts (Inter, Plus Jakarta Sans)

### Key NPM Packages
- `@tanstack/react-query`: Server state management
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `zod` / `drizzle-zod`: Runtime type validation
- `bcrypt`: Password hashing
- `express-session`: Session middleware
- `react-circular-progressbar`: Progress visualization
- `framer-motion`: Animations
- `date-fns`: Date formatting
- `lucide-react`: Icon library
- `plaid`: Plaid SDK for legacy bank account support

### Build Tools
- **Bundler**: Vite for frontend, esbuild for backend
- **TypeScript**: Strict mode, bundler module resolution
- **PostCSS**: Tailwind CSS processing

## Mobile App (Expo/React Native)

A native mobile app is available in the `/mobile` folder, built with Expo and React Native.

### Mobile Architecture
- **Framework**: Expo SDK 51 with React Native 0.74
- **Navigation**: React Navigation (native-stack + bottom-tabs)
- **State Management**: TanStack React Query (same as web)
- **Styling**: React Native StyleSheet with ChipInPool theme colors
- **Payments**: @stripe/stripe-react-native for Apple Pay, Google Pay, cards
- **Storage**: expo-secure-store for session cookies

### Mobile Screens
- **Auth Stack**: Welcome, Login, Register (with phone verification), 2FA
- **App Tabs**: Home, Pools, Wallet, Cards, Profile
- **Additional**: Pool Details, Create Pool, Payment Methods

### Mobile Setup
```bash
cd mobile
npm install
npm start  # Expo dev server
```

For Stripe payments (Apple Pay, Google Pay), use EAS development builds:
```bash
eas build --profile development --platform ios
```

### API Connection
Mobile connects to the same backend API at `chipinpool.azurewebsites.net`. Session cookies are persisted via SecureStore.