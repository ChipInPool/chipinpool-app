import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Menu, Moon, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

const navigation = [
  ["/welcome#features", "Features"],
  ["/how-it-works", "How It Works"],
  ["/pricing", "Fees"],
  ["/trust", "Security"],
  ["/faq", "FAQ"],
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:block focus:p-3"
      >
        Skip to content
      </a>
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-2 px-4">
        <Link
          href="/welcome"
          className="flex shrink-0 items-center gap-2 font-display text-lg font-bold"
        >
          <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg" />
          ChipInPool
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden lg:flex items-center gap-6"
        >
          {navigation.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle color theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            asChild
          >
            <Link href="/login">Sign In</Link>
          </Button>
          <Button size="sm" className="hidden sm:inline-flex" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="public-mobile-menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && (
        <nav
          id="public-mobile-menu"
          aria-label="Mobile navigation"
          className="lg:hidden border-t border-border px-4 py-3 flex flex-col gap-1"
        >
          {[
            ...navigation,
            ["/login", "Sign In"],
            ["/register", "Get Started"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 hover:bg-muted"
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-border py-10">
      <div className="mx-auto max-w-7xl px-4 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/welcome" className="font-display text-xl font-bold">
            ChipInPool
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            A shared plan. A shared pool.
            <br />A clearer way to pay together.
          </p>
        </div>
        {[
          [
            ["/how-it-works", "How It Works"],
            ["/pricing", "Fees"],
            ["/trust", "Security"],
            ["/api-docs", "Developers"],
          ],
          [
            ["/about", "About"],
            ["/contact", "Contact"],
            ["/faq", "FAQ"],
          ],
          [
            ["/privacy", "Privacy Policy"],
            ["/terms", "Terms of Service"],
          ],
        ].map((links, index) => (
          <nav
            key={index}
            aria-label={
              ["Product links", "Company links", "Legal links"][index]
            }
            className="flex flex-col gap-3 text-sm"
          >
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="text-muted-foreground hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>
        ))}
        <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">
          © {new Date().getFullYear()} ChipInPool Corp. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicHeader />
      <main id="main-content" className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
