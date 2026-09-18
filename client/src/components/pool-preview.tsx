import { Link } from "wouter";
import { Check, ArrowRight } from "lucide-react";
export function PoolPreview() {
  return (
    <figure
      className="mx-auto max-w-3xl text-left rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
      aria-label="Illustrative pool example"
    >
      <figcaption className="flex flex-wrap justify-between gap-2 border-b border-border px-5 py-3 text-xs text-muted-foreground">
        <span>INSIDE A SHARED POOL</span>
        <span>Illustrative example · not a live account</span>
      </figcaption>
      <div className="p-5 sm:p-8">
        <div className="flex justify-between items-start gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              TRIPS & EXPERIENCES
            </p>
            <h2 className="text-xl sm:text-2xl font-bold">
              Weekend cabin trip
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              One place to see how the group is doing.
            </p>
          </div>
          <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs">
            Collecting
          </span>
        </div>
        <div className="my-6">
          <p className="text-3xl font-bold tabular-nums">
            $900{" "}
            <span className="text-sm font-normal text-muted-foreground">
              of $1,200 goal
            </span>
          </p>
          <div
            role="progressbar"
            aria-label="Pool funding"
            aria-valuenow={75}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-3 h-2 rounded-full bg-muted"
          >
            <div className="h-full w-3/4 rounded-full bg-primary" />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            75% funded · $300 to go
          </p>
        </div>
        <ul className="divide-y divide-border">
          {[
            ["Alex", "$300", "Contributed"],
            ["Jordan", "$300", "Contributed"],
            ["Sam", "$300", "Contributed"],
            ["Casey", "$0", "Pending"],
          ].map(([name, amount, status]) => (
            <li key={name} className="flex items-center gap-3 py-3 text-sm">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-semibold"
                aria-hidden="true"
              >
                {name[0]}
              </span>
              <span className="flex-1">{name}</span>
              <span className="tabular-nums">{amount}</span>
              <span className="w-24 text-right text-muted-foreground">
                {status === "Contributed" && (
                  <Check className="inline h-3 w-3 mr-1" />
                )}
                {status}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-5 border-t border-border pt-5 text-sm text-muted-foreground">
          Next: review the available spending or payout options for your pool.
          Verification and provider requirements apply.
        </p>
        <Link
          href="/how-it-works"
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          Walk through the process <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </figure>
  );
}
