import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar, MobileTopNav } from "@/components/layout/Sidebar";
import PublicLayout from "@/components/layout/PublicLayout";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense, useEffect } from "react";
import { useThemeProvider, ThemeContext, useTheme } from "@/hooks/use-theme";

const LazyFallback = () => <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

import Home from "@/pages/Home";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Sessions from "@/pages/Sessions";
import SessionDetail from "@/pages/SessionDetail";
import PublicSession from "@/pages/PublicSession";
import NotFound from "@/pages/not-found";
import Clubs from "@/pages/Clubs";
import Profile from "@/pages/Profile";

const CreateClub = lazy(() => import("@/pages/CreateClub"));
const JoinClub = lazy(() => import("@/pages/JoinClub"));
const ClubAdmin = lazy(() => import("@/pages/ClubAdmin"));
const ManageOrganizers = lazy(() => import("@/pages/ManageOrganizers"));
const OrganizerDashboard = lazy(() => import("@/pages/OrganizerDashboard"));
const PendingApproval = lazy(() => import("@/pages/PendingApproval"));
const ExploreClubs = lazy(() => import("@/pages/explore/ExploreClubs"));
const ExploreSessions = lazy(() => import("@/pages/explore/ExploreSessions"));

const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));

const SuperAdminDashboard = lazy(() => import("@/pages/super-admin/SuperAdminDashboard"));
const SuperAdminUsers = lazy(() => import("@/pages/super-admin/SuperAdminUsers"));
const SuperAdminClubs = lazy(() => import("@/pages/super-admin/SuperAdminClubs"));
const SuperAdminSessions = lazy(() => import("@/pages/super-admin/SuperAdminSessions"));
const SuperAdminUsersManagement = lazy(() => import("@/pages/super-admin/SuperAdminUsersManagement"));
const GodMode = lazy(() => import("@/pages/super-admin/GodMode"));

const PlayerManagement = lazy(() => import("@/pages/admin/PlayerManagement"));
const Financials = lazy(() => import("@/pages/admin/Financials"));
const MembershipBoard = lazy(() => import("@/pages/admin/MembershipBoard"));
const AdminInventory = lazy(() => import("@/pages/admin/Inventory"));
const Memberships = lazy(() => import("@/pages/Memberships"));
const Announcements = lazy(() => import("@/pages/admin/Announcements"));
const CalendarImport = lazy(() => import("@/pages/admin/CalendarImport"));
const MemberImport = lazy(() => import("@/pages/admin/MemberImport"));
const UserApproval = lazy(() => import("@/pages/admin/UserApproval"));
const ClubManagement = lazy(() => import("@/pages/admin/ClubManagement"));
const ClubApprovals = lazy(() => import("@/pages/admin/ClubApprovals"));
const PlayerProfile = lazy(() => import("@/pages/admin/PlayerProfile"));
const Analytics = lazy(() => import("@/pages/admin/Analytics"));
const AllRankings = lazy(() => import("@/pages/AllRankings"));
const PlayerRankings = lazy(() => import("@/pages/PlayerRankings"));
const Venues = lazy(() => import("@/pages/Venues"));
const ClubsManagement = lazy(() => import("@/pages/ClubsManagement"));

