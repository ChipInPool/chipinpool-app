import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import { startCronJobs } from './cronJobs';

const app = express();
const httpServer = createServer(app);

// Security headers - applied before all routes
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com", "https://maps.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://maps.googleapis.com", "wss:", "https:"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
}));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Initialize Stripe schema and sync data
async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('DATABASE_URL not set, skipping Stripe initialization');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    console.log('Setting up managed webhook...');
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    try {
      const result = await stripeSync.findOrCreateManagedWebhook(
        `${webhookBaseUrl}/api/stripe/webhook`
      );
      if (result?.webhook?.url) {
        console.log(`Webhook configured: ${result.webhook.url}`);
      } else {
        console.log('Webhook setup completed');
      }
    } catch (webhookError: any) {
      console.log('Webhook setup skipped:', webhookError.message || 'Unknown error');
    }

    // Sync Stripe data in background
    stripeSync.syncBackfill()
      .then(() => console.log('Stripe data synced'))
      .catch((err: any) => console.error('Error syncing Stripe data:', err));
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

// Stripe webhook route MUST be before express.json()
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

// Now apply JSON middleware for other routes
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize Stripe before registering routes
  await initStripe();

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }

    // Handle Zod validation errors
    if (err.name === 'ZodError' && err.issues) {
      const firstIssue = err.issues[0];
      const field = firstIssue.path.join('.');
      const message = firstIssue.message || `Invalid value for ${field}`;
      console.error("Validation Error:", { field, message, issues: err.issues });
      return res.status(400).json({ error: message, field });
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // Start cron jobs for recurring contributions
  startCronJobs();

  // Auto-seed badges if not yet initialized
  (async () => {
    try {
      const { storage } = await import("./storage");
      const existingBadges = await storage.getAllBadges();
      if (existingBadges.length === 0) {
        const defaultBadges = [
          { name: "First Contribution", icon: "💰", color: "#10B981", description: "Made your first contribution to a pool", category: "contribution" as const, criteria: "first_contribution", threshold: 1, pointsAwarded: 50, rarity: "common" },
          { name: "Generous Giver", icon: "🎁", color: "#3B82F6", description: "Contributed $100+ total", category: "contribution" as const, criteria: "total_contributed_100", threshold: 100, pointsAwarded: 100, rarity: "uncommon" },
          { name: "Big Spender", icon: "💎", color: "#8B5CF6", description: "Contributed $500+ total", category: "contribution" as const, criteria: "total_contributed_500", threshold: 500, pointsAwarded: 250, rarity: "rare" },
          { name: "Whale", icon: "🐳", color: "#EC4899", description: "Contributed $1000+ total", category: "contribution" as const, criteria: "total_contributed_1000", threshold: 1000, pointsAwarded: 500, rarity: "epic" },
          { name: "Pool Creator", icon: "🏊", color: "#06B6D4", description: "Created your first pool", category: "pool" as const, criteria: "first_pool", threshold: 1, pointsAwarded: 50, rarity: "common" },
          { name: "Pool Master", icon: "👑", color: "#F59E0B", description: "Created 5+ pools", category: "pool" as const, criteria: "pools_created_5", threshold: 5, pointsAwarded: 150, rarity: "uncommon" },
          { name: "Pool Legend", icon: "🏆", color: "#EF4444", description: "Created 10+ pools", category: "pool" as const, criteria: "pools_created_10", threshold: 10, pointsAwarded: 300, rarity: "rare" },
          { name: "Goal Crusher", icon: "🎯", color: "#14B8A6", description: "Completed a pool goal", category: "milestone" as const, criteria: "pool_completed", threshold: 1, pointsAwarded: 100, rarity: "uncommon" },
          { name: "Social Butterfly", icon: "🦋", color: "#A855F7", description: "Following 10+ users", category: "social" as const, criteria: "following_10", threshold: 10, pointsAwarded: 50, rarity: "common" },
          { name: "Popular", icon: "⭐", color: "#FBBF24", description: "Have 10+ followers", category: "social" as const, criteria: "followers_10", threshold: 10, pointsAwarded: 100, rarity: "uncommon" },
          { name: "3-Day Streak", icon: "🔥", color: "#F97316", description: "Contributed for 3 days in a row", category: "streak" as const, criteria: "streak_3", threshold: 3, pointsAwarded: 30, rarity: "common" },
          { name: "Week Warrior", icon: "⚡", color: "#EAB308", description: "7-day contribution streak", category: "streak" as const, criteria: "streak_7", threshold: 7, pointsAwarded: 100, rarity: "uncommon" },
          { name: "Monthly Master", icon: "🌟", color: "#D946EF", description: "30-day contribution streak", category: "streak" as const, criteria: "streak_30", threshold: 30, pointsAwarded: 500, rarity: "legendary" },
          { name: "Early Adopter", icon: "🚀", color: "#6366F1", description: "Joined ChipIn early", category: "special" as const, criteria: "early_adopter", threshold: null, pointsAwarded: 100, rarity: "rare" },
          { name: "Verified", icon: "✅", color: "#22C55E", description: "Completed KYC verification", category: "milestone" as const, criteria: "kyc_verified", threshold: 1, pointsAwarded: 100, rarity: "common" },
        ];
        for (const badge of defaultBadges) {
          await storage.createBadge(badge);
        }
        console.log(`[Gamification] Seeded ${defaultBadges.length} badges`);
      }
    } catch (err) {
      console.error('[Gamification] Error seeding badges:', err);
    }
  })();

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
