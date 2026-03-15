import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar, MobileTopNav, useSidebarHidden } from "@/components/layout/Sidebar";
import { BottomNavBar, BottomNavSettings } from "@/components/layout/BottomNavBar";
import PublicLayout from "@/components/layout/PublicLayout";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs, useIsOrganiserOnly } from "@/hooks/use-clubs";
import { useClubPlan, useAdminClubId } from "@/hooks/use-club-plan";
import { Loader2, Lock } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense, useEffect, createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { useThemeProvider, ThemeContext, useTheme } from "@/hooks/use-theme";
import { IosFirstVisitPrompt } from "@/components/PwaInstallPrompt";
import { useBackground } from "@/hooks/use-background";
import { useTypography } from "@/hooks/use-typography";

const LazyFallback = () => <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

export const TrialPlayerContext = createContext<{ isTrialPlayer: boolean; trialStatus: string | null }>({ isTrialPlayer: false, trialStatus: null });
export function useTrialPlayer() { return useContext(TrialPlayerContext); }

import Home from "@/pages/Home";
import Pricing from "@/pages/Pricing";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Sessions from "@/pages/Sessions";
import MySessions from "@/pages/MySessions";
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
const PlaySessions = lazy(() => import("@/pages/PlaySessions"));
const ClaimAccount = lazy(() => import("@/pages/ClaimAccount"));
const MyInsights = lazy(() => import("@/pages/MyInsights"));

const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));

const SuperAdminDashboard = lazy(() => import("@/pages/super-admin/SuperAdminDashboard"));
const SuperAdminUsers = lazy(() => import("@/pages/super-admin/SuperAdminUsers"));
const SuperAdminClubs = lazy(() => import("@/pages/super-admin/SuperAdminClubs"));
const SuperAdminSessions = lazy(() => import("@/pages/super-admin/SuperAdminSessions"));
const SuperAdminUsersManagement = lazy(() => import("@/pages/super-admin/SuperAdminUsersManagement"));
const GodMode = lazy(() => import("@/pages/super-admin/GodMode"));
const SuperAdminReferrals = lazy(() => import("@/pages/super-admin/SuperAdminReferrals"));
const SuperAdminBilling = lazy(() => import("@/pages/SuperAdminBilling"));
const ClubBilling = lazy(() => import("@/pages/ClubBilling"));

const PlayerManagement = lazy(() => import("@/pages/admin/PlayerManagement"));
const Financials = lazy(() => import("@/pages/admin/Financials"));
const MembershipBoard = lazy(() => import("@/pages/admin/MembershipBoard"));
const AdminInventory = lazy(() => import("@/pages/admin/Inventory"));
const Memberships = lazy(() => import("@/pages/Memberships"));
const Referrals = lazy(() => import("@/pages/Referrals"));
const Rewards = lazy(() => import("@/pages/Rewards"));
const AdminReferrals = lazy(() => import("@/pages/admin/AdminReferrals"));
const AdminNotifications = lazy(() => import("@/pages/admin/AdminNotifications"));
const AttendanceRewards = lazy(() => import("@/pages/admin/AttendanceRewards"));
const ClubRewards = lazy(() => import("@/pages/admin/ClubRewards"));
const RewardsDashboard = lazy(() => import("@/pages/admin/RewardsDashboard"));
const AdminAnnouncements = lazy(() => import("@/pages/admin/Announcements"));
const MatchEngineLab = lazy(() => import("@/pages/admin/MatchEngineLab"));
const Announcements = lazy(() => import("@/pages/Announcements"));
const CalendarImport = lazy(() => import("@/pages/admin/CalendarImport"));
const MemberImport = lazy(() => import("@/pages/admin/MemberImport"));
const UserApproval = lazy(() => import("@/pages/admin/UserApproval"));
const ClubManagement = lazy(() => import("@/pages/admin/ClubManagement"));
const ClubApprovals = lazy(() => import("@/pages/admin/ClubApprovals"));
const PlayerProfile = lazy(() => import("@/pages/admin/PlayerProfile"));
const Analytics = lazy(() => import("@/pages/admin/Analytics"));
const AcquisitionAnalytics = lazy(() => import("@/pages/admin/AcquisitionAnalytics"));
const AttendanceAnalytics = lazy(() => import("@/pages/admin/AttendanceAnalytics"));
const InactiveMembers = lazy(() => import("@/pages/admin/InactiveMembers"));
const AllRankings = lazy(() => import("@/pages/AllRankings"));
const PlayerRankings = lazy(() => import("@/pages/PlayerRankings"));
const LeaguePage = lazy(() => import("@/pages/League"));
const PlayerIntelligence = lazy(() => import("@/pages/PlayerIntelligence"));
const Juniors = lazy(() => import("@/pages/Juniors"));
const JuniorDashboard = lazy(() => import("@/pages/JuniorDashboard"));
const CoachJuniorSkillsDashboard = lazy(() => import("@/pages/coach/CoachJuniorSkillsDashboard"));
const FindCoach = lazy(() => import("@/pages/FindCoach"));
const MyLessons = lazy(() => import("@/pages/MyLessons"));
const LeagueManagement = lazy(() => import("@/pages/admin/LeagueManagement"));
const Venues = lazy(() => import("@/pages/Venues"));
const ClubsManagement = lazy(() => import("@/pages/ClubsManagement"));

