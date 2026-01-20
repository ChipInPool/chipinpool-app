import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CURRENT_USER, MOCK_NOTIFICATIONS } from "@/lib/mock-data";
import { Plus, Wallet, Menu, Bell, Search, User, Moon, Sun, Monitor } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length;
  const { setTheme } = useTheme();

  const markAllRead = () => {
    toast({ description: "All notifications marked as read" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center gap-2 group cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-background font-bold text-lg group-hover:scale-105 transition-transform">
                C
              </div>
              <span className="font-display font-bold text-xl tracking-tight">ChipIn</span>
            </a>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/">
              <a className={`text-sm font-medium hover:text-primary transition-colors ${location === '/' ? 'text-primary' : 'text-muted-foreground'}`}>
                Dashboard
              </a>
            </Link>
            <Link href="/explore">
              <a className={`text-sm font-medium hover:text-primary transition-colors ${location === '/explore' ? 'text-primary' : 'text-muted-foreground'}`}>
                Explore
              </a>
            </Link>
            <Link href="/how-it-works">
              <a className={`text-sm font-medium hover:text-primary transition-colors ${location === '/how-it-works' ? 'text-primary' : 'text-muted-foreground'}`}>
                How it works
              </a>
            </Link>
            <Link href="/api-docs">
              <a className={`text-sm font-medium hover:text-primary transition-colors ${location === '/api-docs' ? 'text-primary' : 'text-muted-foreground'}`}>
                Developers
              </a>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-sm font-mono font-medium">$1,240.50</span>
             </div>

            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary">
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
                    {MOCK_NOTIFICATIONS.map(notification => (
                       <Link key={notification.id} href={notification.link || '#'}>
                         <div className={`p-4 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-0 ${!notification.read ? 'bg-primary/5' : ''}`}>
                            <div className="flex justify-between items-start mb-1">
                               <p className="font-medium text-sm text-foreground">{notification.title}</p>
                               <span className="text-[10px] text-muted-foreground">{notification.time}</span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                         </div>
                       </Link>
                    ))}
                 </div>
              </PopoverContent>
            </Popover>

            <Link href="/create">
              <Button size="sm" className="font-semibold shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-1.5" /> Start Pool
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-white/10">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/profile">
              <Avatar className="w-8 h-8 border border-white/10 cursor-pointer hover:border-primary/50 transition-colors">
                <AvatarImage src={CURRENT_USER.avatar} />
                <AvatarFallback>AR</AvatarFallback>
              </Avatar>
            </Link>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center gap-3">
             <Link href="/create">
              <Button size="sm" className="font-semibold h-8 px-3">
                <Plus className="w-4 h-4" />
              </Button>
            </Link>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-background border-l border-white/10">
                <div className="flex flex-col gap-6 mt-8">
                   <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={CURRENT_USER.avatar} />
                      <AvatarFallback>AR</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{CURRENT_USER.name}</p>
                      <p className="text-xs text-muted-foreground">$1,240.50 Available</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link href="/">
                      <a className="text-lg font-medium p-2 hover:bg-white/5 rounded-md transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</a>
                    </Link>
                    <Link href="/explore">
                      <a className="text-lg font-medium p-2 hover:bg-white/5 rounded-md transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Explore Pools</a>
                    </Link>
                    <Link href="/profile">
                      <a className="text-lg font-medium p-2 hover:bg-white/5 rounded-md transition-colors" onClick={() => setIsMobileMenuOpen(false)}>My Profile</a>
                    </Link>
                    <Link href="/how-it-works">
                      <a className="text-lg font-medium p-2 hover:bg-white/5 rounded-md transition-colors" onClick={() => setIsMobileMenuOpen(false)}>How It Works</a>
                    </Link>
                    <Link href="/api-docs">
                      <a className="text-lg font-medium p-2 hover:bg-white/5 rounded-md transition-colors" onClick={() => setIsMobileMenuOpen(false)}>For Developers</a>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-white/5 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2025 ChipIn Inc. Mockup Mode.
        </div>
      </footer>
    </div>
  );
}
