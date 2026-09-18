import { Link } from "wouter";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";

export default function Trust() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl py-8 sm:py-16">
        <p className="text-sm font-semibold text-primary mb-4">
          SECURITY & TRUST
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-bold">
          Know how your account is protected.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          Group payments start with clear information. Here are the account
          controls available in ChipInPool and where to get help.
        </p>
        <div className="my-10 grid gap-5 sm:grid-cols-2">
          {[
            [
              "Account verification",
              "Verify your email and phone number from your account settings. Identity verification is required for certain features and limits.",
            ],
            [
              "Spending controls",
              "Set a transaction PIN to authorize pool spending. Keep your sign-in details and verification codes private.",
            ],
            [
              "Payment providers",
              "ChipInPool integrates with Stripe for payment processing and identity verification, and Plaid for bank linking. Availability depends on your account and provider requirements.",
            ],
            [
              "Your information",
              "Read our Privacy Policy for details about information collection, use, and sharing. Contact support with questions about a payment or your account.",
            ],
          ].map(([title, description]) => (
            <section
              key={title}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <h2 className="text-xl font-semibold mb-3">{title}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {description}
              </p>
            </section>
          ))}
        </div>
        <div className="rounded-2xl bg-muted/40 p-6">
          <h2 className="text-xl font-semibold">
            Manage your account security
          </h2>
          <p className="my-3 text-muted-foreground">
            Sign in to manage verification, your transaction PIN, and linked
            payment methods.
          </p>
          <Button asChild>
            <Link href="/security">Open Security Settings</Link>
          </Button>
        </div>
        <div className="mt-8 flex flex-wrap gap-6 text-sm underline underline-offset-4">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/pricing">Fees</Link>
          <Link href="/contact">Contact Support</Link>
        </div>
      </div>
    </PublicLayout>
  );
}