const NotificationsPage = lazy(() => import("@/pages/Notifications"));
const Tickets = lazy(() => import("@/pages/Tickets"));
const TicketDetail = lazy(() => import("@/pages/TicketDetail"));
const PasswordResets = lazy(() => import("@/pages/admin/PasswordResets"));
const ContactForm = lazy(() => import("@/pages/ContactForm"));
const Messages = lazy(() => import("@/pages/admin/Messages"));
const ChatModeration = lazy(() => import("@/pages/admin/ChatModeration"));
const InboxPage = lazy(() => import("@/pages/Inbox"));
const PolicyPage = lazy(() => import("@/pages/PolicyPage"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsConditions = lazy(() => import("@/pages/TermsConditions"));
const JuniorConsentPolicy = lazy(() => import("@/pages/JuniorConsentPolicy"));
const UserGuide = lazy(() => import("@/pages/UserGuide"));
const ThemeGallery = lazy(() => import("@/pages/ThemeGallery"));
const Backgrounds = lazy(() => import("@/pages/Backgrounds"));
const TypographyStudio = lazy(() => import("@/pages/TypographyStudio"));
const SocialMedia = lazy(() => import("@/pages/SocialMedia"));
const BlackCardManagement = lazy(() => import("@/pages/admin/BlackCardManagement"));
const RecognitionCards = lazy(() => import("@/pages/admin/RecognitionCards"));
const IncidentReports = lazy(() => import("@/pages/IncidentReports"));
const TrialManagement = lazy(() => import("@/pages/admin/TrialManagement"));
const TrialDashboard = lazy(() => import("@/pages/TrialDashboard"));
const AnalyticsDashboard = lazy(() => import("@/pages/AnalyticsDashboard"));

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const { hidden } = useSidebarHidden();
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-1">
        <Sidebar />
        <main className={`flex-1 ${hidden ? "" : "md:ml-64"} px-3 py-3 sm:p-4 md:p-8 max-w-7xl mx-auto w-full transition-[margin] duration-300`}>
          {children}
        </main>
      </div>
      <BottomNavBar />
    </div>
  );
}

