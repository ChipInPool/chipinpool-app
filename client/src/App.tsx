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
import Recurring from "@/pages/recurring";
import PoolAnalytics from "@/pages/pool-analytics";
import ActivityFeed from "@/pages/activity";
import Settings from "@/pages/settings";
import SplitCalculator from "@/pages/split-calculator";
import { ThemeProvider } from "@/components/theme-provider";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import About from "@/pages/about";
import Careers from "@/pages/careers";
import Contact from "@/pages/contact";
import FAQ from "@/pages/faq";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminUserDetail from "@/pages/admin/user-detail";
import AdminPools from "@/pages/admin/pools";
import AdminTransactions from "@/pages/admin/transactions";
import AdminMerchants from "@/pages/admin/merchants";
import ResetPassword from "@/pages/reset-password";
import MerchantDashboard from "@/pages/merchant-dashboard";
import ChipInPayCheckout from "@/pages/chipinpay-checkout";
import AdminFraud from "@/pages/admin/fraud";
import AdminWithdrawals from "@/pages/admin/withdrawals";
import AdminApiRequests from "@/pages/admin/api-requests";
import CardAnalyticsPage from "@/pages/card-analytics";
import AcceptTransfer from "@/pages/accept-transfer";
import Rewards from "@/pages/rewards";
import PaymentMethods from "@/pages/payment-methods";
import PayMe from "@/pages/pay-me";
import SpendNow from "@/pages/spend-now";
import Cards from "@/pages/cards";
import Notifications from "@/pages/notifications";
import ArchivedPools from "@/pages/archived-pools";
import UserSearch from "@/pages/user-search";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/welcome" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/create" component={CreatePool} />
      <Route path="/explore" component={Explore} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/api-docs" component={ApiDocs} />
      <Route path="/profile" component={Profile} />
      <Route path="/security" component={Security} />
      <Route path="/payment-methods" component={PaymentMethods} />
      <Route path="/user/:id" component={UserProfile} />
      <Route path="/profile/:username" component={UserProfile} />
      <Route path="/pool/:id" component={PoolDetails} />
      <Route path="/pool/:id/spend" component={SpendPool} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/recurring" component={Recurring} />
      <Route path="/pool/:id/analytics" component={PoolAnalytics} />
      <Route path="/activity" component={ActivityFeed} />
      <Route path="/settings" component={Settings} />
      <Route path="/split-calculator" component={SplitCalculator} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/about" component={About} />
      <Route path="/careers" component={Careers} />
      <Route path="/contact" component={Contact} />
      <Route path="/faq" component={FAQ} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/users/:id" component={AdminUserDetail} />
      <Route path="/admin/pools" component={AdminPools} />
      <Route path="/admin/transactions" component={AdminTransactions} />
      <Route path="/admin/merchants" component={AdminMerchants} />
      <Route path="/admin/fraud" component={AdminFraud} />
      <Route path="/admin/withdrawals" component={AdminWithdrawals} />
      <Route path="/admin/api-requests" component={AdminApiRequests} />
      <Route path="/card-analytics" component={CardAnalyticsPage} />
      <Route path="/merchant" component={MerchantDashboard} />
      <Route path="/chipinpay/checkout/:sessionId" component={ChipInPayCheckout} />
      <Route path="/transfer/:requestId/accept" component={AcceptTransfer} />
      <Route path="/rewards" component={Rewards} />
      <Route path="/spend-now" component={SpendNow} />
      <Route path="/cards" component={Cards} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/archived" component={ArchivedPools} />
      <Route path="/search/users" component={UserSearch} />
      <Route path="/@:username/:amount" component={PayMe} />
      <Route path="/@:username" component={PayMe} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
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
