# ChipIn - Social Payments & Pooling Platform

A social payments and fund pooling application enabling users to split transactions, pool funds for trips, gifts, and events, and shop together. Features virtual Visa cards, bank payouts, KYC verification, gamified rewards, and recurring auto-contributions.

## Tech Stack

### Frontend (Web)

- React 18, TypeScript, Vite
- Tailwind CSS v4, shadcn/ui, Radix UI
- Framer Motion (animations)
- Wouter (routing)
- TanStack React Query (data fetching)

### Frontend (Mobile)

- Expo SDK 51, React Native 0.74
- React Navigation
- @stripe/stripe-react-native

### Backend

- Node.js, Express.js, TypeScript (ESM)

### Database

- PostgreSQL with Drizzle ORM

### External Services

- **Stripe** - Payments, KYC (Identity), virtual card issuing
- **Plaid** - Bank account linking, ACH transfers
- **Mercury** - Fallback payouts
- **Resend** - Transactional email
- **ClickSend** - SMS notifications
- **Azure Blob Storage** - File storage

## Project Structure

```
/
├── client/              # React web application
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Route page components
│       ├── hooks/       # Custom React hooks
│       └── lib/         # Utilities, API client, auth context
├── server/              # Express.js backend
│   ├── routes.ts        # API route definitions
│   ├── storage.ts       # Database abstraction layer (IStorage)
│   ├── db.ts            # Database connection
│   └── ...              # Service modules
├── shared/              # Shared code between client & server
│   └── schema.ts        # Drizzle ORM schema & Zod validators
├── mobile/              # Expo React Native mobile app
│   └── src/
│       ├── screens/     # Screen components
│       ├── navigation/  # React Navigation setup
│       ├── services/    # API client
│       ├── theme/       # Theme system
│       └── components/  # Shared mobile components
└── scripts/             # Build and utility scripts
```

## Core Features

- **Fund Pooling** - Create pools, invite friends, collect contributions, track progress toward goals
- **Virtual Visa Cards** - Stripe Issuing-powered cards linked to pools for spending
- **Wallet System** - User wallets with deposits, withdrawals, and balance tracking
- **Pay Me Back Links** - Public payment pages at `/@username` for easy fund collection
- **KYC Verification** - Stripe Identity integration for identity verification
- **Bank Account Linking** - Stripe Financial Connections + Plaid for ACH withdrawals
- **Auto-Contributions** - Scheduled recurring payments to pools (weekly, monthly, quarterly)
- **Gamified Rewards** - Badges, points, leaderboards, and streaks
- **Push Notifications** - Real-time browser notifications via Web Push
- **User Profiles & Following** - Profile pages, user search, follow/unfollow, privacy controls
- **Spend Now Marketplace** - Curated partner storefront for spending pool funds
- **ChipInPay Merchant API** - Third-party merchant checkout integration
- **Admin Portal** - User/pool/transaction management, fraud detection, audit logging
- **Theming** - Light/dark mode with navy (#001F3F) primary and mint (#7FFFD4) accent

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database

### Installation

```bash
npm install
```

### Environment Variables

The application requires several environment variables. Key ones include:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `PLAID_CLIENT_ID` | Plaid API client ID |
| `PLAID_SECRET` | Plaid API secret |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage connection |
| `CLICKSEND_USERNAME` | ClickSend SMS username |
| `CLICKSEND_API_KEY` | ClickSend SMS API key |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key |
| `VAPID_EMAIL` | Web Push contact email |
| `SESSION_SECRET` | Express session secret (required in production) |

### Development

```bash
npm run dev          # Start the development server (web + API on port 5000)
npm run db:push      # Push schema changes to database
```

### Build

```bash
npm run build        # Build for production
npm run start        # Start production server
```

### Mobile App

```bash
cd mobile
npm install
npx expo start       # Start Expo development server
```

## API Overview

All API routes are prefixed with `/api/`. Key endpoint groups:

| Endpoint Group | Description |
|---|---|
| `/api/auth/*` | Authentication (register, login, OTP, password reset, MFA) |
| `/api/pools/*` | Pool CRUD, contributions, invitations |
| `/api/user/*` | User profile, wallet, settings, notifications |
| `/api/users/*` | User profiles, following system, search |
| `/api/admin/*` | Admin portal endpoints |
| `/api/plaid/*` | Plaid bank account linking |
| `/api/stripe/*` | Stripe configuration |
| `/api/merchant/*` | ChipInPay merchant integration |

## Database

Uses Drizzle ORM with PostgreSQL. The schema is defined in `shared/schema.ts`.

Key tables:

| Table | Description |
|---|---|
| `users` | User accounts with wallet balances |
| `pools` | Fund pools with targets and deadlines |
| `contributions` | Pool contributions |
| `transactions` | Transaction records |
| `virtualCards` | Stripe Issuing virtual cards |
| `follows` | User following relationships |
| `notifications` | In-app notifications |
| `bankAccounts` | Linked bank accounts |
| `recurringContributions` | Scheduled auto-contributions |
| `walletDeposits` / `walletWithdrawals` | Wallet transaction history |
| `merchants` / `merchantApiKeys` / `merchantCheckoutSessions` | ChipInPay system |
| `badges` / `userBadges` / `userPoints` | Gamification system |
| `adminAuditLogs` | Admin action audit trail |

## License

MIT
