# ChipIn Shared

## Overview

Shared type definitions and database schema used by both the client and server packages. This directory serves as the single source of truth for data models across the application.

## Contents

- **`schema.ts`** -- Drizzle ORM table definitions, Zod validation schemas, and TypeScript types.

## Key Tables

The schema defines the following primary tables:

`users`, `pools`, `contributions`, `transactions`, `virtualCards`, `notifications`, `comments`, `recurringContributions`, `walletDeposits`, `walletWithdrawals`, `merchants`, `merchantApiKeys`, `merchantCheckoutSessions`, `bankAccounts`, `userFollows`, `follows`, `poolActivities`, `pushSubscriptions`, `badges`, `userBadges`, `userPoints`, `pointTransactions`, `adminAuditLogs`, and others.

## Type Generation Pattern

Each table follows a consistent pattern:

1. **Table definition** using `pgTable` from `drizzle-orm/pg-core`.
2. **Insert schema** generated via `createInsertSchema` from `drizzle-zod`, with auto-generated fields omitted.
3. **Insert type** derived as `z.infer<typeof insertSchema>`.
4. **Select type** derived as `typeof table.$inferSelect`.

## Usage

Import from the shared package using the configured TypeScript path alias:

```typescript
import { users, insertUserSchema, type User, type InsertUser } from "@shared/schema";
```
