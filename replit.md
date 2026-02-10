# ChipIn - Social Payments & Pooling Platform

## Overview

ChipIn is a social payments and fund pooling application that enables users to split transactions, pool funds for various purposes (trips, gifts, events), and shop together online and in-store. It facilitates collective spending through virtual cards and offers features like recurring contributions, real-time notifications, and a merchant integration API. The platform aims to simplify group finances and enhance social commerce experiences.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query (server state), React Context (auth state)
- **UI Components**: shadcn/ui on Radix UI primitives
- **Styling**: Tailwind CSS v4 with a minimalist theme (navy blue primary, mint green accent, slate gray text)
- **Fonts**: Poppins (headings), Inter (body text)
- **Animations**: Framer Motion
- **Key Design Decisions**: Component-based architecture, React Hook Form with Zod validation, PWA-ready.
- **Theme System**: Custom ThemeProvider with Light (fintech palette) and Dark (neo-fintech) themes, user-toggleable.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Style**: RESTful JSON API (`/api/` prefix)
- **Session Management**: `express-session` with cookie-based sessions
- **Security**: bcrypt for password hashing
- **Key Design Decisions**: Shared schema definitions (`@shared/schema.ts`), `IStorage` interface for database abstraction.

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with `drizzle-zod` for validation
- **Migrations**: Drizzle Kit
- **Core Schemas**: `users`, `pools`, `contributions`, `transactions`, `virtualCards`, `notifications`, `comments`, `recurringContributions`, `walletDeposits`, `walletWithdrawals`, `merchants`, `merchantApiKeys`, `merchantCheckoutSessions`, `bankAccounts`.

### Core Features & Design
- **Fund Pooling**: Users create pools, invite friends, collect funds, and spend via virtual cards.
- **Pay Me Back Links**: Public payment pages for easy fund collection.
- **Push Notifications**: Real-time browser notifications for key activities (contributions, milestones).
- **Auto-Contributions**: Scheduled recurring payments to pools from wallet balance.
- **Wallet & Withdrawals**: User wallets for funds, with admin-processed withdrawals to linked bank accounts via Stripe Financial Connections.
- **KYC Verification**: Identity verification via Stripe Identity for pool creation and withdrawals.
- **Virtual Cards**: Stripe Issuing virtual cards linked to pools.
- **Admin Portal**: Comprehensive interface for user, pool, transaction management, and audit logging.
- **ChipInPay Merchant Integration**: API for third-party merchants to integrate ChipIn's checkout system.
- **Spend Now Marketplace**: Curated partner storefront where users browse partnered businesses and shop directly using pool funds via ChipInPay. Admin manages partnerships (categories, featured status, promo text, discount offers) through the merchant admin portal.
- **Email Template System**: Centralized email template engine (`server/emailTemplates.ts`) with consistent branding (navy/mint green theme), responsive layout, and reusable components (headings, buttons, info cards, alerts, verification codes).
- **Multi-Factor Authentication (MFA)**: TOTP-based 2FA with recovery codes.
- **Authentication**: Session-based, bcrypt hashed passwords, social login (planned). User registration includes SMS verification.

### Mobile App (Expo/React Native)
- **Framework**: Expo SDK 51, React Native 0.74
- **Navigation**: React Navigation (Bottom tabs + nested stacks for Pools and Profile)
- **State Management**: TanStack React Query
- **Styling**: React Native StyleSheet with ChipInPool theme colors (navy #001F3F, mint #7FFFD4)
- **Payments**: `@stripe/stripe-react-native` for Apple Pay, Google Pay.
- **API Connection**: Connects to the same backend API, persisting session cookies via SecureStore.
- **Screens**: Home (dashboard with activity preview, notifications badge, quick actions), Pools (list, details with contribute modal, share, Spend Now link), Wallet (balance, transactions), Cards (virtual Visa cards), Profile (settings, security, activity, rewards, notifications links), Spend Now Marketplace (category filters, pool selector, partner cards), Activity Feed (filtered transaction history), Notifications (real-time alerts with mark-all-read), Rewards (badges, points history, leaderboard tabs), Settings (profile editing, preferences), Security (KYC status, 2FA status).
- **Version**: 1.1.0

## External Dependencies

### File Storage
- **Unified FileStorageService**: Supports Replit Object Storage (development) and Azure Blob Storage (production).

### Third-Party Services
- **Plaid**: Bank account linking (Plaid Link) and transfers (Plaid Transfer) for ACH withdrawals.
- **Mercury Banking API**: Fallback payout method for non-Plaid accounts (admin-approved).
- **Stripe**: Payments, Stripe Identity (KYC), Stripe Issuing (virtual cards), Stripe Financial Connections (bank account linking), Stripe Connect (merchant payouts).
- **Resend**: Email invitations.
- **ClickSend**: SMS invitations.
- **Google Fonts**: Inter, Poppins.

### Key NPM Packages
- `@tanstack/react-query`
- `drizzle-orm`, `drizzle-kit`, `drizzle-zod`
- `bcrypt`
- `express-session`
- `framer-motion`
- `zod`

### Build Tools
- **Bundler**: Vite (frontend), esbuild (backend)
- **TypeScript**: Strict mode
- **PostCSS**: Tailwind CSS processing