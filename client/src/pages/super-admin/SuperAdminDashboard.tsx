import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, Building2, Calendar, Trophy, DollarSign,
  Shield, Zap, KeyRound, Mail, BarChart3,
  Package, CreditCard, Upload
} from "lucide-react";

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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            <Link href="/super-admin/users">
              <Button variant="outline" className="w-full gap-2 justify-start" data-testid="button-quick-users">
                <Users className="w-4 h-4" /> Users Control
              </Button>
            </Link>
            <Link href="/super-admin/clubs">
              <Button variant="outline" className="w-full gap-2 justify-start" data-testid="button-quick-clubs">
                <Building2 className="w-4 h-4" /> Clubs Control
              </Button>
            </Link>
            <Link href="/super-admin/sessions">
              <Button variant="outline" className="w-full gap-2 justify-start" data-testid="button-quick-sessions">
                <Calendar className="w-4 h-4" /> Sessions Control
              </Button>
            </Link>
            <Link href="/all-rankings">
              <Button variant="outline" className="w-full gap-2 justify-start" data-testid="button-quick-rankings">
                <Trophy className="w-4 h-4" /> All Rankings
              </Button>
            </Link>
            <Link href="/admin/members">
              <Button variant="outline" className="w-full gap-2 justify-start" data-testid="button-quick-members">
                <Users className="w-4 h-4" /> Members
              </Button>
            </Link>
            <Link href="/admin/club-approvals">
              <Button variant="outline" className="w-full gap-2 justify-start" data-testid="button-quick-club-approvals">
                <Building2 className="w-4 h-4" /> Club Approvals
              </Button>
            </Link>
            <Link href="/admin/password-resets">
              <Button variant="outline" className="w-full gap-2 justify-start" data-testid="button-quick-password-resets">
                <KeyRound className="w-4 h-4" /> Password Resets
              </Button>
            </Link>
            <Link href="/admin/messages">
              <Button variant="outline" className="w-full gap-2 justify-start" data-testid="button-quick-messages">
                <Mail className="w-4 h-4" /> Messages
              </Button>
            </Link>
            <Link href="/admin/analytics">
              <Button variant="outline" className="w-full gap-2 justify-start" data-testid="button-quick-analytics">
                <BarChart3 className="w-4 h-4" /> Analytics
              </Button>
            </Link>
            <Link href="/admin/financials">
              <Button variant="outline" className="w-full gap-2 justify-start" data-testid="button-quick-financials">
                <DollarSign className="w-4 h-4" /> Financials
              </Button>
            </Link>
            <Link href="/admin/inventory">
              <Button variant="outline" className="w-full gap-2 justify-start" data-testid="button-quick-inventory">
                <Package className="w-4 h-4" /> Inventory
              </Button>
            </Link>
            <Link href="/admin/membership-board">
              <Button variant="outline" className="w-full gap-2 justify-start" data-testid="button-quick-membership-board">
                <CreditCard className="w-4 h-4" /> Membership Board
              </Button>
            </Link>
            <Link href="/admin/import-members">
              <Button variant="outline" className="w-full gap-2 justify-start" data-testid="button-quick-import-members">
                <Upload className="w-4 h-4" /> Import Members
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
