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
import Players from "@/pages/Players";
import NotFound from "@/pages/not-found";

// Admin Pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import UserManagement from "@/pages/admin/UserManagement";
import PlayerManagement from "@/pages/admin/PlayerManagement";
import Financials from "@/pages/admin/Financials";
import Announcements from "@/pages/admin/Announcements";
import CalendarImport from "@/pages/admin/CalendarImport";
import UserApproval from "@/pages/admin/UserApproval";

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
        <a href="/" className="text-xl font-bold text-primary">SmashClub</a>
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
      <Route path="/players">
        <PrivateRoute component={Players} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        <AdminRoute component={AdminDashboard} />
      </Route>
      <Route path="/admin/users">
        <AdminRoute component={UserManagement} />
      </Route>
      <Route path="/admin/players">
        <AdminRoute component={PlayerManagement} />
      </Route>
      <Route path="/admin/financials">
        <AdminRoute component={Financials} />
      </Route>
      <Route path="/admin/announcements">
        <AdminRoute component={Announcements} />
      </Route>
      <Route path="/admin/calendar">
        <AdminRoute component={CalendarImport} />
      </Route>
      <Route path="/admin/approvals">
        <AdminRoute component={UserApproval} />
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