function PrivateRoute({ component: Component, allowTrial }: { component: React.ComponentType; allowTrial?: boolean }) {
  const { data: user, isLoading } = useUser();
  const [location, setLocation] = useLocation();

  const { data: trialData, isLoading: trialLoading } = useQuery({
    queryKey: ["/api/trial-players/me"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/trial-players/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (isLoading || (user && trialLoading)) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const isActiveTrial = trialData && trialData.status !== "APPROVED" && trialData.status !== "REJECTED" && trialData.status !== "REDIRECTED";
  if (isActiveTrial && !allowTrial && location !== "/trial-dashboard") {
    setLocation("/trial-dashboard");
    return null;
  }

  return (
    <AuthenticatedShell>
      <ErrorBoundary>
        <Suspense fallback={<LazyFallback />}>
          <Component />
        </Suspense>
      </ErrorBoundary>
    </AuthenticatedShell>
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
  const isSuperUser = user?.role === "OWNER";
  const isPlatformAdmin = isSuperUser || user?.role === "ADMIN";
  
  if (!isPlatformAdmin && !hasClubAdminAccess) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <AuthenticatedShell>
      <ErrorBoundary>
        <Suspense fallback={<LazyFallback />}>
          <Component />
        </Suspense>
      </ErrorBoundary>
    </AuthenticatedShell>
  );
}

function NonOrganiserAdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useUser();
  const { data: myAdminClubs, isLoading: clubsLoading } = useMyAdminClubs(!!user);
  const isOrganiserOnly = useIsOrganiserOnly(!!user);
  const [, setLocation] = useLocation();

  if (isLoading || clubsLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const hasClubAdminAccess = (myAdminClubs?.length ?? 0) > 0;
  const isSuperUser = user?.role === "OWNER";
  const isPlatformAdmin = isSuperUser || user?.role === "ADMIN";
  
  if (!isPlatformAdmin && !hasClubAdminAccess) {
    setLocation("/dashboard");
    return null;
  }
  
  if (!isSuperUser && !isPlatformAdmin && isOrganiserOnly) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <AuthenticatedShell>
      <ErrorBoundary>
        <Suspense fallback={<LazyFallback />}>
          <Component />
        </Suspense>
      </ErrorBoundary>
    </AuthenticatedShell>
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
    <AuthenticatedShell>
      <ErrorBoundary>
        <Suspense fallback={<LazyFallback />}>
          <Component />
        </Suspense>
      </ErrorBoundary>
    </AuthenticatedShell>
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
    <AuthenticatedShell>
      <ErrorBoundary>
        <Suspense fallback={<LazyFallback />}>
          <Component />
        </Suspense>
      </ErrorBoundary>
    </AuthenticatedShell>
  );
}

function PremiumRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useUser();
  const { data: myAdminClubs, isLoading: clubsLoading } = useMyAdminClubs(!!user);
  const [, setLocation] = useLocation();
  const adminClubId = useAdminClubId();
  const { isPremium, isSuperAdmin, isLoading: planLoading } = useClubPlan(adminClubId);

  const isPlatformAdmin = user?.role === "OWNER" || user?.role === "ADMIN";

  if (isLoading || clubsLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  if (!isPlatformAdmin && planLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const hasClubAdminAccess = (myAdminClubs?.length ?? 0) > 0;

  if (!isPlatformAdmin && !hasClubAdminAccess) {
    setLocation("/dashboard");
    return null;
  }

  if (!isPremium && !isSuperAdmin && !isPlatformAdmin && !hasClubAdminAccess) {
    return (
      <AuthenticatedShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold">Premium Feature</h2>
          <p className="text-muted-foreground max-w-md">
            This feature is available on the Premium plan. Upgrade your club to unlock advanced analytics, rankings, league management, and more.
          </p>
          <button
            onClick={() => setLocation("/admin/billing")}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            data-testid="button-upgrade-from-premium-gate"
          >
            View Upgrade Options
          </button>
        </div>
      </AuthenticatedShell>
    );
  }

  return (
    <AuthenticatedShell>
      <ErrorBoundary>
        <Suspense fallback={<LazyFallback />}>
          <Component />
        </Suspense>
      </ErrorBoundary>
    </AuthenticatedShell>
  );
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user } = useUser();
  
  if (user) {
    return (
      <AuthenticatedShell>
        <ErrorBoundary>
          <Suspense fallback={<LazyFallback />}>
            <Component />
          </Suspense>
        </ErrorBoundary>
      </AuthenticatedShell>
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
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/explore/clubs">{() => <Suspense fallback={<LazyFallback />}><ExploreClubs /></Suspense>}</Route>
      <Route path="/explore/sessions">{() => <Suspense fallback={<LazyFallback />}><ExploreSessions /></Suspense>}</Route>
      <Route path="/play">{() => <Suspense fallback={<LazyFallback />}><PlaySessions /></Suspense>}</Route>
      <Route path="/claim-account">{() => <Suspense fallback={<LazyFallback />}><ClaimAccount /></Suspense>}</Route>
      
      {/* Protected Routes */}
      <Route path="/dashboard">
        <PrivateRoute component={Dashboard} />
      </Route>
      <Route path="/sessions">
        <PrivateRoute component={Sessions} />
      </Route>
      <Route path="/announcements">
        <PrivateRoute component={Announcements} />
      </Route>
      <Route path="/my-sessions">
        <PrivateRoute component={MySessions} />
      </Route>
      <Route path="/my-insights">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><MyInsights /></Suspense>} />
      </Route>
      <Route path="/juniors">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><Juniors /></Suspense>} />
      </Route>
      <Route path="/juniors/dashboard/:userId">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><JuniorDashboard /></Suspense>} />
      </Route>
      <Route path="/coach/juniors/skills">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><CoachJuniorSkillsDashboard /></Suspense>} />
      </Route>
      <Route path="/find-coach">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><FindCoach /></Suspense>} />
      </Route>
      <Route path="/my-lessons">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><MyLessons /></Suspense>} />
      </Route>
      <Route path="/sessions/:id">
        <PrivateRoute component={SessionDetail} />
      </Route>
      <Route path="/league">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><LeaguePage /></Suspense>} />
      </Route>
      <Route path="/rankings">
        <PrivateRoute component={PlayerRankings} />
      </Route>
      <Route path="/player-intelligence">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><PlayerIntelligence /></Suspense>} />
      </Route>
      <Route path="/all-rankings">
        <StrictAdminRoute component={AllRankings} />
      </Route>
      <Route path="/public/session/:id">
        <PublicRoute component={PublicSession} />
      </Route>
      <Route path="/create-club">
        <OwnerRoute component={CreateClub} />
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
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><NotificationsPage /></Suspense>} allowTrial />
      </Route>
      <Route path="/tickets">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><Tickets /></Suspense>} />
      </Route>
      <Route path="/tickets/:id">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><TicketDetail /></Suspense>} />
      </Route>

      <Route path="/pricing">
        <PublicRoute component={Pricing} />
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
      <Route path="/backgrounds">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><Backgrounds /></Suspense>} />
      </Route>
      <Route path="/themes">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><ThemeGallery /></Suspense>} />
      </Route>
      <Route path="/typography">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><TypographyStudio /></Suspense>} />
      </Route>
      <Route path="/social-media">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><SocialMedia /></Suspense>} />
      </Route>
      <Route path="/bottom-nav-settings">
        <PrivateRoute component={BottomNavSettings} />
      </Route>
      <Route path="/guide">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><UserGuide /></Suspense>} />
      </Route>
      <Route path="/memberships">
        <PrivateRoute component={Memberships} />
      </Route>
      <Route path="/referrals">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><Referrals /></Suspense>} />
      </Route>
      <Route path="/rewards">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><Rewards /></Suspense>} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin/billing">
        <AdminRoute component={ClubBilling} />
      </Route>
      <Route path="/admin">
        <AdminRoute component={AdminDashboard} />
      </Route>
      <Route path="/admin/players">
        <NonOrganiserAdminRoute component={PlayerManagement} />
      </Route>
      <Route path="/admin/members">
        <NonOrganiserAdminRoute component={PlayerManagement} />
      </Route>
      <Route path="/admin/players/:playerId">
        <NonOrganiserAdminRoute component={PlayerProfile} />
      </Route>
      <Route path="/admin/financials">
        <PremiumRoute component={Financials} />
      </Route>
      <Route path="/admin/membership-board">
        <NonOrganiserAdminRoute component={MembershipBoard} />
      </Route>
      <Route path="/admin/memberships">
        <NonOrganiserAdminRoute component={MembershipBoard} />
      </Route>
      <Route path="/admin/league">
        <PremiumRoute component={() => <Suspense fallback={<LazyFallback />}><LeagueManagement /></Suspense>} />
      </Route>
      <Route path="/admin/inventory">
        <PremiumRoute component={AdminInventory} />
      </Route>
      <Route path="/admin/referrals">
        <PremiumRoute component={() => <Suspense fallback={<LazyFallback />}><AdminReferrals /></Suspense>} />
      </Route>
      <Route path="/admin/notifications">
        <NonOrganiserAdminRoute component={() => <Suspense fallback={<LazyFallback />}><AdminNotifications /></Suspense>} />
      </Route>
      <Route path="/admin/attendance-rewards">
        <PremiumRoute component={() => <Suspense fallback={<LazyFallback />}><AttendanceRewards /></Suspense>} />
      </Route>
      <Route path="/admin/rewards">
        <PremiumRoute component={() => <Suspense fallback={<LazyFallback />}><ClubRewards /></Suspense>} />
      </Route>
      <Route path="/admin/rewards-dashboard">
        <PremiumRoute component={() => <Suspense fallback={<LazyFallback />}><RewardsDashboard /></Suspense>} />
      </Route>
      <Route path="/admin/announcements">
        <AdminRoute component={AdminAnnouncements} />
      </Route>
      <Route path="/admin/match-engine-lab">
        <AdminRoute component={() => <Suspense fallback={<LazyFallback />}><MatchEngineLab /></Suspense>} />
      </Route>
      <Route path="/admin/calendar">
        <AdminRoute component={CalendarImport} />
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
        <OwnerRoute component={SuperAdminClubs} />
      </Route>
      <Route path="/dashboard/analytics">
        <OwnerRoute component={() => <Suspense fallback={<LazyFallback />}><AnalyticsDashboard /></Suspense>} />
      </Route>
      <Route path="/admin/analytics">
        <OwnerRoute component={Analytics} />
      </Route>
      <Route path="/admin/acquisition-analytics">
        <PremiumRoute component={AcquisitionAnalytics} />
      </Route>
      <Route path="/admin/attendance-analytics">
        <PremiumRoute component={() => <Suspense fallback={<LazyFallback />}><AttendanceAnalytics /></Suspense>} />
      </Route>
      <Route path="/admin/inactive-members">
        <PremiumRoute component={() => <Suspense fallback={<LazyFallback />}><InactiveMembers /></Suspense>} />
      </Route>
      <Route path="/admin/import-members">
        <PremiumRoute component={MemberImport} />
      </Route>

      <Route path="/admin/password-resets">
        <AdminRoute component={PasswordResets} />
      </Route>
      <Route path="/admin/messages">
        <AdminRoute component={Messages} />
      </Route>
      <Route path="/admin/chat-moderation">
        <AdminRoute component={() => <Suspense fallback={<LazyFallback />}><ChatModeration /></Suspense>} />
      </Route>
      <Route path="/admin/black-card">
        <AdminRoute component={() => <Suspense fallback={<LazyFallback />}><BlackCardManagement /></Suspense>} />
      </Route>
      <Route path="/admin/recognition-cards">
        <AdminRoute component={() => <Suspense fallback={<LazyFallback />}><RecognitionCards /></Suspense>} />
      </Route>
      <Route path="/admin/trials">
        <AdminRoute component={() => <Suspense fallback={<LazyFallback />}><TrialManagement /></Suspense>} />
      </Route>

      <Route path="/incidents">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><IncidentReports /></Suspense>} />
      </Route>
      <Route path="/trial-dashboard">
        <PrivateRoute component={() => <Suspense fallback={<LazyFallback />}><TrialDashboard /></Suspense>} allowTrial />
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
      <Route path="/super-admin/billing">
        <OwnerRoute component={SuperAdminBilling} />
      </Route>
      <Route path="/super-admin/referrals">
        <OwnerRoute component={SuperAdminReferrals} />
      </Route>
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function ThemeSync() {
  const { data: user } = useUser();
  const { syncFromUser } = useTheme();
  const { syncFromUser: syncBg } = useBackground();
  const { syncFromUser: syncFont } = useTypography();

  useEffect(() => {
    if (user && user.displayMode) {
      syncFromUser(user.displayMode as any, user.reducedMotion ?? false, user.id);
    }
    if (user) {
      syncBg(user.dashboardBackground);
      syncFont(user.fontFamily, user.fontMode);
    }
  }, [user?.id, user?.displayMode, user?.reducedMotion, user?.dashboardBackground, user?.fontFamily, user?.fontMode]);

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
        <IosFirstVisitPrompt />
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
