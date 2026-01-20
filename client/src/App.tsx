import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import CreatePool from "@/pages/create-pool";
import PoolDetails from "@/pages/pool-details";
import SpendPool from "@/pages/spend-pool";
import ApiDocs from "@/pages/api-docs";
import Explore from "@/pages/explore";
import HowItWorks from "@/pages/how-it-works";

import Profile from "@/pages/profile";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create" component={CreatePool} />
      <Route path="/explore" component={Explore} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/api-docs" component={ApiDocs} />
      <Route path="/profile" component={Profile} />
      <Route path="/pool/:id" component={PoolDetails} />
      <Route path="/pool/:id/spend" component={SpendPool} />
      <Route component={NotFound} />
    </Switch>
  );
}

import { ThemeProvider } from "@/components/theme-provider";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
