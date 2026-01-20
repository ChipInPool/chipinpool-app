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
- **Styling**: Tailwind CSS v4 with custom theme (dark fintech theme with electric lime primary color)
- **Fonts**: Plus Jakarta Sans (headings), Inter (UI text)
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

## Recent Changes (January 2026)

### New Features Added:
1. **Recurring Contributions Dashboard** (`/recurring`) - Manage all recurring payments in one place
2. **Pool Analytics** (`/pool/:id/analytics`) - Detailed insights on contribution trends and patterns
3. **Activity Feed** (`/activity`) - See what people you follow are doing
4. **Settings Page** (`/settings`) - Notification preferences and theme toggle
5. **Split Calculator** (`/split-calculator`) - Easy bill splitting tool
6. **Pool Templates** - Quick templates for common pool types (birthday, trip, wedding, etc.)
7. **Transaction History** (`/transactions`) - View all card spending with search/filter
8. **Receipt Attachments** - Transactions support receipt URLs and notes
9. **Dark/Light Theme Toggle** - User can switch between themes

### Authentication

- Session-based authentication using express-session
- Passwords hashed with bcrypt (10 rounds)
- Auth context provider on frontend manages login state
- Protected routes redirect to `/login` when unauthenticated
- Session stored in cookies (7-day expiry, httpOnly, secure in production)

## External Dependencies

### Third-Party Services
- **Fonts**: Google Fonts (Inter, Plus Jakarta Sans)
- **Images**: Unsplash for demo avatars

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

### Build Tools
- **Bundler**: Vite for frontend, esbuild for backend
- **TypeScript**: Strict mode, bundler module resolution
- **PostCSS**: Tailwind CSS processing