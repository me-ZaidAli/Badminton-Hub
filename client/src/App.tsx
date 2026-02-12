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

// Pages
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
import CreateClub from "@/pages/CreateClub";
import Clubs from "@/pages/Clubs";
import JoinClub from "@/pages/JoinClub";
import ClubAdmin from "@/pages/ClubAdmin";
import ManageOrganizers from "@/pages/ManageOrganizers";
import OrganizerDashboard from "@/pages/OrganizerDashboard";
import PendingApproval from "@/pages/PendingApproval";
import Profile from "@/pages/Profile";
import ExploreClubs from "@/pages/explore/ExploreClubs";
import ExploreSessions from "@/pages/explore/ExploreSessions";



// Admin Pages
import AdminDashboard from "@/pages/admin/AdminDashboard";

// Super Admin Pages
import SuperAdminDashboard from "@/pages/super-admin/SuperAdminDashboard";
import SuperAdminUsers from "@/pages/super-admin/SuperAdminUsers";
import SuperAdminClubs from "@/pages/super-admin/SuperAdminClubs";
import SuperAdminSessions from "@/pages/super-admin/SuperAdminSessions";
import SuperAdminUsersManagement from "@/pages/super-admin/SuperAdminUsersManagement";

import PlayerManagement from "@/pages/admin/PlayerManagement";
import Financials from "@/pages/admin/Financials";
import MembershipBoard from "@/pages/admin/MembershipBoard";
import AdminInventory from "@/pages/admin/Inventory";
import Memberships from "@/pages/Memberships";
import Announcements from "@/pages/admin/Announcements";
import CalendarImport from "@/pages/admin/CalendarImport";
import MemberImport from "@/pages/admin/MemberImport";
import UserApproval from "@/pages/admin/UserApproval";
import ClubManagement from "@/pages/admin/ClubManagement";
import ClubApprovals from "@/pages/admin/ClubApprovals";
import PlayerProfile from "@/pages/admin/PlayerProfile";
import Analytics from "@/pages/admin/Analytics";
import AllRankings from "@/pages/AllRankings";
import Venues from "@/pages/Venues";
import ClubsManagement from "@/pages/ClubsManagement";

import PasswordResets from "@/pages/admin/PasswordResets";
import ContactForm from "@/pages/ContactForm";
import Messages from "@/pages/admin/Messages";
import InboxPage from "@/pages/Inbox";
import PolicyPage from "@/pages/PolicyPage";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsConditions from "@/pages/TermsConditions";
import JuniorConsentPolicy from "@/pages/JuniorConsentPolicy";

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
            <Component />
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
            <Component />
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
            <Component />
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
            <Component />
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
              <Component />
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
          <Component />
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
      <Route path="/explore/clubs" component={ExploreClubs} />
      <Route path="/explore/sessions" component={ExploreSessions} />
      
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
        <OwnerRoute component={SuperAdminDashboard} />
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
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
