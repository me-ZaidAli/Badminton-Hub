import { useState, useRef, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useLogout } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUploadProfilePicture } from "@/hooks/use-sessions";
import {
  LogOut, User, Settings, Shield, Loader2, XCircle, MapPin, Phone, Calendar,
  AlertCircle, Camera, Wallet, TrendingUp, TrendingDown, History, CreditCard,
  Eye, EyeOff, Users, Plus, Pencil, Trash2, Sun, Moon, Palette, Contrast,
  CircleOff, Zap, Trophy, Target, BarChart3, Activity, CalendarDays,
  PoundSterling, ChevronRight, Star, Clock, Award, Building2
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useTheme, DISPLAY_MODES, type DisplayMode } from "@/hooks/use-theme";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MODE_ICONS: Record<DisplayMode, typeof Sun> = {
  light: Sun, dark: Moon, sepia: Palette, migraine: Eye,
  "high-contrast": Contrast, grayscale: CircleOff,
};

function MetricCard({ icon: Icon, label, value, subtext, onClick, className = "" }: {
  icon: typeof Trophy; label: string; value: string | number; subtext?: string;
  onClick?: () => void; className?: string;
}) {
  return (
    <Card
      className={`${onClick ? "cursor-pointer hover-elevate" : ""} ${className}`}
      onClick={onClick}
      data-testid={`metric-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-xl font-bold">{value}</p>
            {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
          </div>
          {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        </div>
      </CardContent>
    </Card>
  );
}

function DisplayAccessibilitySection() {
  const { displayMode, reducedMotion, setDisplayMode, setReducedMotion } = useTheme();
  return (
    <Card data-testid="card-display-accessibility">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Display & Accessibility
        </CardTitle>
        <CardDescription>Choose a display mode that works best for you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DISPLAY_MODES.map((mode) => {
            const Icon = MODE_ICONS[mode.value];
            const isActive = displayMode === mode.value;
            return (
              <button key={mode.value} onClick={() => setDisplayMode(mode.value)}
                className={`flex items-start gap-3 p-3 rounded-md border text-left transition-colors ${isActive ? "border-primary bg-primary/5" : "border-border hover-elevate"}`}
                data-testid={`button-display-mode-${mode.value}`}>
                <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <div className={`text-sm font-medium ${isActive ? "text-primary" : ""}`}>{mode.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{mode.description}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <div className="text-sm font-medium">Reduced Motion</div>
                <div className="text-xs text-muted-foreground">Disable animations and transitions</div>
              </div>
            </div>
            <Switch checked={reducedMotion} onCheckedChange={setReducedMotion} data-testid="switch-reduced-motion" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreditsModal({ open, onClose, creditBalances, memberships }: {
  open: boolean; onClose: () => void;
  creditBalances: { clubId: number; clubName: string; balance: number }[] | undefined;
  memberships: { clubId: number; clubName: string; membershipStatus: string }[] | undefined;
}) {
  const balanceMap = new Map((creditBalances || []).map(cb => [cb.clubId, cb]));
  const allClubs = new Map<number, { clubId: number; clubName: string; balance: number }>();
  (memberships || []).forEach(m => {
    if (!allClubs.has(m.clubId)) {
      const existing = balanceMap.get(m.clubId);
      allClubs.set(m.clubId, existing || { clubId: m.clubId, clubName: m.clubName, balance: 0 });
    }
  });
  (creditBalances || []).forEach(cb => { if (!allClubs.has(cb.clubId)) allClubs.set(cb.clubId, cb); });
  const clubs = Array.from(allClubs.values());

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[450px]" data-testid="modal-credits">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Credit Balances
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {clubs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No credit data available</p>
          ) : clubs.map((cb) => (
            <div key={cb.clubId} className="flex items-center justify-between py-3 px-4 rounded-md bg-muted/50" data-testid={`credit-balance-${cb.clubId}`}>
              <span className="font-medium">{cb.clubName}</span>
              <span className={`text-lg font-bold ${Number(cb.balance) > 0 ? "text-green-600" : Number(cb.balance) < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                {Number(cb.balance) > 0 ? "+" : ""}£{(Math.abs(Number(cb.balance)) / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OutstandingModal({ open, onClose, payments }: {
  open: boolean; onClose: () => void;
  payments: any[] | undefined;
}) {
  const grouped = useMemo(() => {
    return (payments || []).reduce((acc: Record<string, any[]>, p: any) => {
      if (!acc[p.clubName]) acc[p.clubName] = [];
      acc[p.clubName].push(p);
      return acc;
    }, {});
  }, [payments]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto" data-testid="modal-outstanding">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Outstanding Payments
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {Object.entries(grouped).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No outstanding payments</p>
          ) : Object.entries(grouped).map(([clubName, clubPayments]) => {
            const total = (clubPayments as any[]).reduce((sum: number, p: any) => sum + p.fee, 0);
            return (
              <div key={clubName} className="space-y-2" data-testid={`outstanding-club-${clubName}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{clubName}</span>
                  <Badge variant="secondary">Total: £{(total / 100).toFixed(2)}</Badge>
                </div>
                {(clubPayments as any[]).map((p: any) => (
                  <div key={p.signupId} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{p.sessionTitle}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(p.sessionDate), "MMM d, yyyy")}</span>
                    </div>
                    <span className="text-sm font-bold text-amber-600">£{(p.fee / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MembershipsModal({ open, onClose, memberships }: {
  open: boolean; onClose: () => void; memberships: any[] | undefined;
}) {
  const active = (memberships || []).filter((m: any) => m.status === "ACTIVE" || m.status === "EXPIRING");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto" data-testid="modal-memberships">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            My Memberships
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No active memberships</p>
          ) : active.map((m: any) => {
            const daysRemaining = Math.ceil((new Date(m.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const isExpired = daysRemaining <= 0;
            const isExpiring = daysRemaining > 0 && daysRemaining <= 30;
            return (
              <Card key={m.id} data-testid={`membership-detail-${m.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-lg">{m.clubName}</p>
                      <p className="text-sm text-muted-foreground">{m.planName}</p>
                    </div>
                    <Badge variant={isExpired ? "destructive" : isExpiring ? "secondary" : "default"}>
                      {isExpired ? "Expired" : isExpiring ? "Expiring Soon" : "Active"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Price Paid</p>
                      <p className="font-medium">£{((m.proratedPrice || m.planAnnualPrice || 0) / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Session Fee</p>
                      <p className="font-medium">£{((m.planDefaultSessionFee || 0) / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Start Date</p>
                      <p className="font-medium">{m.startDate ? format(new Date(m.startDate), "MMM d, yyyy") : "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expires</p>
                      <p className={`font-medium ${isExpired ? "text-red-600" : isExpiring ? "text-amber-500" : ""}`}>
                        {m.endDate ? format(new Date(m.endDate), "MMM d, yyyy") : "N/A"}
                      </p>
                    </div>
                  </div>
                  {!isExpired && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-sm">
                        <span className={`font-bold ${isExpiring ? "text-amber-500" : "text-green-600"}`}>
                          {daysRemaining} days
                        </span>
                        <span className="text-muted-foreground"> remaining</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="pt-2">
          <Link href="/memberships">
            <Button variant="outline" className="w-full" data-testid="button-view-all-memberships">
              View All Memberships
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PerformanceModal({ open, onClose, profiles }: {
  open: boolean; onClose: () => void; profiles: any[] | undefined;
}) {
  const [selectedClub, setSelectedClub] = useState<string>("all");
  const filteredProfiles = useMemo(() => {
    if (!profiles) return [];
    if (selectedClub === "all") return profiles;
    return profiles.filter((p: any) => p.clubId.toString() === selectedClub);
  }, [profiles, selectedClub]);

  const totals = useMemo(() => {
    const played = filteredProfiles.reduce((s: number, p: any) => s + (p.matchesPlayed || 0), 0);
    const won = filteredProfiles.reduce((s: number, p: any) => s + (p.matchesWon || 0), 0);
    const lost = played - won;
    const winPct = played > 0 ? Math.round((won / played) * 100) : 0;
    return { played, won, lost, winPct };
  }, [filteredProfiles]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto" data-testid="modal-performance">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Stats
          </DialogTitle>
        </DialogHeader>
        {profiles && profiles.length > 1 && (
          <Select value={selectedClub} onValueChange={setSelectedClub}>
            <SelectTrigger data-testid="select-perf-club">
              <SelectValue placeholder="All Clubs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clubs</SelectItem>
              {profiles.map((p: any) => (
                <SelectItem key={p.clubId} value={p.clubId.toString()}>
                  {p.club?.name || `Club ${p.clubId}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-md bg-muted/50 text-center">
            <p className="text-3xl font-bold text-green-600">{totals.won}</p>
            <p className="text-xs text-muted-foreground">Matches Won</p>
          </div>
          <div className="p-4 rounded-md bg-muted/50 text-center">
            <p className="text-3xl font-bold text-red-600">{totals.lost}</p>
            <p className="text-xs text-muted-foreground">Matches Lost</p>
          </div>
          <div className="p-4 rounded-md bg-muted/50 text-center">
            <p className="text-3xl font-bold">{totals.played}</p>
            <p className="text-xs text-muted-foreground">Total Matches</p>
          </div>
          <div className="p-4 rounded-md bg-muted/50 text-center">
            <p className="text-3xl font-bold text-primary">{totals.winPct}%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
        </div>
        {filteredProfiles.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium text-muted-foreground">Per Club Breakdown</p>
            {filteredProfiles.map((p: any) => {
              const played = p.matchesPlayed || 0;
              const won = p.matchesWon || 0;
              const pct = played > 0 ? Math.round((won / played) * 100) : 0;
              const barWidth = Math.max(pct, 2);
              return (
                <div key={p.id} className="space-y-1" data-testid={`perf-club-${p.clubId}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{p.club?.name || `Club ${p.clubId}`}</span>
                    <span className="text-muted-foreground">{won}W / {played - won}L ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${barWidth}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type SessionHistoryItem = {
  sessionId: number; sessionTitle: string; sessionDate: string;
  sessionStartTime: string; sessionStatus: string; clubId: number;
  clubName: string; fee: number; paymentStatus: string;
  matchesWon: number; matchesLost: number; matchesTotal: number;
};

function TotalSessionsModal({ open, onClose, sessions }: {
  open: boolean; onClose: () => void; sessions: SessionHistoryItem[] | undefined;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" data-testid="modal-total-sessions">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            All Sessions
          </DialogTitle>
        </DialogHeader>
        {!sessions || sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No sessions attended yet.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s, i) => (
              <div key={`${s.sessionId}-${i}`} className="p-3 rounded-md bg-muted/50 space-y-1" data-testid={`session-item-${s.sessionId}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-medium text-sm">{s.sessionTitle}</p>
                  <Badge variant="outline">{s.clubName}</Badge>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    {s.sessionDate ? format(new Date(s.sessionDate), "dd MMM yyyy") : "—"} at {s.sessionStartTime || "—"}
                  </p>
                  {s.matchesTotal > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-primary">{s.matchesWon}W</span>
                      <span className="text-xs text-muted-foreground">/</span>
                      <span className="text-xs font-medium text-destructive">{s.matchesLost}L</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SessionsThisMonthModal({ open, onClose, sessions }: {
  open: boolean; onClose: () => void; sessions: SessionHistoryItem[] | undefined;
}) {
  const thisMonthSessions = useMemo(() => {
    if (!sessions) return [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return sessions.filter(s => s.sessionDate && new Date(s.sessionDate) >= monthStart);
  }, [sessions]);

  const summary = useMemo(() => {
    const totalMatches = thisMonthSessions.reduce((s, x) => s + x.matchesTotal, 0);
    const totalWon = thisMonthSessions.reduce((s, x) => s + x.matchesWon, 0);
    const totalLost = thisMonthSessions.reduce((s, x) => s + x.matchesLost, 0);
    const totalFees = thisMonthSessions.reduce((s, x) => s + x.fee, 0);
    return { totalMatches, totalWon, totalLost, totalFees };
  }, [thisMonthSessions]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" data-testid="modal-sessions-this-month">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Sessions This Month
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-md bg-muted/50 text-center">
            <p className="text-2xl font-bold">{thisMonthSessions.length}</p>
            <p className="text-xs text-muted-foreground">Sessions</p>
          </div>
          <div className="p-3 rounded-md bg-muted/50 text-center">
            <p className="text-2xl font-bold">{summary.totalMatches}</p>
            <p className="text-xs text-muted-foreground">Matches</p>
          </div>
          <div className="p-3 rounded-md bg-muted/50 text-center">
            <p className="text-2xl font-bold text-primary">{summary.totalWon}</p>
            <p className="text-xs text-muted-foreground">Won</p>
          </div>
          <div className="p-3 rounded-md bg-muted/50 text-center">
            <p className="text-2xl font-bold text-destructive">{summary.totalLost}</p>
            <p className="text-xs text-muted-foreground">Lost</p>
          </div>
        </div>
        <div className="p-3 rounded-md bg-muted/50 text-center">
          <p className="text-2xl font-bold">£{(summary.totalFees / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Total Spent This Month</p>
        </div>
        {thisMonthSessions.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium text-muted-foreground">Session List</p>
            {thisMonthSessions.map((s, i) => (
              <div key={`${s.sessionId}-${i}`} className="p-3 rounded-md bg-muted/50 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-medium text-sm">{s.sessionTitle}</p>
                  <Badge variant="outline">{s.clubName}</Badge>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    {s.sessionDate ? format(new Date(s.sessionDate), "dd MMM yyyy") : "—"}
                  </p>
                  <div className="flex items-center gap-2">
                    {s.matchesTotal > 0 && (
                      <>
                        <span className="text-xs font-medium text-primary">{s.matchesWon}W</span>
                        <span className="text-xs text-muted-foreground">/</span>
                        <span className="text-xs font-medium text-destructive">{s.matchesLost}L</span>
                        <span className="text-xs text-muted-foreground mx-1">|</span>
                      </>
                    )}
                    <span className="text-xs font-medium">£{(s.fee / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ClubsModal({ open, onClose, profiles, sessions }: {
  open: boolean; onClose: () => void; profiles: any[] | undefined; sessions: SessionHistoryItem[] | undefined;
}) {
  const clubSessionCounts = useMemo(() => {
    if (!sessions) return new Map<number, number>();
    const counts = new Map<number, number>();
    sessions.forEach(s => counts.set(s.clubId, (counts.get(s.clubId) || 0) + 1));
    return counts;
  }, [sessions]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-background max-h-[80vh] flex flex-col" data-testid="modal-clubs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            My Clubs ({profiles?.length || 0})
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto space-y-2">
          {(!profiles || profiles.length === 0) ? (
            <p className="text-muted-foreground text-sm text-center py-4">No clubs joined yet</p>
          ) : (
            profiles.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-3 px-4 rounded-md bg-muted/50" data-testid={`club-item-${p.clubId}`}>
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{p.club?.name || `Club ${p.clubId}`}</span>
                </div>
                <Badge variant="secondary" className="text-xs" data-testid={`club-sessions-${p.clubId}`}>
                  <CalendarDays className="h-3 w-3 mr-1" />
                  {clubSessionCounts.get(p.clubId) || 0} session{(clubSessionCounts.get(p.clubId) || 0) !== 1 ? "s" : ""}
                </Badge>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TotalSpentModal({ open, onClose, sessions }: {
  open: boolean; onClose: () => void; sessions: SessionHistoryItem[] | undefined;
}) {
  const [selectedClub, setSelectedClub] = useState<string>("all");

  const clubs = useMemo(() => {
    if (!sessions) return [];
    const map = new Map<number, string>();
    sessions.forEach(s => map.set(s.clubId, s.clubName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sessions]);

  const filtered = useMemo(() => {
    if (!sessions) return [];
    if (selectedClub === "all") return sessions;
    return sessions.filter(s => s.clubId.toString() === selectedClub);
  }, [sessions, selectedClub]);

  const totalFiltered = useMemo(() => filtered.reduce((s, x) => s + x.fee, 0), [filtered]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" data-testid="modal-total-spent">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PoundSterling className="h-5 w-5" />
            Total Spent on Sessions
          </DialogTitle>
        </DialogHeader>
        {clubs.length > 1 && (
          <Select value={selectedClub} onValueChange={setSelectedClub}>
            <SelectTrigger data-testid="select-spent-club">
              <SelectValue placeholder="All Clubs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clubs</SelectItem>
              {clubs.map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="p-4 rounded-md bg-primary/10 text-center">
          <p className="text-3xl font-bold">£{(totalFiltered / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{filtered.length} session{filtered.length !== 1 ? "s" : ""}{selectedClub !== "all" ? ` at ${clubs.find(c => c.id.toString() === selectedClub)?.name}` : ""}</p>
        </div>
        {filtered.length > 0 && (
          <div className="space-y-2 pt-2">
            {filtered.map((s, i) => (
              <div key={`${s.sessionId}-${i}`} className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50" data-testid={`spent-session-${s.sessionId}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.sessionTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.sessionDate ? format(new Date(s.sessionDate), "dd MMM yyyy") : "—"}
                    {selectedClub === "all" && ` — ${s.clubName}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">£{(s.fee / 100).toFixed(2)}</p>
                  <Badge variant={s.paymentStatus === "PAID" ? "default" : "secondary"} className="text-[10px]">
                    {s.paymentStatus || "UNPAID"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreditHistoryModal({ open, onClose, history }: {
  open: boolean; onClose: () => void; history: any[] | undefined;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" data-testid="modal-credit-history">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Credit History
          </DialogTitle>
        </DialogHeader>
        {!history || history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No credit transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Club</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(entry.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-sm">{entry.clubName}</TableCell>
                    <TableCell>
                      <span className={`font-medium flex items-center gap-1 ${entry.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {entry.amount >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {entry.amount >= 0 ? "+" : ""}£{(Math.abs(entry.amount) / 100).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{entry.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MembershipBenefitsCard({ clubId, clubName, sessionFee }: { clubId: number; clubName: string; sessionFee: number | null }) {
  const { data: plans } = useQuery<any[]>({
    queryKey: ["/api/clubs", clubId, "membership-plans"],
    enabled: !!clubId,
  });
  const [, navigate] = useLocation();

  if (!plans || plans.length === 0) return null;
  const plan = plans.find((p: any) => p.isDefault) || plans[0];
  const planPrice = (plan.annualPrice || 0) / 100;
  const memberFee = (plan.defaultSessionFee || 0) / 100;
  const regularFee = sessionFee ? sessionFee / 100 : memberFee + 2;
  const savingsPerSession = regularFee - memberFee;
  const breakEvenSessions = savingsPerSession > 0 ? Math.ceil(planPrice / savingsPerSession) : 0;

  return (
    <Card className="border-primary/20" data-testid={`card-membership-benefits-${clubId}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <Star className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm">{clubName}</p>
            <p className="text-xs text-muted-foreground">{plan.name} - £{planPrice.toFixed(2)}</p>
          </div>
        </div>
        {savingsPerSession > 0 && (
          <div className="rounded-md bg-green-50 dark:bg-green-950/30 p-3">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
              Save £{savingsPerSession.toFixed(2)} per session
            </p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
              Break even after {breakEvenSessions} sessions
            </p>
          </div>
        )}
        <Button size="sm" className="w-full" onClick={() => navigate("/memberships")} data-testid={`button-join-membership-${clubId}`}>
          View Membership Options
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Profile() {
  const [, navigate] = useLocation();
  const { data: user, isLoading: userLoading } = useUser();
  const { mutate: uploadProfilePicture, isPending: isUploadingPic } = useUploadProfilePicture();
  const profilePicInputRef = useRef<HTMLInputElement>(null);
  const { data: profiles } = useQuery<any[]>({ queryKey: ["/api/player-profiles"], enabled: !!user });
  const { data: memberships } = useQuery<{ clubId: number; clubName: string; membershipStatus: string }[]>({ queryKey: ["/api/user/memberships"], enabled: !!user });
  const logout = useLogout();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: "", phone: "", dateOfBirth: "", city: "", country: "" });

  const { data: creditBalances } = useQuery<{ clubId: number; clubName: string; balance: number }[]>({ queryKey: ["/api/my-credits"], enabled: !!user });
  const { data: creditHistory } = useQuery<any[]>({ queryKey: ["/api/my-credits/history"], enabled: !!user });
  const { data: outstandingPayments } = useQuery<any[]>({ queryKey: ["/api/my-outstanding-payments"], enabled: !!user });
  const { data: clubMemberships } = useQuery<any[]>({ queryKey: ["/api/my-memberships"], enabled: !!user });
  const { data: sessionActivity } = useQuery<{ totalSessions: number; sessionsThisMonth: number; totalSpent: number }>({ queryKey: ["/api/my-session-activity"], enabled: !!user });

  const { data: sessionHistory } = useQuery<SessionHistoryItem[]>({ queryKey: ["/api/my-session-history"], enabled: !!user });

  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [outstandingModalOpen, setOutstandingModalOpen] = useState(false);
  const [membershipsModalOpen, setMembershipsModalOpen] = useState(false);
  const [performanceModalOpen, setPerformanceModalOpen] = useState(false);
  const [creditHistoryModalOpen, setCreditHistoryModalOpen] = useState(false);
  const [totalSessionsModalOpen, setTotalSessionsModalOpen] = useState(false);
  const [sessionsThisMonthModalOpen, setSessionsThisMonthModalOpen] = useState(false);
  const [totalSpentModalOpen, setTotalSpentModalOpen] = useState(false);
  const [clubsModalOpen, setClubsModalOpen] = useState(false);

  const [privacyNickname, setPrivacyNickname] = useState("");
  const [privacyShowPublicName, setPrivacyShowPublicName] = useState(false);
  const [isEditingPrivacy, setIsEditingPrivacy] = useState(false);

  const [juniorDialogOpen, setJuniorDialogOpen] = useState(false);
  const [editingJunior, setEditingJunior] = useState<any>(null);
  const [deletingJuniorId, setDeletingJuniorId] = useState<number | null>(null);
  const [juniorForm, setJuniorForm] = useState({ fullName: "", dateOfBirth: "", emergencyContact: "", medicalNotes: "" });

  const { data: juniors, isLoading: juniorsLoading } = useQuery<any[]>({ queryKey: ["/api/juniors"], enabled: !!user });

  const totalCredits = useMemo(() => {
    if (!creditBalances) return 0;
    return creditBalances.reduce((sum, cb) => sum + Number(cb.balance), 0);
  }, [creditBalances]);

  const totalOutstanding = useMemo(() => {
    if (!outstandingPayments) return 0;
    return outstandingPayments.reduce((sum: number, p: any) => sum + p.fee, 0);
  }, [outstandingPayments]);

  const performance = useMemo(() => {
    if (!profiles) return { played: 0, won: 0, lost: 0, winPct: 0 };
    const played = profiles.reduce((s: number, p: any) => s + (p.matchesPlayed || 0), 0);
    const won = profiles.reduce((s: number, p: any) => s + (p.matchesWon || 0), 0);
    return { played, won, lost: played - won, winPct: played > 0 ? Math.round((won / played) * 100) : 0 };
  }, [profiles]);

  const activeMembershipClubIds = useMemo(() => {
    return new Set((clubMemberships || []).filter((m: any) => m.status === "ACTIVE" || m.status === "EXPIRING").map((m: any) => m.clubId));
  }, [clubMemberships]);

  const clubsWithoutMembership = useMemo(() => {
    if (!profiles) return [];
    return profiles.filter((p: any) => !activeMembershipClubIds.has(p.clubId) && p.membershipStatus === "APPROVED")
      .map((p: any) => ({ clubId: p.clubId, clubName: p.club?.name || `Club ${p.clubId}`, sessionFee: p.club?.sessionFee }));
  }, [profiles, activeMembershipClubIds]);

  const activeMembershipCount = activeMembershipClubIds.size;
  const primaryProfile = profiles?.[0];

  const addJuniorMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/juniors", data); if (!res.ok) { const error = await res.json(); throw new Error(error.message); } return res.json(); },
    onSuccess: () => { toast({ title: "Junior added" }); queryClient.invalidateQueries({ queryKey: ["/api/juniors"] }); setJuniorDialogOpen(false); resetJuniorForm(); },
    onError: (error: Error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });
  const editJuniorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { const res = await apiRequest("PATCH", `/api/juniors/${id}`, data); if (!res.ok) { const error = await res.json(); throw new Error(error.message); } return res.json(); },
    onSuccess: () => { toast({ title: "Junior updated" }); queryClient.invalidateQueries({ queryKey: ["/api/juniors"] }); setJuniorDialogOpen(false); setEditingJunior(null); resetJuniorForm(); },
    onError: (error: Error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });
  const deleteJuniorMutation = useMutation({
    mutationFn: async (id: number) => { const res = await apiRequest("DELETE", `/api/juniors/${id}`); if (!res.ok) { const error = await res.json(); throw new Error(error.message); } return res.json(); },
    onSuccess: () => { toast({ title: "Junior removed" }); queryClient.invalidateQueries({ queryKey: ["/api/juniors"] }); setDeletingJuniorId(null); },
    onError: (error: Error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });

  const resetJuniorForm = () => setJuniorForm({ fullName: "", dateOfBirth: "", emergencyContact: "", medicalNotes: "" });
  const openAddJuniorDialog = () => { setEditingJunior(null); resetJuniorForm(); setJuniorDialogOpen(true); };
  const openEditJuniorDialog = (junior: any) => {
    setEditingJunior(junior);
    setJuniorForm({ fullName: junior.fullName || "", dateOfBirth: junior.dateOfBirth ? new Date(junior.dateOfBirth).toISOString().split("T")[0] : "", emergencyContact: junior.emergencyContact || "", medicalNotes: junior.medicalNotes || "" });
    setJuniorDialogOpen(true);
  };
  const handleSaveJunior = () => {
    const payload = { fullName: juniorForm.fullName, dateOfBirth: juniorForm.dateOfBirth || undefined, emergencyContact: juniorForm.emergencyContact || undefined, medicalNotes: juniorForm.medicalNotes || undefined };
    if (editingJunior) editJuniorMutation.mutate({ id: editingJunior.id, data: payload });
    else addJuniorMutation.mutate(payload);
  };

  const updatePrivacyMutation = useMutation({
    mutationFn: async (data: { nickname?: string; showPublicName?: boolean }) => { const res = await apiRequest("PATCH", "/api/user/profile", data); if (!res.ok) { const error = await res.json(); throw new Error(error.message); } return res.json(); },
    onSuccess: () => { toast({ title: "Privacy settings updated" }); queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }); setIsEditingPrivacy(false); },
    onError: (error: Error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });
  const startEditingPrivacy = () => { setPrivacyNickname((user as any)?.nickname || ""); setPrivacyShowPublicName((user as any)?.showPublicName || false); setIsEditingPrivacy(true); };
  const handleSavePrivacy = () => { updatePrivacyMutation.mutate({ nickname: privacyNickname || undefined, showPublicName: privacyShowPublicName }); };

  const updateUserProfileMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("PATCH", "/api/user/profile", data); if (!res.ok) { const error = await res.json(); throw new Error(error.message); } return res.json(); },
    onSuccess: () => { toast({ title: "Profile updated" }); queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }); queryClient.invalidateQueries({ queryKey: ["/api/player-profiles"] }); setIsEditing(false); },
    onError: (error: Error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });
  const deleteAccountMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/account/close"); if (!res.ok) { const error = await res.json(); throw new Error(error.message); } return res.json(); },
    onSuccess: () => { toast({ title: "Account Deleted" }); queryClient.clear(); navigate("/"); },
    onError: (error: Error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });

  const handleLogout = () => { logout.mutate(); navigate("/"); };
  const startEditing = () => {
    setEditForm({ fullName: user?.fullName || "", phone: (user as any)?.phone || "", dateOfBirth: (user as any)?.dateOfBirth ? new Date((user as any).dateOfBirth).toISOString().split("T")[0] : "", city: (user as any)?.city || "", country: (user as any)?.country || "" });
    setIsEditing(true);
  };
  const handleSave = () => { updateUserProfileMutation.mutate({ fullName: editForm.fullName, phone: editForm.phone, dateOfBirth: editForm.dateOfBirth || undefined, city: editForm.city, country: editForm.country }); };

  const isProfileComplete = !!(user?.fullName && user.fullName.trim().length >= 2);

  if (userLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Card><CardContent className="p-8 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Not Logged In</h2>
          <p className="text-muted-foreground mb-4">Please log in to view your profile.</p>
          <Button onClick={() => navigate("/login")} data-testid="button-login">Log In</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {!isProfileComplete && (
        <Card className="border-amber-300 dark:border-amber-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Complete your profile</p>
                <p className="text-sm text-muted-foreground mt-1">Please fill in your name and details below before requesting to join a club.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Header */}
      <Card data-testid="card-profile-header">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="relative">
              <Avatar className="h-20 w-20">
                {(user as any).profilePictureUrl ? <AvatarImage src={(user as any).profilePictureUrl} /> : null}
                <AvatarFallback className="text-xl">{user.fullName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <button className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-sm" onClick={() => profilePicInputRef.current?.click()} disabled={isUploadingPic} data-testid="button-upload-profile-pic">
                {isUploadingPic ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              </button>
              <input type="file" accept="image/*" className="hidden" ref={profilePicInputRef}
                onChange={(e) => { const file = e.target.files?.[0]; if (file) { uploadProfilePicture({ file }); e.target.value = ""; } }} data-testid="input-profile-pic" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold" data-testid="text-user-name">{user.fullName || "New User"}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary" data-testid="badge-role">
                  <Shield className="h-3 w-3 mr-1" />
                  {user.role === "OWNER" ? "Platform Owner" : user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                </Badge>
                {primaryProfile?.grade && (
                  <Badge variant="outline" data-testid="badge-grade">
                    <Award className="h-3 w-3 mr-1" />
                    Grade {primaryProfile.grade}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                {(user as any)?.email && (
                  <span data-testid="text-email">{user.email}</span>
                )}
                {(user as any)?.city && (
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{(user as any).city}{(user as any).country ? `, ${(user as any).country}` : ""}</span>
                )}
              </div>
              {profiles && profiles.length > 0 && (
                <Badge variant="outline" className="text-xs cursor-pointer mt-2" onClick={() => setClubsModalOpen(true)} data-testid="badge-clubs-count">
                  <Building2 className="h-3 w-3 mr-1" />
                  {profiles.length} Club{profiles.length !== 1 ? "s" : ""}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Badge>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={startEditing} data-testid="button-edit-profile">
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard icon={Wallet} label="Credit Balance" value={`${totalCredits >= 0 ? "" : "-"}£${(Math.abs(totalCredits) / 100).toFixed(2)}`}
          subtext={creditBalances && creditBalances.length > 0 ? `Across ${creditBalances.length} club${creditBalances.length > 1 ? "s" : ""}` : "No credits yet"}
          onClick={() => setCreditsModalOpen(true)} />
        <MetricCard icon={AlertCircle} label="Outstanding Balance" value={`£${(totalOutstanding / 100).toFixed(2)}`}
          subtext={outstandingPayments && outstandingPayments.length > 0 ? `${outstandingPayments.length} unpaid session${outstandingPayments.length > 1 ? "s" : ""}` : "All paid up"}
          onClick={() => setOutstandingModalOpen(true)}
          className={totalOutstanding > 0 ? "border-amber-300/50 dark:border-amber-700/50" : ""} />
      </div>

      {/* Performance Stats - Single card with chart */}
      <Card className="cursor-pointer hover-elevate" onClick={() => setPerformanceModalOpen(true)} data-testid="card-performance">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Match Performance</p>
                <p className="text-xs text-muted-foreground">{performance.played} matches played</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={performance.played > 0
                      ? [{ name: "Won", value: performance.won }, { name: "Lost", value: performance.lost }]
                      : [{ name: "None", value: 1 }]}
                    cx="50%" cy="50%"
                    innerRadius={28} outerRadius={42}
                    paddingAngle={performance.played > 0 ? 3 : 0}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {performance.played > 0 ? (
                      <>
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--destructive))" />
                      </>
                    ) : (
                      <Cell fill="hsl(var(--muted-foreground) / 0.3)" />
                    )}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-2xl font-bold text-primary">{performance.won}</p>
                <p className="text-xs text-muted-foreground">Won</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{performance.lost}</p>
                <p className="text-xs text-muted-foreground">Lost</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{performance.winPct}%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{performance.played}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard icon={CalendarDays} label="Total Sessions" value={sessionActivity?.totalSessions ?? 0} onClick={() => setTotalSessionsModalOpen(true)} />
        <MetricCard icon={Clock} label="Sessions This Month" value={sessionActivity?.sessionsThisMonth ?? 0} onClick={() => setSessionsThisMonthModalOpen(true)} />
        <MetricCard icon={PoundSterling} label="Total Spent on Sessions" value={`£${((sessionActivity?.totalSpent ?? 0) / 100).toFixed(2)}`} onClick={() => setTotalSpentModalOpen(true)} />
      </div>

      {/* Credit History */}
      {creditHistory && creditHistory.length > 0 && (
        <Card className="cursor-pointer hover-elevate" onClick={() => setCreditHistoryModalOpen(true)} data-testid="card-credit-history">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Credit History</p>
                  <p className="text-xs text-muted-foreground">{creditHistory.length} transaction{creditHistory.length > 1 ? "s" : ""}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Memberships */}
      {activeMembershipCount > 0 && (
        <Card className="cursor-pointer hover-elevate" onClick={() => setMembershipsModalOpen(true)} data-testid="card-active-memberships">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Active Memberships</p>
                  <p className="text-xs text-muted-foreground">{activeMembershipCount} active membership{activeMembershipCount > 1 ? "s" : ""}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Membership Benefits - only for clubs without active membership */}
      {clubsWithoutMembership.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Membership Benefits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clubsWithoutMembership.map((club) => (
              <MembershipBenefitsCard key={club.clubId} clubId={club.clubId} clubName={club.clubName} sessionFee={club.sessionFee} />
            ))}
          </div>
        </div>
      )}

      {/* Account Settings */}
      <Card data-testid="card-account-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} placeholder="Your full name" data-testid="input-fullname" />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Your phone number" data-testid="input-phone" />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input id="dateOfBirth" type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })} data-testid="input-dob" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} placeholder="Your city" data-testid="input-city" />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} placeholder="Your country" data-testid="input-country" />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleSave} disabled={updateUserProfileMutation.isPending || !editForm.fullName.trim()} data-testid="button-save-profile">
                  {updateUserProfileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</Label>
                  <p className="font-medium text-sm" data-testid="text-phone">{(user as any)?.phone || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Date of Birth</Label>
                  <p className="font-medium text-sm" data-testid="text-dob">{(user as any)?.dateOfBirth ? new Date((user as any).dateOfBirth).toLocaleDateString() : "Not set"}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={startEditing} data-testid="button-edit-profile-settings">
                <Pencil className="h-4 w-4 mr-1" />
                Edit Profile
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card data-testid="card-privacy">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Privacy & Display
          </CardTitle>
          <CardDescription>Control how your name appears publicly</CardDescription>
        </CardHeader>
        <CardContent>
          {isEditingPrivacy ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname / Display Name</Label>
                <Input id="nickname" value={privacyNickname} onChange={(e) => setPrivacyNickname(e.target.value)} placeholder="Enter a nickname (optional)" data-testid="input-nickname" />
                <p className="text-xs text-muted-foreground">If set, your nickname will be shown instead of your real name on public views.</p>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
                <div className="space-y-1">
                  <Label htmlFor="showPublicName" className="font-medium flex items-center gap-1.5">
                    {privacyShowPublicName ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    Show my name publicly
                  </Label>
                  <p className="text-xs text-muted-foreground">When disabled, your name will appear blurred to other visitors.</p>
                </div>
                <Switch id="showPublicName" checked={privacyShowPublicName} onCheckedChange={setPrivacyShowPublicName} data-testid="switch-show-public-name" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleSavePrivacy} disabled={updatePrivacyMutation.isPending} data-testid="button-save-privacy">
                  {updatePrivacyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save
                </Button>
                <Button variant="outline" onClick={() => setIsEditingPrivacy(false)} data-testid="button-cancel-privacy">Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Nickname</Label>
                  <p className="font-medium text-sm" data-testid="text-nickname">{(user as any)?.nickname || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Visibility</Label>
                  <div className="mt-0.5">
                    {(user as any)?.showPublicName ? (
                      <Badge variant="default" data-testid="badge-public-name-visible"><Eye className="h-3 w-3 mr-1" />Visible</Badge>
                    ) : (
                      <Badge variant="secondary" data-testid="badge-public-name-blurred"><EyeOff className="h-3 w-3 mr-1" />Blurred</Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button onClick={startEditingPrivacy} variant="outline" size="sm" data-testid="button-edit-privacy">
                <Settings className="h-4 w-4 mr-1" />
                Edit Display Settings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <DisplayAccessibilitySection />

      {/* Junior Accounts */}
      <Card data-testid="card-junior-accounts">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Junior Accounts</CardTitle>
              <CardDescription>Manage your children's accounts</CardDescription>
            </div>
            <Button size="sm" onClick={openAddJuniorDialog} data-testid="button-add-junior">
              <Plus className="h-4 w-4 mr-1" />Add Junior
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {juniorsLoading ? (
            <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : juniors && juniors.length > 0 ? (
            <div className="space-y-3">
              {juniors.map((junior: any) => (
                <div key={junior.id} className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0" data-testid={`junior-row-${junior.id}`}>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium" data-testid={`text-junior-name-${junior.id}`}>{junior.fullName}</span>
                    {junior.dateOfBirth && <span className="text-sm text-muted-foreground">DOB: {format(new Date(junior.dateOfBirth), "MMM d, yyyy")}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditJuniorDialog(junior)} data-testid={`button-edit-junior-${junior.id}`}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingJuniorId(junior.id)} data-testid={`button-delete-junior-${junior.id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="text-no-juniors">No junior accounts added yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/20" data-testid="card-danger-zone">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" data-testid="button-delete-account">
                <XCircle className="h-4 w-4 mr-1" />
                Delete My Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-background">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete your account?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete your account and all your data. You can create a new account in the future using the same email.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteAccountMutation.mutate()} disabled={deleteAccountMutation.isPending} data-testid="button-confirm-delete">
                  {deleteAccountMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Yes, Delete My Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreditsModal open={creditsModalOpen} onClose={() => setCreditsModalOpen(false)} creditBalances={creditBalances} memberships={memberships} />
      <OutstandingModal open={outstandingModalOpen} onClose={() => setOutstandingModalOpen(false)} payments={outstandingPayments} />
      <MembershipsModal open={membershipsModalOpen} onClose={() => setMembershipsModalOpen(false)} memberships={clubMemberships} />
      <PerformanceModal open={performanceModalOpen} onClose={() => setPerformanceModalOpen(false)} profiles={profiles} />
      <CreditHistoryModal open={creditHistoryModalOpen} onClose={() => setCreditHistoryModalOpen(false)} history={creditHistory} />
      <ClubsModal open={clubsModalOpen} onClose={() => setClubsModalOpen(false)} profiles={profiles} sessions={sessionHistory} />
      <TotalSessionsModal open={totalSessionsModalOpen} onClose={() => setTotalSessionsModalOpen(false)} sessions={sessionHistory} />
      <SessionsThisMonthModal open={sessionsThisMonthModalOpen} onClose={() => setSessionsThisMonthModalOpen(false)} sessions={sessionHistory} />
      <TotalSpentModal open={totalSpentModalOpen} onClose={() => setTotalSpentModalOpen(false)} sessions={sessionHistory} />

      {/* Junior Dialogs */}
      <Dialog open={juniorDialogOpen} onOpenChange={(open) => { if (!open) { setJuniorDialogOpen(false); setEditingJunior(null); resetJuniorForm(); } }}>
        <DialogContent className="bg-background" data-testid="dialog-junior-form">
          <DialogHeader><DialogTitle>{editingJunior ? "Edit Junior" : "Add Junior"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="juniorFullName">Full Name *</Label>
              <Input id="juniorFullName" value={juniorForm.fullName} onChange={(e) => setJuniorForm({ ...juniorForm, fullName: e.target.value })} placeholder="Child's full name" data-testid="input-junior-fullname" />
            </div>
            <div>
              <Label htmlFor="juniorDob">Date of Birth</Label>
              <Input id="juniorDob" type="date" value={juniorForm.dateOfBirth} onChange={(e) => setJuniorForm({ ...juniorForm, dateOfBirth: e.target.value })} data-testid="input-junior-dob" />
            </div>
            <div>
              <Label htmlFor="juniorEmergency">Emergency Contact</Label>
              <Input id="juniorEmergency" value={juniorForm.emergencyContact} onChange={(e) => setJuniorForm({ ...juniorForm, emergencyContact: e.target.value })} placeholder="Emergency contact number" data-testid="input-junior-emergency" />
            </div>
            <div>
              <Label htmlFor="juniorMedical">Medical Notes</Label>
              <Textarea id="juniorMedical" value={juniorForm.medicalNotes} onChange={(e) => setJuniorForm({ ...juniorForm, medicalNotes: e.target.value })} placeholder="Any medical conditions or allergies" data-testid="input-junior-medical" />
            </div>
          </div>
          <DialogFooter className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => { setJuniorDialogOpen(false); setEditingJunior(null); resetJuniorForm(); }} data-testid="button-cancel-junior">Cancel</Button>
            <Button onClick={handleSaveJunior} disabled={!juniorForm.fullName.trim() || addJuniorMutation.isPending || editJuniorMutation.isPending} data-testid="button-save-junior">
              {(addJuniorMutation.isPending || editJuniorMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingJunior ? "Save Changes" : "Add Junior"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingJuniorId !== null} onOpenChange={(open) => { if (!open) setDeletingJuniorId(null); }}>
        <AlertDialogContent className="bg-background" data-testid="dialog-delete-junior">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Junior Account?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this junior account.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-junior">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deletingJuniorId) deleteJuniorMutation.mutate(deletingJuniorId); }} disabled={deleteJuniorMutation.isPending} data-testid="button-confirm-delete-junior">
              {deleteJuniorMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}