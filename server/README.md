# ChipIn Server

## Overview

RESTful API backend for the ChipIn social payments platform. The server handles authentication, pool management, payment processing, notifications, and all business logic for the application.

## Technology Stack

- **Node.js** with **Express.js**
- **TypeScript** (ESM modules)
- **PostgreSQL** via **Drizzle ORM** (Neon serverless driver)
- **express-session** for session-based authentication
- **bcrypt** for password hashing
- **Zod** (via drizzle-zod) for request validation

## Key Files

```
server/
├── index.ts                 # Server entry point
├── routes.ts                # All API route definitions
├── storage.ts               # IStorage interface and DatabaseStorage implementation
├── db.ts                    # Database connection (Drizzle + Neon)
├── stripeClient.ts          # Stripe SDK integration
├── plaidTransferClient.ts   # Plaid transfer service
├── mercuryClient.ts         # Mercury Banking API client
├── resendClient.ts          # Resend email client
├── clicksendClient.ts       # ClickSend SMS client
├── emailTemplates.ts        # HTML email templates with branding
├── fileStorage.ts           # Unified file storage (Azure Blob / Replit Object Storage)
├── pushService.ts           # Web Push notification service
├── notificationService.ts   # In-app notification management
├── verificationService.ts   # Phone/email verification
├── mfa-service.ts           # Multi-factor authentication
├── fraud-detection.ts       # Transaction fraud analysis
├── gamification.ts          # Rewards and badges engine
├── cronJobs.ts              # Scheduled tasks (recurring contributions, auto-archive)
├── webhookHandlers.ts       # Stripe webhook processing
├── github.ts                # GitHub integration
├── seed.ts                  # Database seeding
├── static.ts                # Static file serving
└── vite.ts                  # Vite dev middleware integration
```

## Architecture Patterns

- **IStorage interface**: Abstracts all database operations behind a single interface defined in `storage.ts`. The `DatabaseStorage` class implements this interface using Drizzle ORM queries.
- **Thin controllers**: Routes in `routes.ts` act as thin controllers that validate input, call storage methods, and return responses. Business logic is kept in dedicated service modules.
- **Type-safe queries**: Drizzle ORM provides compile-time type safety for all database interactions using the schema defined in `shared/schema.ts`.
- **Session authentication**: Uses `express-session` with secure HTTP-only cookies. Middleware functions (`requireAuth`, `requireAdmin`) protect endpoints.
- **Password security**: Passwords are hashed with bcrypt before storage.
- **Request validation**: Incoming request bodies are validated using Zod schemas generated from the Drizzle table definitions via `drizzle-zod`.

## API Route Groups

| Prefix            | Description                          |
| ------------------ | ------------------------------------ |
| `/api/auth/*`      | Authentication (register, login, MFA, password reset) |
| `/api/pools/*`     | Pool CRUD, contributions, comments   |
| `/api/user/*`      | Current user profile and settings    |
| `/api/users/*`     | User search and public profiles      |
| `/api/admin/*`     | Admin dashboard and management       |
| `/api/plaid/*`     | Plaid bank account linking           |
| `/api/stripe/*`    | Stripe payments and webhooks         |
| `/api/merchant/*`  | ChipInPay merchant integration       |

## Development

Start the full-stack development server from the project root:

```bash
npm run dev
```

The Express server starts on port 5000 and serves both the API and the Vite-built client in development mode.
