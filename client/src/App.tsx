import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar, MobileNav } from "@/components/layout/Sidebar";
import { useUser } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

// Pages
import Home from "@/pages/Home";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
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

// Admin Pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import UserManagement from "@/pages/admin/UserManagement";
import PlayerManagement from "@/pages/admin/PlayerManagement";
import Financials from "@/pages/admin/Financials";
import Announcements from "@/pages/admin/Announcements";
import CalendarImport from "@/pages/admin/CalendarImport";
import UserApproval from "@/pages/admin/UserApproval";
import ClubManagement from "@/pages/admin/ClubManagement";
import ClubApprovals from "@/pages/admin/ClubApprovals";
import ClubAdmins from "@/pages/admin/ClubAdmins";
import PlayerProfile from "@/pages/admin/PlayerProfile";
import Venues from "@/pages/Venues";
import ClubsManagement from "@/pages/ClubsManagement";

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

  // Not logged in - show standalone page with simple header
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex justify-between items-center">
        <a href="/" className="text-xl font-bold text-primary">Badminton Management</a>
        <div className="flex gap-2">
          <a href="/login" className="px-4 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors">Login</a>
          <a href="/register" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">Register</a>
        </div>
      </header>
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        <Component />
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
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
      <Route path="/profile">
        <Profile />
      </Route>

      {/* Admin Routes - OWNER only */}
      <Route path="/admin">
        <OwnerRoute component={AdminDashboard} />
      </Route>
      <Route path="/admin/users">
        <OwnerRoute component={UserManagement} />
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
