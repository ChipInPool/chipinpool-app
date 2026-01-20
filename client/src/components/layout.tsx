import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth-context";
import { api, queryKeys } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Wallet, Menu, Bell, Moon, Sun, LogOut, Shield } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const queryClient = useQueryClient();

  const { data: notificationsData } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: api.notifications.list,
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const markAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      toast({ description: "All notifications marked as read" });
    } catch (e) {
      toast({ description: "Failed to mark notifications as read", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
    toast({ description: "Logged out successfully" });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">
      <nav className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-background font-bold text-lg group-hover:scale-105 transition-transform">
              C
            </div>
            <span className="font-display font-bold text-xl tracking-tight">ChipIn</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className={`text-sm font-medium hover:text-primary transition-colors ${location === '/' ? 'text-primary' : 'text-muted-foreground'}`}>
              Dashboard
            </Link>
            <Link href="/explore" className={`text-sm font-medium hover:text-primary transition-colors ${location === '/explore' ? 'text-primary' : 'text-muted-foreground'}`}>
              Explore
            </Link>
            <Link href="/how-it-works" className={`text-sm font-medium hover:text-primary transition-colors ${location === '/how-it-works' ? 'text-primary' : 'text-muted-foreground'}`}>
              How it works
            </Link>
            <Link href="/api-docs" className={`text-sm font-medium hover:text-primary transition-colors ${location === '/api-docs' ? 'text-primary' : 'text-muted-foreground'}`}>
              Developers
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : isAuthenticated && user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/30 transition-all cursor-pointer" data-testid="button-wallet">
                      <Wallet className="w-4 h-4 text-primary" />
                      <span className="text-sm font-mono font-medium">${parseFloat(user.balance).toLocaleString()}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-white/10 w-48">
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/profile?action=deposit" className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-green-400" />
                        <span>Deposit Funds</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/profile?action=withdraw" className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-orange-400" />
                        <span>Withdraw Funds</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary" data-testid="button-notifications">
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-0 bg-card border-white/10 shadow-xl">
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                      <h4 className="font-semibold text-sm">Notifications</h4>
                      <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No notifications yet</div>
                      ) : (
                        notifications.map((notification: any) => (
                          <Link key={notification.id} href={notification.link || '#'}>
                            <div className={`p-4 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-0 ${!notification.read ? 'bg-primary/5' : ''}`}>
                              <div className="flex justify-between items-start mb-1">
                                <p className="font-medium text-sm text-foreground">{notification.title}</p>
                                <span className="text-[10px] text-muted-foreground">{formatTimeAgo(notification.createdAt)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button size="sm" className="font-semibold shadow-lg shadow-primary/20" data-testid="button-start-pool" asChild>
                  <Link href="/create"><Plus className="w-4 h-4 mr-1.5" /> Start Pool</Link>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      <span className="sr-only">Toggle theme</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-white/10">
                    <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="w-8 h-8 border border-white/10 cursor-pointer hover:border-primary/50 transition-colors" data-testid="avatar-user">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback>{user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-white/10">
                    <DropdownMenuItem asChild>
                      <Link href="/profile">My Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/security" className="flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        Security
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="text-red-400">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button size="sm" className="font-semibold" data-testid="button-login" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>

          <div className="md:hidden flex items-center gap-3">
            {isAuthenticated && (
              <Button size="sm" className="font-semibold h-8 px-3" asChild>
                <Link href="/create"><Plus className="w-4 h-4" /></Link>
              </Button>
            )}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-background border-l border-white/10">
                <div className="flex flex-col gap-6 mt-8">
                  {isAuthenticated && user ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.avatar || undefined} />
                        <AvatarFallback>{user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">${parseFloat(user.balance).toLocaleString()} Available</p>
                      </div>
                    </div>
                  ) : (
                    <Button className="w-full" onClick={() => setIsMobileMenuOpen(false)} asChild>
                      <Link href="/login">Sign In</Link>
                    </Button>
                  )}
                  <div className="flex flex-col gap-2">
                    <Link href="/" className="text-lg font-medium p-2 hover:bg-white/5 rounded-md transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
                    <Link href="/explore" className="text-lg font-medium p-2 hover:bg-white/5 rounded-md transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Explore Pools</Link>
                    <Link href="/profile" className="text-lg font-medium p-2 hover:bg-white/5 rounded-md transition-colors" onClick={() => setIsMobileMenuOpen(false)}>My Profile</Link>
                    <Link href="/how-it-works" className="text-lg font-medium p-2 hover:bg-white/5 rounded-md transition-colors" onClick={() => setIsMobileMenuOpen(false)}>How It Works</Link>
                    <Link href="/api-docs" className="text-lg font-medium p-2 hover:bg-white/5 rounded-md transition-colors" onClick={() => setIsMobileMenuOpen(false)}>For Developers</Link>
                    {isAuthenticated && (
                      <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="text-lg font-medium p-2 hover:bg-white/5 rounded-md transition-colors text-left text-red-400">
                        Logout
                      </button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-white/5 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2025 ChipIn Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
