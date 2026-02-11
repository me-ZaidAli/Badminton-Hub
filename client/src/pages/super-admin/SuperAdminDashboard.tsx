import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Building2, Calendar, Trophy, DollarSign,
  Shield, Zap, KeyRound, Mail, BarChart3,
  Package, CreditCard, Upload, ChevronRight
} from "lucide-react";

const controlItems = [
  { href: "/super-admin/users", label: "Users Control", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
  { href: "/super-admin/clubs", label: "Clubs Control", icon: Building2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { href: "/super-admin/sessions", label: "Sessions Control", icon: Calendar, color: "text-violet-500", bg: "bg-violet-500/10" },
  { href: "/all-rankings", label: "All Rankings", icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10" },
  { href: "/admin/members", label: "Members", icon: Users, color: "text-sky-500", bg: "bg-sky-500/10" },
  { href: "/admin/club-approvals", label: "Club Approvals", icon: Building2, color: "text-teal-500", bg: "bg-teal-500/10" },
  { href: "/admin/password-resets", label: "Password Resets", icon: KeyRound, color: "text-orange-500", bg: "bg-orange-500/10" },
  { href: "/admin/messages", label: "Messages", icon: Mail, color: "text-pink-500", bg: "bg-pink-500/10" },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { href: "/admin/financials", label: "Financials", icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
  { href: "/admin/inventory", label: "Inventory", icon: Package, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { href: "/admin/membership-board", label: "Membership Board", icon: CreditCard, color: "text-purple-500", bg: "bg-purple-500/10" },
  { href: "/admin/import-members", label: "Import Members", icon: Upload, color: "text-rose-500", bg: "bg-rose-500/10" },
];

export default function SuperAdminDashboard() {
  return (
    <div className="space-y-8" data-testid="super-admin-dashboard">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3" data-testid="text-super-admin-title">
            <Shield className="w-8 h-8 text-primary" />
            God's Mode Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Full control access to all system features.</p>
        </div>
        <Badge variant="destructive" className="text-sm py-1.5 px-4" data-testid="badge-god-mode">
          <Zap className="h-4 w-4 mr-2" />
          GOD MODE
        </Badge>
      </div>

      <Card data-testid="card-quick-actions">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Control Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {controlItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className="flex items-center gap-4 px-4 py-3 rounded-lg hover-elevate cursor-pointer border border-border/50 transition-all"
                  data-testid={`button-quick-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${item.bg}`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="flex-1 font-medium text-sm">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
