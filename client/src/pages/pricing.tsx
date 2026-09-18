import { Link } from "wouter";
import { PublicLayout } from "@/components/public-layout";
import { FeeSummary } from "@/components/fee-summary";
export default function Pricing() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl py-8 sm:py-16">
        <p className="text-sm font-semibold text-primary mb-4">FEES</p>
        <h1 className="font-display text-3xl sm:text-5xl font-bold mb-5">
          Know what you’ll pay.
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Start with a free account. Choose the available payout method that
          works for your group.
        </p>
        <FeeSummary />
        <div className="mt-8 flex flex-wrap gap-6 underline underline-offset-4">
          <Link href="/register">Create an account</Link>
          <Link href="/contact">Ask about fees</Link>
        </div>
      </div>
    </PublicLayout>
  );
}