const NotificationsPage = lazy(() => import("@/pages/Notifications"));
const PasswordResets = lazy(() => import("@/pages/admin/PasswordResets"));
const ContactForm = lazy(() => import("@/pages/ContactForm"));
const Messages = lazy(() => import("@/pages/admin/Messages"));
const InboxPage = lazy(() => import("@/pages/Inbox"));
const PolicyPage = lazy(() => import("@/pages/PolicyPage"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsConditions = lazy(() => import("@/pages/TermsConditions"));
const JuniorConsentPolicy = lazy(() => import("@/pages/JuniorConsentPolicy"));

function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MobileTopNav />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8 max-w-7xl mx-auto w-full">
          <ErrorBoundary>
            <Suspense fallback={<LazyFallback />}>
              <Component />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useUser();
  const { data: myAdminClubs, isLoading: clubsLoading } = useMyAdminClubs(!!user);
  const [, setLocation] = useLocation();

  if (isLoading || clubsLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const hasClubAdminAccess = (myAdminClubs?.length ?? 0) > 0;
  
  if (!hasClubAdminAccess) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MobileTopNav />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8 max-w-7xl mx-auto w-full">
          <ErrorBoundary>
            <Suspense fallback={<LazyFallback />}>
              <Component />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

function StrictAdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (user.role !== "ADMIN" && user.role !== "OWNER") {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MobileTopNav />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8 max-w-7xl mx-auto w-full">
          <ErrorBoundary>
            <Suspense fallback={<LazyFallback />}>
              <Component />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

function OwnerRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (user.role !== "OWNER") {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MobileTopNav />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8 max-w-7xl mx-auto w-full">
          <ErrorBoundary>
            <Suspense fallback={<LazyFallback />}>
              <Component />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user } = useUser();
  
  if (user) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <MobileTopNav />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 md:ml-64 p-4 md:p-8 max-w-7xl mx-auto w-full">
            <ErrorBoundary>
              <Suspense fallback={<LazyFallback />}>
                <Component />
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    );
  }

  return (
    <PublicLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <ErrorBoundary>
          <Suspense fallback={<LazyFallback />}>
            <Component />
          </Suspense>
        </ErrorBoundary>
      </div>
    </PublicLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/explore/clubs">{() => <Suspense fallback={<LazyFallback />}><ExploreClubs /></Suspense>}</Route>
      <Route path="/explore/sessions">{() => <Suspense fallback={<LazyFallback />}><ExploreSessions /></Suspense>}</Route>
      
      {/* Protected Routes */}
      <Route path="/dashboard">
        <PrivateRoute component={Dashboard} />
      </Route>
      <Route path="/sessions">
        <PrivateRoute component={Sessions} />
      </Route>
      <Route path="/sessions/:id">
        <PrivateRoute component={SessionDetail} />
      </Route>
      <Route path="/rankings">
        <PrivateRoute component={PlayerRankings} />
      </Route>
      <Route path="/all-rankings">
        <StrictAdminRoute component={AllRankings} />
      </Route>
      <Route path="/public/session/:id">
        <PublicRoute component={PublicSession} />
      </Route>
      <Route path="/create-club">
        <PrivateRoute component={CreateClub} />
      </Route>
      <Route path="/clubs">
        <PublicRoute component={Clubs} />
      </Route>
      <Route path="/clubs/:id/join">
        <PrivateRoute component={JoinClub} />
      </Route>
      <Route path="/club-admin">
        <PrivateRoute component={ClubAdmin} />
      </Route>
      <Route path="/club-admin/:clubId/organizers">
        <PrivateRoute component={ManageOrganizers} />
      </Route>
      <Route path="/organizer">
        <PrivateRoute component={OrganizerDashboard} />
      </Route>
      <Route path="/pending-approval">
        <PrivateRoute component={PendingApproval} />
      </Route>
      <Route path="/inbox">
        <PrivateRoute component={InboxPage} />
      </Route>
      <Route path="/notifications">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><NotificationsPage /></Suspense>} />
      </Route>

      <Route path="/contact">
        <PublicRoute component={ContactForm} />
      </Route>
      <Route path="/policy">
        <PublicRoute component={PolicyPage} />
      </Route>
      <Route path="/privacy-policy">
        <PublicRoute component={PrivacyPolicy} />
      </Route>
      <Route path="/terms-conditions">
        <PublicRoute component={TermsConditions} />
      </Route>
      <Route path="/junior-consent-policy">
        <PublicRoute component={JuniorConsentPolicy} />
      </Route>
      <Route path="/profile">
        <PrivateRoute component={Profile} />
      </Route>
      <Route path="/memberships">
        <PrivateRoute component={Memberships} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        <AdminRoute component={AdminDashboard} />
      </Route>
      <Route path="/admin/players">
        <AdminRoute component={PlayerManagement} />
      </Route>
      <Route path="/admin/members">
        <AdminRoute component={PlayerManagement} />
      </Route>
      <Route path="/admin/players/:playerId">
        <AdminRoute component={PlayerProfile} />
      </Route>
      <Route path="/admin/financials">
        <AdminRoute component={Financials} />
      </Route>
      <Route path="/admin/membership-board">
        <AdminRoute component={MembershipBoard} />
      </Route>
      <Route path="/admin/memberships">
        <AdminRoute component={MembershipBoard} />
      </Route>
      <Route path="/admin/inventory">
        <AdminRoute component={AdminInventory} />
      </Route>
      <Route path="/admin/announcements">
        <OwnerRoute component={Announcements} />
      </Route>
      <Route path="/admin/calendar">
        <OwnerRoute component={CalendarImport} />
      </Route>
      <Route path="/admin/approvals">
        <OwnerRoute component={UserApproval} />
      </Route>
      <Route path="/admin/clubs">
        <OwnerRoute component={ClubManagement} />
      </Route>
      <Route path="/admin/club-approvals">
        <OwnerRoute component={ClubApprovals} />
      </Route>
      <Route path="/admin/venues">
        <PrivateRoute component={Venues} />
      </Route>
      <Route path="/admin/clubs-management">
        <OwnerRoute component={ClubsManagement} />
      </Route>
      <Route path="/admin/analytics">
        <OwnerRoute component={Analytics} />
      </Route>
      <Route path="/admin/import-members">
        <AdminRoute component={MemberImport} />
      </Route>

      <Route path="/admin/password-resets">
        <AdminRoute component={PasswordResets} />
      </Route>
      <Route path="/admin/messages">
        <OwnerRoute component={Messages} />
      </Route>

      {/* Super Admin Routes - OWNER only */}
      <Route path="/super-admin">
        <OwnerRoute component={GodMode} />
      </Route>
      <Route path="/super-admin/users">
        <OwnerRoute component={SuperAdminUsers} />
      </Route>
      <Route path="/super-admin/clubs">
        <OwnerRoute component={SuperAdminClubs} />
      </Route>
      <Route path="/super-admin/sessions">
        <OwnerRoute component={SuperAdminSessions} />
      </Route>
      <Route path="/super-admin/users-management">
        <OwnerRoute component={SuperAdminUsersManagement} />
      </Route>
      <Route path="/super-admin/god-mode">
        <OwnerRoute component={GodMode} />
      </Route>
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function ThemeSync() {
  const { data: user } = useUser();
  const { syncFromUser } = useTheme();

  useEffect(() => {
    if (user && user.displayMode) {
      syncFromUser(user.displayMode as any, user.reducedMotion ?? false, user.id);
    }
  }, [user?.id, user?.displayMode, user?.reducedMotion]);

  return null;
}

function ThemeWrapper() {
  const themeCtx = useThemeProvider();

  return (
    <ThemeContext.Provider value={themeCtx}>
      <TooltipProvider>
        <ThemeSync />
        <Toaster />
        <Router />
      </TooltipProvider>
    </ThemeContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeWrapper />
    </QueryClientProvider>
  );
}

export default App;
