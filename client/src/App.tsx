import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import CreatePool from "@/pages/create-pool";
import PoolDetails from "@/pages/pool-details";
import SpendPool from "@/pages/spend-pool";
import ApiDocs from "@/pages/api-docs";
import Explore from "@/pages/explore";
import HowItWorks from "@/pages/how-it-works";
import Profile from "@/pages/profile";
import UserProfile from "@/pages/user-profile";
import Security from "@/pages/security";
import Transactions from "@/pages/transactions";
import { ThemeProvider } from "@/components/theme-provider";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/welcome" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/create" component={CreatePool} />
      <Route path="/explore" component={Explore} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/api-docs" component={ApiDocs} />
      <Route path="/profile" component={Profile} />
      <Route path="/security" component={Security} />
      <Route path="/user/:id" component={UserProfile} />
      <Route path="/pool/:id" component={PoolDetails} />
      <Route path="/pool/:id/spend" component={SpendPool} />
      <Route path="/transactions" component={Transactions} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
