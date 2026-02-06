import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar, MobileNav } from "@/components/layout/Sidebar";
import PublicLayout from "@/components/layout/PublicLayout";
import { useUser } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

// Pages
import Home from "@/pages/Home";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Sessions from "@/pages/Sessions";
import SessionDetail from "@/pages/SessionDetail";
import Rankings from "@/pages/Rankings";
import PublicSession from "@/pages/PublicSession";
import Players from "@/pages/Players";
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
import ExploreRankings from "@/pages/explore/ExploreRankings";
import ExploreCoaches from "@/pages/explore/ExploreCoaches";
import FindCoach from "@/pages/FindCoach";
import RegisterCoach from "@/pages/RegisterCoach";
import CoachProfile from "@/pages/CoachProfile";
import JoinCoachSeeker from "@/pages/JoinCoachSeeker";

// Admin Pages
import AdminDashboard from "@/pages/admin/AdminDashboard";

import PlayerManagement from "@/pages/admin/PlayerManagement";
import Financials from "@/pages/admin/Financials";
import Announcements from "@/pages/admin/Announcements";
import CalendarImport from "@/pages/admin/CalendarImport";
import MemberImport from "@/pages/admin/MemberImport";
import UserApproval from "@/pages/admin/UserApproval";
import ClubManagement from "@/pages/admin/ClubManagement";
import ClubApprovals from "@/pages/admin/ClubApprovals";
import ClubAdmins from "@/pages/admin/ClubAdmins";
import PlayerProfile from "@/pages/admin/PlayerProfile";
import Analytics from "@/pages/admin/Analytics";
import AdminRankings from "@/pages/admin/AdminRankings";
import Venues from "@/pages/Venues";
import ClubsManagement from "@/pages/ClubsManagement";
import CoachManagement from "@/pages/admin/CoachManagement";
import PasswordResets from "@/pages/admin/PasswordResets";
import ContactForm from "@/pages/ContactForm";
import Messages from "@/pages/admin/Messages";
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
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
        <Component />
      </main>
      <MobileNav />
    </div>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const isAdmin = user.role === "ADMIN" || user.role === "OWNER" || user.role === "ORGANISER";
  if (!isAdmin) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
        <Component />
      </main>
      <MobileNav />
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
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
        <Component />
      </main>
      <MobileNav />
    </div>
  );
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user } = useUser();
  
  // Public route - show with sidebar if logged in, otherwise show standalone
  if (user) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
          <Component />
        </main>
        <MobileNav />
      </div>
    );
  }

  // Not logged in - show with PublicLayout (shared nav)
  return (
    <PublicLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <Component />
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
      <Route path="/explore/rankings" component={ExploreRankings} />
      <Route path="/explore/coaches" component={ExploreCoaches} />
      
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
        <PublicRoute component={Rankings} />
      </Route>
      <Route path="/public/session/:id">
        <PublicRoute component={PublicSession} />
      </Route>
      <Route path="/players">
        <PrivateRoute component={Players} />
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
      <Route path="/find-coach">
        <PrivateRoute component={FindCoach} />
      </Route>
      <Route path="/register-coach">
        <PrivateRoute component={RegisterCoach} />
      </Route>
      <Route path="/coaches/me">
        <PrivateRoute component={CoachProfile} />
      </Route>
      <Route path="/join-coach-seeker">
        <PrivateRoute component={JoinCoachSeeker} />
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
        <Profile />
      </Route>

      {/* Admin Routes - OWNER only */}
      <Route path="/admin">
        <OwnerRoute component={AdminDashboard} />
      </Route>
      <Route path="/admin/players">
        <OwnerRoute component={PlayerManagement} />
      </Route>
      <Route path="/admin/players/:playerId">
        <OwnerRoute component={PlayerProfile} />
      </Route>
      <Route path="/admin/financials">
        <OwnerRoute component={Financials} />
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
      <Route path="/admin/club-admins">
        <OwnerRoute component={ClubAdmins} />
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
      <Route path="/admin/rankings">
        <OwnerRoute component={AdminRankings} />
      </Route>
      <Route path="/admin/import-members">
        <OwnerRoute component={MemberImport} />
      </Route>
      <Route path="/admin/coaches">
        <OwnerRoute component={CoachManagement} />
      </Route>
      <Route path="/admin/password-resets">
        <OwnerRoute component={PasswordResets} />
      </Route>
      <Route path="/admin/messages">
        <OwnerRoute component={Messages} />
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
