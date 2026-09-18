import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Users,
  Layers,
  CreditCard,
  Settings,
  LogOut,
  Shield,
  Store,
  AlertTriangle,
  Loader2,
  Banknote,
  Key,
  Lock,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/pools", icon: Layers, label: "Pools" },
  { href: "/admin/transactions", icon: CreditCard, label: "Transactions" },
  { href: "/admin/withdrawals", icon: Banknote, label: "Withdrawals" },
  { href: "/admin/merchants", icon: Store, label: "Merchants" },
  { href: "/admin/api-requests", icon: Key, label: "API Requests" },
  { href: "/admin/fraud", icon: AlertTriangle, label: "Fraud Detection" },
  { href: "/admin/beta", icon: Lock, label: "Beta Access" },
];

function SidebarContent({
  location,
  onNavigate,
  logout,
}: {
  location: string;
  onNavigate?: () => void;
  logout: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg">Admin</h1>
            <p className="text-xs text-muted-foreground">ChipInPool Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            location === item.href ||
            (item.href !== "/admin" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                onClick={onNavigate}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <Link href="/">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={onNavigate}
          >
            <Settings className="w-4 h-4 mr-2" />
            Back to App
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground mt-1"
          onClick={() => { logout(); onNavigate?.(); }}
          data-testid="button-admin-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 bg-card/50 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold">Admin</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDrawerOpen(true)}
          data-testid="button-admin-menu-open"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </header>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="w-72 bg-card border-r border-white/10 h-full flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-end px-4 pt-4 pb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDrawerOpen(false)}
                data-testid="button-admin-menu-close"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent
                location={location}
                onNavigate={() => setDrawerOpen(false)}
                logout={logout}
              />
            </div>
          </div>
          {/* Backdrop */}
          <div className="flex-1 bg-black/50" />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r border-white/10 bg-card/50 flex-col min-h-screen sticky top-0">
        <SidebarContent location={location} logout={logout} />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
