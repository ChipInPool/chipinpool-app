# ChipIn Web Client

## Overview

Single-page web application for the ChipIn social payments platform. The client provides the complete user interface for pool management, contributions, virtual cards, user profiles, rewards, and administrative functionality.

## Technology Stack

- **React 18** with TypeScript
- **Vite** for build tooling and development server
- **Tailwind CSS v4** for utility-first styling
- **shadcn/ui** (Radix UI primitives) for accessible, composable UI components
- **Wouter** for lightweight client-side routing
- **TanStack React Query** for server state management and data fetching
- **Framer Motion** for animations and transitions
- **React Hook Form** + **Zod** for form handling and validation

## Design System

- **Fonts**: Poppins (headings), Inter (body text)
- **Theme**: Supports Light (fintech palette) and Dark (neo-fintech) modes
- **Primary color**: Navy `#001F3F`
- **Accent color**: Mint `#7FFFD4`

## Directory Structure

```
src/
├── components/              # Reusable UI components
│   ├── ui/                  # shadcn/ui base components (Button, Input, Dialog, etc.)
│   ├── layout.tsx           # Main layout with sidebar navigation
│   ├── pool-card.tsx        # Pool display card
│   ├── virtual-card.tsx     # Virtual card display
│   └── theme-provider.tsx   # Theme context provider
├── pages/                   # Route page components
│   ├── home.tsx             # Dashboard
│   ├── landing.tsx          # Public landing page
│   ├── login.tsx            # Authentication
│   ├── profile.tsx          # User's own profile
│   ├── user-profile.tsx     # Other users' profiles
│   ├── user-search.tsx      # User search/discovery
│   ├── create-pool.tsx      # Pool creation
│   ├── pool-details.tsx     # Pool detail view
│   ├── explore.tsx          # Pool discovery
│   ├── settings.tsx         # User settings
│   ├── cards.tsx            # Virtual cards
│   ├── rewards.tsx          # Gamification rewards
│   ├── admin/               # Admin portal pages
│   └── ...                  # Additional pages
├── hooks/                   # Custom React hooks
├── lib/                     # Utilities
│   ├── api.ts               # API client and query keys
│   ├── auth-context.tsx     # Auth state provider
│   ├── push-notifications.ts # Web Push helpers
│   └── upload.ts            # File upload utilities
└── App.tsx                  # Root component with route definitions
```

## Key Patterns

- **Component-based architecture**: UI is composed from small, reusable components with clear responsibilities.
- **Centralized API client**: All API calls are routed through `lib/api.ts`, which defines query keys and fetch wrappers used with TanStack React Query.
- **Session-based authentication**: Auth state is managed via HTTP-only cookies. The `AuthProvider` in `lib/auth-context.tsx` exposes user state to the component tree.
- **Test attributes**: Interactive and data-display elements include `data-testid` attributes for automated testing.

## Development

Run the client in development mode from the project root:

```bash
# Client-only development
npm run dev:client

# Full-stack development (client + server)
npm run dev
```
