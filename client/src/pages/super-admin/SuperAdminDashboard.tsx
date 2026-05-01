import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { KpiDetailDialog } from "@/components/ExpandableChartDialog";
import {
  Users, Building2, PoundSterling,
  Shield, Zap, Mail, BarChart3,
  Package, CreditCard, Upload, ChevronRight, Loader2,
  CheckCircle, XCircle, Clock, Plus, MapPin, Search, Pencil,
  Archive, Pause, Trash2, Calendar, Play, Send, Save, User,
  Trophy, Award, Share2,
  UserPlus, UserCheck, Activity, Bell, Sparkles, TrendingUp, Crown,
  Megaphone, Baby, Target, FlaskConical, Settings, Settings2, Inbox,
  ScrollText, ScanText, ShoppingBag, AlertCircle, Swords, Pin, PinOff,
  Download, ChevronDown, History, LayoutGrid,
} from "lucide-react";

interface ClubRecord {
  id: number;
  name: string;
  slug: string;
  description?: string;
  ownerId?: number;
  status: string;
  isActive: boolean;
  city?: string;
  postcode?: string;
  country?: string;
  address?: string;
  createdAt: string;
  contactFullName?: string;
  contactPhone?: string;
  contactAddress?: string;
  continent?: string;
  region?: string;
  isRegisteredWithBE?: boolean;
  beRegistrationNumber?: string;
  hasCompetitions?: boolean;
  hasSocialGames?: boolean;
  socialGameTimings?: string;
  providesTraining?: boolean;
  trainingDetails?: string;
  sessionFee?: number;
  hasMembership?: boolean;
  membershipFee?: number;
  shuttlecockType?: string;
  providesClubTShirts?: boolean;
  googleMapsUrl?: string;
}

interface ClubEditForm {
  name: string;
  description: string;
  status: string;
  address: string;
  city: string;
  postcode: string;
  region: string;
  country: string;
  continent: string;
  contactFullName: string;
  contactPhone: string;
  contactAddress: string;
  hasCompetitions: boolean;
  hasSocialGames: boolean;
  socialGameTimings: string;
  providesTraining: boolean;
  trainingDetails: string;
  sessionFee: string;
  hasMembership: boolean;
  membershipFee: string;
  shuttlecockType: string;
  providesClubTShirts: boolean;
  isRegisteredWithBE: boolean;
  beRegistrationNumber: string;
  adminUserId: string;
}

interface UserRecord {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface MemberRecord {
  id: number;
  userId: number;
  clubId: number;
  clubRole: string;
  membershipStatus: string;
  playerStatus: string;
  gender: string | null;
  category: string | null;
  grade?: string | null;
  rankingPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  user?: {
    id: number;
    fullName: string;
    email: string;
    phone?: string;
    nickname?: string;
    city?: string;
    country?: string;
    region?: string;
    continent?: string;
    dateOfBirth?: string;
    isJunior?: boolean;
    parentGuardianName?: string;
    parentGuardianEmail?: string;
    role?: string;
  };
}

interface PendingMember {
  id: number;
  userId: number;
  clubRole: string;
  membershipStatus: string;
  user?: {
    id: number;
    fullName: string;
    email: string;
  };
}

interface UserDetailFormData {
  fullName: string;
  email: string;
  phone: string;
  nickname: string;
  gender: string;
  category: string;
  clubRole: string;
  playerStatus: string;
  role: string;
  joinedAt: string;
}

const defaultEditForm: ClubEditForm = {
  name: "",
  description: "",
  status: "PENDING",
  address: "",
  city: "",
  postcode: "",
  region: "",
  country: "",
  continent: "",
  contactFullName: "",
  contactPhone: "",
  contactAddress: "",
  hasCompetitions: false,
  hasSocialGames: false,
  socialGameTimings: "",
  providesTraining: false,
  trainingDetails: "",
  sessionFee: "",
  hasMembership: false,
  membershipFee: "",
  shuttlecockType: "",
  providesClubTShirts: false,
  isRegisteredWithBE: false,
  beRegistrationNumber: "",
  adminUserId: "",
};

interface AnalyticsClubSummary {
  clubId: number;
  clubName: string;
  status: string;
  totalPlayers: number;
  totalSessions: number;
  totalMatches: number;
  totalRevenue: number;
}

interface AnalyticsData {
  clubs: AnalyticsClubSummary[];
  totals: {
    totalClubs: number;
    totalPlayers: number;
    totalSessions: number;
    totalMatches: number;
    completedMatches: number;
    totalRevenue: number;
    paidRevenue: number;
  };
}

type CategoryKey =
  | "people-clubs"
  | "sessions-competitions"
  | "finance-monetisation"
  | "operations"
  | "growth-engagement"
  | "analytics-ai"
  | "communication"
  | "admin-control"
  | "reports-export"
  | "exclusive-premium";

interface CategoryMeta {
  key: CategoryKey;
  label: string;
  description: string;
  accent: string; // Tailwind text colour for category dot/divider
  ring: string;   // Subtle ring colour for cards in this category
}

const CATEGORIES: CategoryMeta[] = [
  { key: "people-clubs",          label: "People & Clubs",          description: "Members, players, clubs, venues",        accent: "text-blue-500",     ring: "hover:ring-blue-500/20" },
  { key: "sessions-competitions", label: "Sessions & Competitions", description: "Sessions, leagues, tournaments, engine", accent: "text-indigo-500",   ring: "hover:ring-indigo-500/20" },
  { key: "finance-monetisation",  label: "Finance & Monetisation",  description: "Revenue, billing, debts, merchandise",   accent: "text-green-500",    ring: "hover:ring-green-500/20" },
  { key: "operations",            label: "Operations",              description: "Inbox, audit log, notifications",        accent: "text-emerald-500",  ring: "hover:ring-emerald-500/20" },
  { key: "growth-engagement",     label: "Growth & Engagement",     description: "Rewards, referrals, recognition",        accent: "text-amber-500",    ring: "hover:ring-amber-500/20" },
  { key: "analytics-ai",          label: "Analytics & AI",          description: "KPIs, attendance, match engine lab",     accent: "text-violet-500",   ring: "hover:ring-violet-500/20" },
  { key: "communication",         label: "Communication",           description: "Messages and announcements",             accent: "text-pink-500",     ring: "hover:ring-pink-500/20" },
  { key: "admin-control",         label: "Admin & Control",         description: "Cross-club management, settings",        accent: "text-slate-500",    ring: "hover:ring-slate-500/20" },
  { key: "reports-export",        label: "Reports & Export",        description: "AI reports and CSV exports",             accent: "text-cyan-500",     ring: "hover:ring-cyan-500/20" },
  { key: "exclusive-premium",     label: "Exclusive / Premium",     description: "Black Card and ultra exclusive",         accent: "text-rose-500",     ring: "hover:ring-rose-500/20" },
];

interface TileDef {
  id: string;            // stable id for pin/recents (e.g. "users-mgmt")
  href: string;
  label: string;
  description: string;
  icon: any;
  color: string;
  bg: string;
  category: CategoryKey;
  testId: string;        // preserves legacy test ids where present
  external?: boolean;    // open in new tab if true
}

// Unified tile catalogue: every tile from the original Super Admin and Admin
// dashboards lives here, deduped and normalised. Routes are unchanged.
const TILE_CATALOG: TileDef[] = [
  // People & Clubs
  { id: "users-mgmt",         href: "/super-admin/users-management", label: "Users Management",   description: "Manage users across the platform",         icon: Users,        color: "text-blue-500",    bg: "bg-blue-500/10",    category: "people-clubs",          testId: "button-quick-users-management" },
  { id: "player-mgmt",        href: "/admin/players",                label: "Player Management",  description: "Add, edit, and manage player profiles",    icon: UserPlus,     color: "text-purple-500",  bg: "bg-purple-500/10",  category: "people-clubs",          testId: "tile-player-mgmt" },
  { id: "trial-players",      href: "/admin/trials",                 label: "Trial Players",      description: "Trial registrations and evaluations",      icon: UserCheck,    color: "text-cyan-500",    bg: "bg-cyan-500/10",    category: "people-clubs",          testId: "tile-trial-players" },
  { id: "inactive-members",   href: "/admin/inactive-members",       label: "Inactive Members",   description: "Re-engage or manage inactive players",     icon: Users,        color: "text-orange-500",  bg: "bg-orange-500/10",  category: "people-clubs",          testId: "tile-inactive-members" },
  { id: "import-members",     href: "/admin/import-members",         label: "Import Members",     description: "Bulk upload members via CSV",              icon: Upload,       color: "text-rose-500",    bg: "bg-rose-500/10",    category: "people-clubs",          testId: "button-quick-import-members" },
  { id: "clubs-mgmt",         href: "/admin/clubs-management",       label: "Clubs Management",   description: "All clubs overview and approvals",         icon: Building2,    color: "text-emerald-500", bg: "bg-emerald-500/10", category: "people-clubs",          testId: "button-quick-clubs-management" },
  { id: "club-mgmt",          href: "/admin/clubs",                  label: "Club Management",    description: "Create and manage your clubs",             icon: Building2,    color: "text-sky-500",     bg: "bg-sky-500/10",     category: "people-clubs",          testId: "tile-club-mgmt" },
  { id: "venues",             href: "/admin/venues",                 label: "Venues & Courts",    description: "Manage venues, halls, and court setup",    icon: MapPin,       color: "text-red-500",     bg: "bg-red-500/10",     category: "people-clubs",          testId: "tile-venues" },
  { id: "juniors",            href: "/juniors",                      label: "Juniors Hub",        description: "Manage junior players and families",       icon: Baby,         color: "text-pink-500",    bg: "bg-pink-500/10",    category: "people-clubs",          testId: "tile-juniors" },

  // Sessions & Competitions
  { id: "sessions",           href: "/sessions",                     label: "Session Management", description: "Create sessions, signups, attendance",     icon: Calendar,     color: "text-blue-500",    bg: "bg-blue-500/10",    category: "sessions-competitions", testId: "tile-sessions" },
  { id: "league",             href: "/admin/league",                 label: "League Management",  description: "Fixtures, teams, and results",             icon: Swords,       color: "text-blue-500",    bg: "bg-blue-500/10",    category: "sessions-competitions", testId: "tile-league" },
  { id: "tournaments",        href: "/tournaments",                  label: "Tournaments",        description: "Brackets, groups, and standings",          icon: Trophy,       color: "text-amber-500",   bg: "bg-amber-500/10",   category: "sessions-competitions", testId: "tile-tournaments" },
  { id: "match-engine-lab",   href: "/admin/match-engine-lab",       label: "Match Engine Lab",   description: "Stress-test the matchmaking algorithm",    icon: FlaskConical, color: "text-indigo-500",  bg: "bg-indigo-500/10",  category: "sessions-competitions", testId: "tile-match-engine-lab" },
  { id: "match-engine-set",   href: "/admin/match-engine-settings",  label: "Engine Control Panel", description: "Algorithm settings and presets",         icon: Settings2,    color: "text-violet-500",  bg: "bg-violet-500/10",  category: "sessions-competitions", testId: "tile-match-engine-settings" },
  { id: "ai-match-input",     href: "/admin/ai-match-input",         label: "AI Match Input",     description: "Upload score sheets, extract via vision",  icon: ScanText,     color: "text-indigo-500",  bg: "bg-indigo-500/10",  category: "sessions-competitions", testId: "tile-ai-match-input" },
  { id: "grading",            href: "/admin/grading",                label: "Grading Progress",   description: "Auto skill promotions and demotions",      icon: Activity,     color: "text-amber-500",   bg: "bg-amber-500/10",   category: "sessions-competitions", testId: "tile-grading" },

  // Finance & Monetisation
  { id: "financials",         href: "/admin/financials",             label: "Financials",         description: "Track payments, fees, and revenue",        icon: PoundSterling,color: "text-green-500",   bg: "bg-green-500/10",   category: "finance-monetisation",  testId: "button-quick-financials" },
  { id: "debts",              href: "/admin/debts",                  label: "Debts & Payments",   description: "Player debts, charges, and collections",   icon: AlertCircle,  color: "text-red-500",     bg: "bg-red-500/10",     category: "finance-monetisation",  testId: "tile-debts" },
  { id: "memberships",        href: "/admin/memberships",            label: "Memberships",        description: "Plans, requests, and payments",            icon: CreditCard,   color: "text-teal-500",    bg: "bg-teal-500/10",    category: "finance-monetisation",  testId: "tile-memberships" },
  { id: "membership-board",   href: "/admin/membership-board",       label: "Membership Board",   description: "Membership status board view",             icon: CreditCard,   color: "text-purple-500",  bg: "bg-purple-500/10",  category: "finance-monetisation",  testId: "button-quick-membership-board" },
  { id: "inventory",          href: "/admin/inventory",              label: "Inventory & Expenses", description: "Stock, supplies, and club expenses",     icon: Package,      color: "text-cyan-500",    bg: "bg-cyan-500/10",    category: "finance-monetisation",  testId: "button-quick-inventory" },
  { id: "merchandise",        href: "/admin/merchandise",            label: "Merchandise Manager",description: "Products, orders, stock, and payments",    icon: ShoppingBag,  color: "text-violet-500",  bg: "bg-violet-500/10",  category: "finance-monetisation",  testId: "tile-merchandise" },
  { id: "billing-super",      href: "/super-admin/billing",          label: "Club Billing",       description: "Cross-club billing overview",              icon: CreditCard,   color: "text-amber-500",   bg: "bg-amber-500/10",   category: "finance-monetisation",  testId: "button-quick-club-billing" },
  { id: "billing-admin",      href: "/admin/billing",                label: "Billing & Plan",     description: "Manage your club subscription",            icon: CreditCard,   color: "text-violet-500",  bg: "bg-violet-500/10",  category: "finance-monetisation",  testId: "tile-billing-admin" },

  // Operations
  { id: "inbox",              href: "/admin/inbox",                  label: "Admin Inbox",        description: "Pending requests, payments, tickets",      icon: Inbox,        color: "text-emerald-500", bg: "bg-emerald-500/10", category: "operations",            testId: "tile-inbox" },
  { id: "audit-log",          href: "/admin/audit-log",              label: "Audit Log",          description: "Searchable history of admin actions",      icon: ScrollText,   color: "text-slate-500",   bg: "bg-slate-500/10",   category: "operations",            testId: "tile-audit-log" },
  { id: "notifications",      href: "/admin/notifications",          label: "Notification Settings", description: "Reminders, schedules, delivery logs",   icon: Bell,         color: "text-indigo-500",  bg: "bg-indigo-500/10",  category: "operations",            testId: "tile-notifications" },

  // Growth & Engagement
  { id: "rewards",            href: "/admin/rewards",                label: "Club Rewards",       description: "Anniversary, milestone, referral rewards", icon: Trophy,       color: "text-amber-500",   bg: "bg-amber-500/10",   category: "growth-engagement",     testId: "tile-rewards" },
  { id: "rewards-dashboard",  href: "/admin/rewards-dashboard",      label: "Rewards Dashboard",  description: "View all claimed rewards",                 icon: Award,        color: "text-pink-500",    bg: "bg-pink-500/10",    category: "growth-engagement",     testId: "button-quick-rewards-dashboard" },
  { id: "recognition",        href: "/admin/recognition-cards",      label: "Recognition Cards",  description: "Award and manage recognition cards",       icon: Award,        color: "text-rose-500",    bg: "bg-rose-500/10",    category: "growth-engagement",     testId: "tile-recognition" },
  { id: "referrals-admin",    href: "/admin/referrals",              label: "Referral Management",description: "Review submissions and award credits",     icon: Share2,       color: "text-emerald-500", bg: "bg-emerald-500/10", category: "growth-engagement",     testId: "tile-referrals-admin" },
  { id: "referrals-super",    href: "/super-admin/referrals",        label: "Referral Programs",  description: "Cross-club referral programs",             icon: Share2,       color: "text-violet-500",  bg: "bg-violet-500/10",  category: "growth-engagement",     testId: "button-quick-referral-programs" },

  // Analytics & AI
  { id: "acquisition",        href: "/admin/acquisition-analytics",  label: "Acquisition & KPI",  description: "Track growth, channels, and retention",    icon: BarChart3,    color: "text-blue-500",    bg: "bg-blue-500/10",    category: "analytics-ai",          testId: "tile-acquisition" },
  { id: "attendance-an",      href: "/admin/attendance-analytics",   label: "Attendance Analytics", description: "Session attendance and engagement",      icon: Activity,     color: "text-emerald-500", bg: "bg-emerald-500/10", category: "analytics-ai",          testId: "tile-attendance-analytics" },
  { id: "coach-skills",       href: "/coach/juniors/skills",         label: "Coach Skills Analytics", description: "Aggregate skill insights and reports", icon: Target,       color: "text-amber-500",   bg: "bg-amber-500/10",   category: "analytics-ai",          testId: "tile-coach-skills" },

  // Communication
  { id: "messages",           href: "/admin/messages",               label: "Messages",           description: "Internal messaging across clubs",          icon: Mail,         color: "text-pink-500",    bg: "bg-pink-500/10",    category: "communication",         testId: "button-quick-messages" },
  { id: "announcements",      href: "/admin/announcements",          label: "Announcements",      description: "Post updates to club members",             icon: Megaphone,    color: "text-orange-500",  bg: "bg-orange-500/10",  category: "communication",         testId: "tile-announcements" },

  // Admin & Control
  { id: "god-mode",           href: "/super-admin/god-mode",         label: "God Mode Tools",     description: "Advanced platform-wide controls",          icon: Zap,          color: "text-amber-500",   bg: "bg-amber-500/10",   category: "admin-control",         testId: "tile-god-mode" },
  { id: "wallets",            href: "/super-admin/wallets",          label: "Wallet Management",  description: "Inspect and adjust user wallets",          icon: PoundSterling,color: "text-green-500",   bg: "bg-green-500/10",   category: "admin-control",         testId: "tile-wallets" },
  { id: "su-users",           href: "/super-admin/users",            label: "All Users",          description: "Browse all platform users",                icon: Users,        color: "text-blue-500",    bg: "bg-blue-500/10",    category: "admin-control",         testId: "tile-su-users" },
  { id: "su-clubs",           href: "/super-admin/clubs",            label: "All Clubs",          description: "Browse all platform clubs",                icon: Building2,    color: "text-emerald-500", bg: "bg-emerald-500/10", category: "admin-control",         testId: "tile-su-clubs" },
  { id: "su-sessions",        href: "/super-admin/sessions",         label: "All Sessions",       description: "Cross-club session view",                  icon: Calendar,     color: "text-indigo-500",  bg: "bg-indigo-500/10",  category: "admin-control",         testId: "tile-su-sessions" },

  // Exclusive / Premium
  { id: "black-card",         href: "/admin/black-card",             label: "Black Card Management", description: "Grant Ultra Exclusive access",          icon: Crown,        color: "text-amber-500",   bg: "bg-amber-500/10",   category: "exclusive-premium",     testId: "tile-black-card" },
];

// localStorage helpers (UI-only persistence)
const LS_PINNED   = "superadmin_pinned_tiles";
const LS_RECENT   = "superadmin_recent_tiles";
const LS_COLLAPSED = "superadmin_collapsed_sections";
const RECENT_LIMIT = 6;

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

function ClubFormFields({ form, setForm, users }: { form: ClubEditForm; setForm: (fn: (f: ClubEditForm) => ClubEditForm) => void; users?: UserRecord[] }) {
  return (
    <div className="max-h-[70vh] overflow-y-auto space-y-6 py-2 pr-2">
      <div>
        <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Basic Info</div>
        <div className="space-y-3">
          <div>
            <Label>Club Name</Label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-club-name" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} data-testid="input-club-description" />
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Assign Admin</div>
        <div>
          <Label>Club Admin</Label>
          <Select value={form.adminUserId} onValueChange={(v) => setForm(f => ({ ...f, adminUserId: v }))}>
            <SelectTrigger data-testid="select-club-admin">
              <SelectValue placeholder="Select a user as admin..." />
            </SelectTrigger>
            <SelectContent>
              {users?.map(u => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.fullName} ({u.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Location</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} data-testid="input-club-address" />
          </div>
          <div>
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} data-testid="input-club-city" />
          </div>
          <div>
            <Label>Postcode</Label>
            <Input value={form.postcode} onChange={(e) => setForm(f => ({ ...f, postcode: e.target.value }))} data-testid="input-club-postcode" />
          </div>
          <div>
            <Label>Region</Label>
            <Input value={form.region} onChange={(e) => setForm(f => ({ ...f, region: e.target.value }))} data-testid="input-club-region" />
          </div>
          <div>
            <Label>Country</Label>
            <Input value={form.country} onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))} data-testid="input-club-country" />
          </div>
          <div className="col-span-2">
            <Label>Continent</Label>
            <Input value={form.continent} onChange={(e) => setForm(f => ({ ...f, continent: e.target.value }))} data-testid="input-club-continent" />
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Contact</div>
        <div className="space-y-3">
          <div>
            <Label>Contact Full Name</Label>
            <Input value={form.contactFullName} onChange={(e) => setForm(f => ({ ...f, contactFullName: e.target.value }))} data-testid="input-club-contact-name" />
          </div>
          <div>
            <Label>Contact Phone</Label>
            <Input value={form.contactPhone} onChange={(e) => setForm(f => ({ ...f, contactPhone: e.target.value }))} data-testid="input-club-contact-phone" />
          </div>
          <div>
            <Label>Contact Address</Label>
            <Input value={form.contactAddress} onChange={(e) => setForm(f => ({ ...f, contactAddress: e.target.value }))} data-testid="input-club-contact-address" />
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Activities</div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox id="hasCompetitions" checked={form.hasCompetitions} onCheckedChange={(v) => setForm(f => ({ ...f, hasCompetitions: !!v }))} data-testid="checkbox-has-competitions" />
            <Label htmlFor="hasCompetitions" className="cursor-pointer">Has Competitions</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="hasSocialGames" checked={form.hasSocialGames} onCheckedChange={(v) => setForm(f => ({ ...f, hasSocialGames: !!v }))} data-testid="checkbox-has-social-games" />
            <Label htmlFor="hasSocialGames" className="cursor-pointer">Has Social Games</Label>
          </div>
          <div>
            <Label>Social Game Timings</Label>
            <Input value={form.socialGameTimings} onChange={(e) => setForm(f => ({ ...f, socialGameTimings: e.target.value }))} data-testid="input-social-game-timings" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="providesTraining" checked={form.providesTraining} onCheckedChange={(v) => setForm(f => ({ ...f, providesTraining: !!v }))} data-testid="checkbox-provides-training" />
            <Label htmlFor="providesTraining" className="cursor-pointer">Provides Training</Label>
          </div>
          <div>
            <Label>Training Details</Label>
            <Input value={form.trainingDetails} onChange={(e) => setForm(f => ({ ...f, trainingDetails: e.target.value }))} data-testid="input-training-details" />
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Fees</div>
        <div className="space-y-3">
          <div>
            <Label>Session Fee (£)</Label>
            <Input type="number" step="0.01" value={form.sessionFee} onChange={(e) => setForm(f => ({ ...f, sessionFee: e.target.value }))} data-testid="input-session-fee" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="hasMembership" checked={form.hasMembership} onCheckedChange={(v) => setForm(f => ({ ...f, hasMembership: !!v }))} data-testid="checkbox-has-membership" />
            <Label htmlFor="hasMembership" className="cursor-pointer">Has Membership</Label>
          </div>
          <div>
            <Label>Membership Fee (£)</Label>
            <Input type="number" step="0.01" value={form.membershipFee} onChange={(e) => setForm(f => ({ ...f, membershipFee: e.target.value }))} data-testid="input-membership-fee" />
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Equipment</div>
        <div className="space-y-3">
          <div>
            <Label>Equipment Type</Label>
            <Select value={form.shuttlecockType} onValueChange={(v) => setForm(f => ({ ...f, shuttlecockType: v }))}>
              <SelectTrigger data-testid="select-shuttlecock-type">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feather">Feather</SelectItem>
                <SelectItem value="plastic">Plastic</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="providesClubTShirts" checked={form.providesClubTShirts} onCheckedChange={(v) => setForm(f => ({ ...f, providesClubTShirts: !!v }))} data-testid="checkbox-provides-tshirts" />
            <Label htmlFor="providesClubTShirts" className="cursor-pointer">Provides Club T-Shirts</Label>
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Registration</div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox id="isRegisteredWithBE" checked={form.isRegisteredWithBE} onCheckedChange={(v) => setForm(f => ({ ...f, isRegisteredWithBE: !!v }))} data-testid="checkbox-registered-be" />
            <Label htmlFor="isRegisteredWithBE" className="cursor-pointer">Registered with Badminton England</Label>
          </div>
          <div>
            <Label>BE Registration Number</Label>
            <Input value={form.beRegistrationNumber} onChange={(e) => setForm(f => ({ ...f, beRegistrationNumber: e.target.value }))} data-testid="input-be-registration" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberDetailDialog({
  member,
  club,
  open,
  onClose,
}: {
  member: MemberRecord;
  club: ClubRecord;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState<UserDetailFormData>({
    fullName: member.user?.fullName || "",
    email: member.user?.email || "",
    phone: member.user?.phone || "",
    nickname: member.user?.nickname || "",
    gender: member.gender || "",
    category: member.grade || member.category || "C3",
    clubRole: member.clubRole || "PLAYER",
    playerStatus: member.playerStatus || "ACTIVE",
    role: member.user?.role || "PLAYER",
    joinedAt: (member as any).joinedAt ? new Date((member as any).joinedAt).toISOString().split("T")[0] : "",
  });

  useEffect(() => {
    setForm({
      fullName: member.user?.fullName || "",
      email: member.user?.email || "",
      phone: member.user?.phone || "",
      nickname: member.user?.nickname || "",
      gender: member.gender || "",
      category: member.grade || member.category || "C3",
      clubRole: member.clubRole || "PLAYER",
      playerStatus: member.playerStatus || "ACTIVE",
      role: member.user?.role || "PLAYER",
      joinedAt: (member as any).joinedAt ? new Date((member as any).joinedAt).toISOString().split("T")[0] : "",
    });
  }, [member]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/clubs/${club.id}/members/${member.id}/comprehensive`, { ...form, joinedAt: form.joinedAt || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", club.id, "members-comprehensive"] });
      toast({ title: "Saved", description: "Member details updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/clubs/${club.id}/members/${member.id}/comprehensive`, { ...form, playerStatus: "SUSPENDED" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", club.id, "members-comprehensive"] });
      setForm(f => ({ ...f, playerStatus: "SUSPENDED" }));
      toast({ title: "Suspended", description: "Member has been suspended." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to suspend", variant: "destructive" });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/clubs/${club.id}/members/${member.id}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", club.id, "members-comprehensive"] });
      setConfirmDelete(false);
      onClose();
      toast({ title: "Deleted", description: "Member profile has been permanently deleted." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to delete", variant: "destructive" });
    },
  });

  const winPct = member.matchesPlayed > 0 ? Math.round((member.matchesWon / member.matchesPlayed) * 100) : 0;

  return (
    <>
      <Dialog open={open && !confirmDelete} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-member-detail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {member.user?.fullName || "Member Detail"}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto space-y-5 py-2 pr-2">
            <div className="flex items-center gap-4 p-3 border rounded-md bg-muted/30" data-testid="member-ranking-summary">
              <div className="text-center">
                <div className="text-lg font-bold" data-testid="text-ranking-points">{member.rankingPoints}</div>
                <div className="text-xs text-muted-foreground">Points</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold" data-testid="text-matches-played">{member.matchesPlayed}</div>
                <div className="text-xs text-muted-foreground">Played</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold" data-testid="text-matches-won">{member.matchesWon}</div>
                <div className="text-xs text-muted-foreground">Won</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold" data-testid="text-win-pct">{winPct}%</div>
                <div className="text-xs text-muted-foreground">Win Rate</div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Personal Info</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Full Name</Label>
                  <Input value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} data-testid="input-member-fullname" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} data-testid="input-member-email" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} data-testid="input-member-phone" />
                </div>
                <div>
                  <Label>Nickname</Label>
                  <Input value={form.nickname} onChange={(e) => setForm(f => ({ ...f, nickname: e.target.value }))} data-testid="input-member-nickname" />
                </div>
                <div>
                  <Label>Joined Date</Label>
                  <Input type="date" value={form.joinedAt} onChange={(e) => setForm(f => ({ ...f, joinedAt: e.target.value }))} data-testid="input-joined-at" />
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Profile Settings</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm(f => ({ ...f, gender: v }))}>
                    <SelectTrigger data-testid="select-member-detail-gender"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger data-testid="select-member-detail-category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"].map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Club Role</Label>
                  <Select value={form.clubRole} onValueChange={(v) => setForm(f => ({ ...f, clubRole: v }))}>
                    <SelectTrigger data-testid="select-member-detail-club-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNER">Owner</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="ORGANISER">Organiser</SelectItem>
                      <SelectItem value="PLAYER">Player</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Player Status</Label>
                  <Select value={form.playerStatus} onValueChange={(v) => setForm(f => ({ ...f, playerStatus: v }))}>
                    <SelectTrigger data-testid="select-member-detail-player-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>System Role (Super Admin)</Label>
                  <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger data-testid="select-member-detail-system-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNER">Owner</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="ORGANISER">Organiser</SelectItem>
                      <SelectItem value="PLAYER">Player</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-wrap gap-2">
            <div className="flex items-center gap-1 flex-wrap">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                data-testid="button-save-member-detail"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => suspendMutation.mutate()}
                disabled={suspendMutation.isPending || form.playerStatus === "SUSPENDED"}
                data-testid="button-suspend-member"
              >
                {suspendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Pause className="w-4 h-4 mr-1" />}
                Suspend
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/inbox?recipientId=${member.userId}`)}
                data-testid="button-start-chat-member"
              >
                <Send className="w-4 h-4 mr-1" /> Start Chat
              </Button>
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => setConfirmDelete(true)}
                data-testid="button-delete-member-profile"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete Profile
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member Profile</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the profile for <strong>{member.user?.fullName}</strong> from <strong>{club.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-member">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProfileMutation.mutate()}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-member"
            >
              {deleteProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MembersManagementDialog({
  club,
  open,
  onClose,
}: {
  club: ClubRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [memberSearch, setMemberSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [detailMember, setDetailMember] = useState<MemberRecord | null>(null);
  const [activeTab, setActiveTab] = useState("members");

  useEffect(() => {
    if (!open) {
      setMemberSearch("");
      setGenderFilter("ALL");
      setCategoryFilter("ALL");
      setStatusFilter("ALL");
      setRoleFilter("ALL");
      setDetailMember(null);
      setActiveTab("members");
    }
  }, [open]);

  const { data: members, isLoading: membersLoading } = useQuery<MemberRecord[]>({
    queryKey: ["/api/clubs", club?.id, "members-comprehensive"],
    queryFn: async () => {
      if (!club) return [];
      const res = await fetch(`/api/clubs/${club.id}/members-comprehensive`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: open && !!club,
  });

  const { data: pendingMembers } = useQuery<PendingMember[]>({
    queryKey: ["/api/clubs", club?.id, "pending-approvals"],
    queryFn: async () => {
      if (!club) return [];
      const res = await fetch(`/api/clubs/${club.id}/pending-approvals`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pending approvals");
      return res.json();
    },
    enabled: open && !!club,
  });

  const approvalMutation = useMutation({
    mutationFn: async (data: { profileId: number; status: string }) => {
      if (!club) return;
      await apiRequest("PATCH", `/api/clubs/${club.id}/members/${data.profileId}/status`, {
        membershipStatus: data.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", club?.id, "pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", club?.id, "members-comprehensive"] });
      toast({ title: "Updated", description: "Member status updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update status", variant: "destructive" });
    },
  });

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    return members
      .filter((m) => {
        const name = m.user?.fullName?.toLowerCase() || "";
        const email = m.user?.email?.toLowerCase() || "";
        const q = memberSearch.toLowerCase();
        if (q && !name.includes(q) && !email.includes(q)) return false;
        if (genderFilter !== "ALL" && m.gender !== genderFilter) return false;
        if (categoryFilter !== "ALL" && (m.grade || m.category) !== categoryFilter) return false;
        if (statusFilter !== "ALL" && m.playerStatus !== statusFilter) return false;
        if (roleFilter !== "ALL" && m.clubRole !== roleFilter) return false;
        return true;
      })
      .sort((a, b) => (b.rankingPoints || 0) - (a.rankingPoints || 0));
  }, [members, memberSearch, genderFilter, categoryFilter, statusFilter, roleFilter]);

  if (!club) return null;

  return (
    <>
      <Dialog open={open && !detailMember} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh]" data-testid="dialog-manage-members">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Members - {club.name}
            </DialogTitle>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList data-testid="tabs-members-management">
              <TabsTrigger value="members" data-testid="tab-members">Members</TabsTrigger>
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pending Approvals
                {pendingMembers && pendingMembers.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">{pendingMembers.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="mt-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name or email..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-sa-member-search"
                  />
                </div>
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger className="w-[110px]" data-testid="select-sa-member-gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Gender</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[100px]" data-testid="select-sa-member-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Cat</SelectItem>
                    {["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"].map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]" data-testid="select-sa-member-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[110px]" data-testid="select-sa-member-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Role</SelectItem>
                    <SelectItem value="OWNER">Owner</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="ORGANISER">Organiser</SelectItem>
                    <SelectItem value="PLAYER">Player</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {membersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-auto max-h-[50vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Cat</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Matches</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((m) => (
                        <TableRow
                          key={m.id}
                          className="cursor-pointer"
                          onClick={() => setDetailMember(m)}
                          data-testid={`row-sa-member-${m.id}`}
                        >
                          <TableCell>
                            <span className="text-sm font-medium" data-testid={`text-sa-member-name-${m.id}`}>
                              {m.user?.fullName || "Unknown"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{m.user?.email || ""}</span>
                          </TableCell>
                          <TableCell><span className="text-xs">{m.gender || "-"}</span></TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{m.grade || m.category || "-"}</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{m.clubRole}</Badge></TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${m.playerStatus === "ACTIVE" ? "text-green-600" : m.playerStatus === "SUSPENDED" ? "text-red-600" : "text-muted-foreground"}`}>
                              {m.playerStatus}
                            </Badge>
                          </TableCell>
                          <TableCell><span className="text-sm font-medium">{m.rankingPoints}</span></TableCell>
                          <TableCell><span className="text-sm">{m.matchesPlayed}</span></TableCell>
                        </TableRow>
                      ))}
                      {filteredMembers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No members found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pending" className="mt-4">
              {!pendingMembers || pendingMembers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">No pending approvals.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {pendingMembers.map((pm) => (
                    <div key={pm.id} className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border/50" data-testid={`pending-member-${pm.id}`}>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm" data-testid={`text-pending-name-${pm.id}`}>{pm.user?.fullName || "Unknown"}</span>
                        <span className="text-xs text-muted-foreground ml-2">{pm.user?.email || ""}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => approvalMutation.mutate({ profileId: pm.id, status: "APPROVED" })}
                          disabled={approvalMutation.isPending}
                          data-testid={`button-approve-member-${pm.id}`}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approvalMutation.mutate({ profileId: pm.id, status: "REJECTED" })}
                          disabled={approvalMutation.isPending}
                          data-testid={`button-reject-member-${pm.id}`}
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {detailMember && club && (
        <MemberDetailDialog
          member={detailMember}
          club={club}
          open={!!detailMember}
          onClose={() => setDetailMember(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Tile + section helper components used by the unified Super Admin layout
// ---------------------------------------------------------------------------

function TileCard({
  tile,
  pinned,
  onPinToggle,
  onActivate,
  compact = false,
}: {
  tile: TileDef;
  pinned: boolean;
  onPinToggle: (id: string) => void;
  onActivate: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <Link href={tile.href}>
      <Card
        onClick={() => onActivate(tile.id)}
        className="group relative aspect-[4/3] border border-slate-700/40 dark:border-slate-700/40 bg-gradient-to-br from-slate-800 via-slate-800/95 to-slate-900 dark:from-slate-800 dark:via-slate-800/95 dark:to-slate-900 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer rounded-2xl overflow-hidden"
        data-testid={tile.testId}
        title={tile.description}
      >
        {/* Decorative organic wave overlay (matches bento-grid reference design) */}
        <svg
          aria-hidden
          viewBox="0 0 200 120"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none"
        >
          <path d="M0,80 C40,40 80,100 120,60 C160,20 200,70 200,70 L200,120 L0,120 Z" fill="white" />
          <path d="M0,95 C50,70 100,110 150,85 C180,70 200,90 200,90 L200,120 L0,120 Z" fill="white" opacity="0.5" />
        </svg>

        <CardContent className={`relative p-3 sm:p-4 flex flex-col h-full ${compact ? "gap-1.5" : "gap-2"}`}>
          <div className={`${tile.bg} rounded-xl ${compact ? "p-2" : "p-2.5"} self-start group-hover:scale-110 transition-transform duration-300 shadow-md ring-1 ring-white/10`}>
            <tile.icon className={`${compact ? "w-4 h-4" : "w-5 h-5"} ${tile.color}`} />
          </div>
          <div className="flex-1 flex items-end">
            <p className={`${compact ? "text-[11px]" : "text-[12px] sm:text-[13px]"} font-semibold text-white leading-tight line-clamp-2`}>{tile.label}</p>
          </div>
        </CardContent>
        <button
          type="button"
          aria-label={pinned ? "Unpin tile" : "Pin tile"}
          className={`absolute top-2 right-2 ${pinned ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-amber-400/70"} transition-opacity p-1.5 rounded-lg bg-slate-900/60 backdrop-blur hover:bg-slate-900/80 shrink-0 z-10`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPinToggle(tile.id); }}
          data-testid={`pin-${tile.id}`}
        >
          {pinned ? <PinOff className="w-3 h-3 text-amber-400" /> : <Pin className="w-3 h-3 text-slate-300" />}
        </button>
      </Card>
    </Link>
  );
}

function CategorySection({
  category,
  tiles,
  defaultOpen,
  collapsed,
  onToggleCollapsed,
  pinnedSet,
  onPinToggle,
  onActivate,
}: {
  category: CategoryMeta;
  tiles: TileDef[];
  defaultOpen: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  pinnedSet: Set<string>;
  onPinToggle: (id: string) => void;
  onActivate: (id: string) => void;
}) {
  if (tiles.length === 0) return null;
  const open = !collapsed;
  return (
    <Collapsible open={open} onOpenChange={onToggleCollapsed} data-testid={`section-${category.key}`}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-3 group py-2 px-2 rounded-lg hover:bg-muted/40 transition-colors"
          data-testid={`section-toggle-${category.key}`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${category.accent.replace("text-", "bg-")}`} />
          <div className="flex-1 text-left">
            <p className="text-sm font-bold tracking-tight text-foreground">{category.label}</p>
            <p className="text-[11px] text-muted-foreground">{category.description}</p>
          </div>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{tiles.length}</Badge>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-0" : "-rotate-90"}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 mt-3">
          {tiles.map((tile) => (
            <TileCard
              key={tile.id}
              tile={tile}
              pinned={pinnedSet.has(tile.id)}
              onPinToggle={onPinToggle}
              onActivate={onActivate}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SuperAdminAIReportsSection({ clubs }: { clubs: any[] }) {
  const { toast } = useToast();
  const [reportClubId, setReportClubId] = useState<string>(clubs[0]?.id ? String(clubs[0].id) : "");
  const [activeReport, setActiveReport] = useState<{ type: string; data: any } | null>(null);

  useEffect(() => {
    if (!reportClubId && clubs[0]?.id) setReportClubId(String(clubs[0].id));
  }, [clubs, reportClubId]);

  const runReport = (type: "finances" | "matches" | "attendance") => async () => {
    try {
      const res = await apiRequest("POST", `/api/admin/ai-report/${type}`, { clubId: Number(reportClubId) });
      if (!res.ok) throw new Error((await res.json()).message);
      const data = await res.json();
      setActiveReport({ type, data });
      toast({ title: `${type === "finances" ? "Finance" : type === "matches" ? "Match" : "Attendance"} Report Ready` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const financeMutation    = useMutation({ mutationFn: runReport("finances") });
  const matchMutation      = useMutation({ mutationFn: runReport("matches") });
  const attendanceMutation = useMutation({ mutationFn: runReport("attendance") });

  if (clubs.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic px-3 py-4 border border-dashed border-border/50 rounded-xl" data-testid="empty-ai-reports">
        No clubs available yet — create or approve a club to generate AI reports.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-muted-foreground">Generate AI insights for</span>
          <Select value={reportClubId} onValueChange={setReportClubId}>
            <SelectTrigger data-testid="select-sa-ai-report-club" className="w-[200px] h-8 text-sm">
              <SelectValue placeholder="Select Club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border-border/40 rounded-2xl hover:border-green-500/30 transition-colors">
            <CardContent className="p-4 flex items-start gap-3.5">
              <div className="bg-green-500/10 rounded-xl p-2.5 shrink-0">
                <PoundSterling className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Financial Report</p>
                <p className="text-xs text-muted-foreground mt-0.5">Revenue, payments and collection analysis</p>
                <Button data-testid="button-sa-ai-finance-report" size="sm" className="mt-2" onClick={() => financeMutation.mutate()} disabled={financeMutation.isPending || !reportClubId}>
                  {financeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                  Generate
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/40 rounded-2xl hover:border-blue-500/30 transition-colors">
            <CardContent className="p-4 flex items-start gap-3.5">
              <div className="bg-blue-500/10 rounded-xl p-2.5 shrink-0">
                <Swords className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Match Report</p>
                <p className="text-xs text-muted-foreground mt-0.5">Match activity, engagement and stats</p>
                <Button data-testid="button-sa-ai-match-report" size="sm" className="mt-2" onClick={() => matchMutation.mutate()} disabled={matchMutation.isPending || !reportClubId}>
                  {matchMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                  Generate
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/40 rounded-2xl hover:border-emerald-500/30 transition-colors">
            <CardContent className="p-4 flex items-start gap-3.5">
              <div className="bg-emerald-500/10 rounded-xl p-2.5 shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Attendance Report</p>
                <p className="text-xs text-muted-foreground mt-0.5">Attendance rates, no-shows and engagement</p>
                <Button data-testid="button-sa-ai-attendance-report" size="sm" className="mt-2" onClick={() => attendanceMutation.mutate()} disabled={attendanceMutation.isPending || !reportClubId}>
                  {attendanceMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                  Generate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!activeReport} onOpenChange={() => setActiveReport(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              {activeReport?.type === "finances" ? "Financial AI Report" : activeReport?.type === "matches" ? "Match AI Report" : "Attendance AI Report"}
            </DialogTitle>
            <DialogDescription>
              AI-generated analysis for the last 30 days — {activeReport?.data?.report?.createdAt ? new Date(activeReport.data.report.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "today"}
            </DialogDescription>
          </DialogHeader>
          {activeReport && (
            <div className="space-y-5">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> AI Analysis
                </p>
                <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {activeReport.data.report?.aiSummary}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function SuperAdminDashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [editClub, setEditClub] = useState<ClubRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editForm, setEditForm] = useState<ClubEditForm>({ ...defaultEditForm });
  const [createForm, setCreateForm] = useState<ClubEditForm>({ ...defaultEditForm });
  const [actionClub, setActionClub] = useState<ClubRecord | null>(null);
  const [manageClub, setManageClub] = useState<ClubRecord | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "pause" | "resume" | "archive" | "delete"; club: ClubRecord } | null>(null);
  const [transferClub, setTransferClub] = useState<ClubRecord | null>(null);
  const [transferOwnerId, setTransferOwnerId] = useState("");

  // Unified dashboard UI state
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [topSearch, setTopSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [kpiDetail, setKpiDetail] = useState<string | null>(null);
  const [downloadingUsers, setDownloadingUsers] = useState(false);
  const [downloadingAttendance, setDownloadingAttendance] = useState(false);
  const [pinned, setPinned] = useState<string[]>(() => readLS<string[]>(LS_PINNED, []));
  const [recent, setRecent] = useState<string[]>(() => readLS<string[]>(LS_RECENT, []));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => readLS<Record<string, boolean>>(LS_COLLAPSED, {}));

  useEffect(() => writeLS(LS_PINNED, pinned), [pinned]);
  useEffect(() => writeLS(LS_RECENT, recent), [recent]);
  useEffect(() => writeLS(LS_COLLAPSED, collapsed), [collapsed]);

  // Cmd/Ctrl-K opens command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const togglePin = useCallback((id: string) => {
    setPinned((cur) => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  }, []);

  const trackActivate = useCallback((id: string) => {
    setRecent((cur) => [id, ...cur.filter(x => x !== id)].slice(0, RECENT_LIMIT));
  }, []);

  const toggleCollapsed = useCallback((key: string) => {
    setCollapsed((cur) => ({ ...cur, [key]: !cur[key] }));
  }, []);

  const { data: allClubs, isLoading: clubsLoading } = useQuery<ClubRecord[]>({
    queryKey: ["/api/admin/clubs"],
  });

  const { data: allUsers } = useQuery<UserRecord[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
  });

  const handleExport = async (type: "users" | "attendance") => {
    const setLoading = type === "users" ? setDownloadingUsers : setDownloadingAttendance;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/export/${type}`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || `export_${type}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Export Failed", description: "Could not download the export file.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (editClub) {
      setEditForm({
        name: editClub.name || "",
        description: editClub.description || "",
        status: editClub.status || "PENDING",
        address: editClub.address || "",
        city: editClub.city || "",
        postcode: editClub.postcode || "",
        region: editClub.region || "",
        country: editClub.country || "",
        continent: editClub.continent || "",
        contactFullName: editClub.contactFullName || "",
        contactPhone: editClub.contactPhone || "",
        contactAddress: editClub.contactAddress || "",
        hasCompetitions: editClub.hasCompetitions || false,
        hasSocialGames: editClub.hasSocialGames || false,
        socialGameTimings: editClub.socialGameTimings || "",
        providesTraining: editClub.providesTraining || false,
        trainingDetails: editClub.trainingDetails || "",
        sessionFee: editClub.sessionFee != null ? (editClub.sessionFee / 100).toFixed(2) : "",
        hasMembership: editClub.hasMembership || false,
        membershipFee: editClub.membershipFee != null ? (editClub.membershipFee / 100).toFixed(2) : "",
        shuttlecockType: editClub.shuttlecockType || "",
        providesClubTShirts: editClub.providesClubTShirts || false,
        isRegisteredWithBE: editClub.isRegisteredWithBE || false,
        beRegistrationNumber: editClub.beRegistrationNumber || "",
        adminUserId: editClub.ownerId ? String(editClub.ownerId) : "",
      });
    }
  }, [editClub]);

  const updateClubMutation = useMutation({
    mutationFn: async (data: { id: number; form: ClubEditForm }) => {
      const res = await apiRequest("PATCH", `/api/super-admin/clubs/${data.id}`, {
        name: data.form.name,
        description: data.form.description,
        status: data.form.status,
        address: data.form.address,
        city: data.form.city,
        postcode: data.form.postcode,
        region: data.form.region,
        country: data.form.country,
        continent: data.form.continent,
        contactFullName: data.form.contactFullName,
        contactPhone: data.form.contactPhone,
        contactAddress: data.form.contactAddress,
        hasCompetitions: data.form.hasCompetitions,
        hasSocialGames: data.form.hasSocialGames,
        socialGameTimings: data.form.socialGameTimings,
        providesTraining: data.form.providesTraining,
        trainingDetails: data.form.trainingDetails,
        sessionFee: data.form.sessionFee ? Math.round(parseFloat(data.form.sessionFee) * 100) : null,
        hasMembership: data.form.hasMembership,
        membershipFee: data.form.membershipFee ? Math.round(parseFloat(data.form.membershipFee) * 100) : null,
        shuttlecockType: data.form.shuttlecockType,
        providesClubTShirts: data.form.providesClubTShirts,
        isRegisteredWithBE: data.form.isRegisteredWithBE,
        beRegistrationNumber: data.form.beRegistrationNumber,
        adminUserId: data.form.adminUserId || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      setEditClub(null);
      toast({ title: "Club Updated", description: "Club details have been saved." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update club", variant: "destructive" });
    },
  });

  const approveClubMutation = useMutation({
    mutationFn: async (data: { id: number; status: string; adminUserId?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/clubs/${data.id}/status`, {
        status: data.status,
        adminUserId: data.adminUserId,
      });
      return res.json();
    },
    onSuccess: (_d, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      setEditClub(null);
      toast({
        title: variables.status === "APPROVED" ? "Club Approved" : "Club Rejected",
        description: variables.status === "APPROVED" ? "The club has been approved and is now active." : "The club request has been rejected.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update club status", variant: "destructive" });
    },
  });

  const createClubMutation = useMutation({
    mutationFn: async (form: ClubEditForm) => {
      const res = await apiRequest("POST", "/api/admin/clubs", {
        name: form.name,
        description: form.description,
        address: form.address,
        city: form.city,
        postcode: form.postcode,
        country: form.country,
        region: form.region,
        continent: form.continent,
        contactFullName: form.contactFullName,
        contactPhone: form.contactPhone,
        contactAddress: form.contactAddress,
        isRegisteredWithBE: form.isRegisteredWithBE,
        beRegistrationNumber: form.beRegistrationNumber,
        hasCompetitions: form.hasCompetitions,
        hasSocialGames: form.hasSocialGames,
        socialGameTimings: form.socialGameTimings,
        providesTraining: form.providesTraining,
        trainingDetails: form.trainingDetails,
        sessionFee: form.sessionFee ? Math.round(parseFloat(form.sessionFee) * 100) : null,
        hasMembership: form.hasMembership,
        membershipFee: form.membershipFee ? Math.round(parseFloat(form.membershipFee) * 100) : null,
        shuttlecockType: form.shuttlecockType,
        providesClubTShirts: form.providesClubTShirts,
        adminUserId: form.adminUserId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      setCreateOpen(false);
      setCreateForm({ ...defaultEditForm });
      toast({ title: "Club Created", description: "New club has been created and approved." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to create club", variant: "destructive" });
    },
  });

  const pauseClubMutation = useMutation({
    mutationFn: async (data: { id: number; paused: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/clubs/${data.id}/pause`, { paused: data.paused });
      return res.json();
    },
    onSuccess: (_d, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      setConfirmAction(null);
      setActionClub(null);
      toast({ title: variables.paused ? "Club Paused" : "Club Resumed", description: variables.paused ? "The club has been paused." : "The club has been resumed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to pause/resume club", variant: "destructive" });
    },
  });

  const archiveClubMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/super-admin/clubs/${id}/archive`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      setConfirmAction(null);
      setActionClub(null);
      toast({ title: "Club Archived", description: "The club has been archived." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to archive club", variant: "destructive" });
    },
  });

  const deleteClubMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/super-admin/clubs/${id}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      setConfirmAction(null);
      setActionClub(null);
      toast({ title: "Club Deleted", description: "The club has been permanently deleted." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to delete club", variant: "destructive" });
    },
  });

  const transferAdminMutation = useMutation({
    mutationFn: async (data: { clubId: number; newOwnerId: number }) => {
      const res = await apiRequest("PATCH", `/api/super-admin/clubs/${data.clubId}/transfer`, { newOwnerId: data.newOwnerId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      setTransferClub(null);
      setTransferOwnerId("");
      setActionClub(null);
      toast({ title: "Admin Transferred", description: "The club admin has been changed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to transfer admin", variant: "destructive" });
    },
  });

  const pendingClubs = useMemo(() => allClubs?.filter(c => c.status === "PENDING") || [], [allClubs]);
  const approvedClubs = useMemo(() => allClubs?.filter(c => c.status === "APPROVED") || [], [allClubs]);
  const filteredClubs = useMemo(() => {
    if (!allClubs) return [];
    if (!search) return allClubs;
    const s = search.toLowerCase();
    return allClubs.filter(c => c.name.toLowerCase().includes(s) || (c.city || "").toLowerCase().includes(s));
  }, [allClubs, search]);

  const getOwnerName = (ownerId?: number) => {
    if (!ownerId || !allUsers) return "No admin assigned";
    const owner = allUsers.find(u => u.id === ownerId);
    return owner?.fullName || `User #${ownerId}`;
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "APPROVED": return <Badge variant="outline" className="text-xs text-green-600">Approved</Badge>;
      case "PENDING": return <Badge variant="outline" className="text-xs text-amber-600">Pending</Badge>;
      case "REJECTED": return <Badge variant="outline" className="text-xs text-red-600">Rejected</Badge>;
      case "PAUSED": return <Badge variant="outline" className="text-xs text-orange-600">Paused</Badge>;
      case "ARCHIVED": return <Badge variant="outline" className="text-xs text-muted-foreground">Archived</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    switch (confirmAction.type) {
      case "pause":
        pauseClubMutation.mutate({ id: confirmAction.club.id, paused: true });
        break;
      case "resume":
        pauseClubMutation.mutate({ id: confirmAction.club.id, paused: false });
        break;
      case "archive":
        archiveClubMutation.mutate(confirmAction.club.id);
        break;
      case "delete":
        deleteClubMutation.mutate(confirmAction.club.id);
        break;
    }
  };

  const confirmActionTitle = () => {
    if (!confirmAction) return "";
    switch (confirmAction.type) {
      case "pause": return "Pause Club";
      case "resume": return "Resume Club";
      case "archive": return "Archive Club";
      case "delete": return "Delete Club Permanently";
    }
  };

  const confirmActionDescription = () => {
    if (!confirmAction) return "";
    switch (confirmAction.type) {
      case "pause": return `Are you sure you want to pause "${confirmAction.club.name}"? The club will be temporarily unavailable.`;
      case "resume": return `Are you sure you want to resume "${confirmAction.club.name}"? The club will become active again.`;
      case "archive": return `Are you sure you want to archive "${confirmAction.club.name}"? The club will be deactivated and hidden from public view.`;
      case "delete": return `Are you sure you want to permanently delete "${confirmAction.club.name}"? This will delete ALL associated data including sessions, matches, and member profiles. This action CANNOT be undone.`;
    }
  };

  const isConfirmPending = pauseClubMutation.isPending || archiveClubMutation.isPending || deleteClubMutation.isPending;

  const actionMenuItems = (club: ClubRecord) => [
    {
      label: "Edit Club Details",
      icon: Pencil,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      onClick: () => { setActionClub(null); setEditClub(club); },
    },
    {
      label: "Manage Club Members",
      icon: Users,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      onClick: () => { setActionClub(null); setManageClub(club); },
    },
    {
      label: club.status === "PAUSED" ? "Resume Club" : "Pause Club",
      icon: club.status === "PAUSED" ? Play : Pause,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      onClick: () => { setActionClub(null); setConfirmAction({ type: club.status === "PAUSED" ? "resume" : "pause", club }); },
    },
    {
      label: "Change Club Admin",
      icon: Shield,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      onClick: () => { setActionClub(null); setTransferClub(club); setTransferOwnerId(club.ownerId ? String(club.ownerId) : ""); },
    },
    {
      label: "Edit Club Sessions",
      icon: Calendar,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
      onClick: () => { setActionClub(null); navigate(`/sessions?clubId=${club.id}`); },
    },
    {
      label: "Archive Club",
      icon: Archive,
      color: "text-muted-foreground",
      bg: "bg-muted/50",
      onClick: () => { setActionClub(null); setConfirmAction({ type: "archive", club }); },
    },
    {
      label: "Delete Club",
      icon: Trash2,
      color: "text-red-500",
      bg: "bg-red-500/10",
      onClick: () => { setActionClub(null); setConfirmAction({ type: "delete", club }); },
    },
  ];

  // Derived data for the unified layout
  const pinnedSet = useMemo(() => new Set(pinned), [pinned]);
  const tilesById = useMemo(() => new Map(TILE_CATALOG.map(t => [t.id, t])), []);
  const pinnedTiles = useMemo(() => pinned.map(id => tilesById.get(id)).filter(Boolean) as TileDef[], [pinned, tilesById]);
  const recentTiles = useMemo(() => recent.map(id => tilesById.get(id)).filter(Boolean) as TileDef[], [recent, tilesById]);
  const tilesByCategory = useMemo(() => {
    const map = new Map<CategoryKey, TileDef[]>();
    for (const cat of CATEGORIES) map.set(cat.key, []);
    for (const t of TILE_CATALOG) map.get(t.category)?.push(t);
    return map;
  }, []);

  const totals = analytics?.totals;
  const totalClubs    = totals?.totalClubs ?? (allClubs?.length ?? 0);
  const totalPlayers  = totals?.totalPlayers ?? 0;
  const totalSessions = totals?.totalSessions ?? 0;
  const totalMatches  = totals?.totalMatches ?? 0;
  const pendingClubsCount = pendingClubs.length;

  // Apply status filter on top of existing search
  const visibleClubs = useMemo(() => {
    if (statusFilter === "ALL") return filteredClubs;
    return filteredClubs.filter(c => c.status === statusFilter);
  }, [filteredClubs, statusFilter]);

  return (
    <div className="space-y-8" data-testid="super-admin-dashboard">
      {/* ── Header + top bar ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3" data-testid="text-super-admin-title">
            <Shield className="w-8 h-8 text-primary" />
            God's Mode Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Full control across every club, member, and module.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaletteOpen(true)}
            className="gap-2 rounded-xl"
            data-testid="button-open-palette"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search anything…</span>
            <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
          <Badge variant="destructive" className="text-sm py-1.5 px-4 rounded-xl" data-testid="badge-god-mode">
            <Zap className="h-4 w-4 mr-2" />
            GOD MODE
          </Badge>
        </div>
      </div>

      {/* ── Overview KPIs ─────────────────────────────────────────────── */}
      <section className="space-y-3" data-testid="section-overview">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <p className="text-sm font-bold tracking-tight">Overview</p>
            <p className="text-[11px] text-muted-foreground">Platform health at a glance</p>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <Card className="border-border/40 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all rounded-2xl" data-testid="kpi-total-clubs" onClick={() => setKpiDetail("total-clubs")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Total Clubs</span>
                <Building2 className="h-4 w-4 text-muted-foreground/60" />
              </div>
              {analyticsLoading ? <div className="h-8 w-12 bg-muted rounded animate-pulse" /> : <div className="text-2xl font-bold" data-testid="value-kpi-total-clubs">{totalClubs}</div>}
            </CardContent>
          </Card>
          <Card className="border-border/40 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all rounded-2xl" data-testid="kpi-total-players" onClick={() => setKpiDetail("total-players")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Players</span>
                <Users className="h-4 w-4 text-muted-foreground/60" />
              </div>
              {analyticsLoading ? <div className="h-8 w-12 bg-muted rounded animate-pulse" /> : <div className="text-2xl font-bold" data-testid="value-kpi-total-players">{totalPlayers}</div>}
            </CardContent>
          </Card>
          <Card className="border-border/40 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all rounded-2xl" data-testid="kpi-total-sessions" onClick={() => setKpiDetail("total-sessions")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Sessions</span>
                <Calendar className="h-4 w-4 text-muted-foreground/60" />
              </div>
              {analyticsLoading ? <div className="h-8 w-12 bg-muted rounded animate-pulse" /> : <div className="text-2xl font-bold" data-testid="value-kpi-total-sessions">{totalSessions}</div>}
            </CardContent>
          </Card>
          <Card className="border-border/40 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all rounded-2xl" data-testid="kpi-total-matches" onClick={() => setKpiDetail("total-matches")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Matches</span>
                <Trophy className="h-4 w-4 text-muted-foreground/60" />
              </div>
              {analyticsLoading ? <div className="h-8 w-12 bg-muted rounded animate-pulse" /> : <div className="text-2xl font-bold" data-testid="value-kpi-total-matches">{totalMatches}</div>}
            </CardContent>
          </Card>
          <Card className="border-border/40 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all rounded-2xl" data-testid="kpi-pending-clubs" onClick={() => setKpiDetail("pending-clubs")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Pending Clubs</span>
                <Clock className="h-4 w-4 text-muted-foreground/60" />
              </div>
              <div className="text-2xl font-bold" data-testid="value-kpi-pending-clubs">{pendingClubsCount}</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Pinned tiles ──────────────────────────────────────────────── */}
      {pinnedTiles.length > 0 && (
        <section className="space-y-3" data-testid="section-pinned">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-bold tracking-tight">Pinned</p>
            <p className="text-[11px] text-muted-foreground">Your favourite shortcuts</p>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {pinnedTiles.map((tile) => (
              <TileCard key={tile.id} tile={tile} pinned compact onPinToggle={togglePin} onActivate={trackActivate} />
            ))}
          </div>
        </section>
      )}

      {/* ── Recently used ─────────────────────────────────────────────── */}
      {recentTiles.length > 0 && (
        <section className="space-y-3" data-testid="section-recent">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-bold tracking-tight">Recently Used</p>
            <p className="text-[11px] text-muted-foreground">Last {RECENT_LIMIT} you opened</p>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {recentTiles.map((tile) => (
              <TileCard key={tile.id} tile={tile} pinned={pinnedSet.has(tile.id)} compact onPinToggle={togglePin} onActivate={trackActivate} />
            ))}
          </div>
        </section>
      )}

      {/* ── Categorised collapsible sections ──────────────────────────── */}
      <section className="space-y-4" data-testid="section-modules">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold tracking-tight">All Modules</p>
            <p className="text-[11px] text-muted-foreground">Every tool, organised</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed({})}
              className="text-xs h-7 rounded-lg"
              data-testid="button-expand-all"
            >
              Expand all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const all: Record<string, boolean> = {};
                for (const c of CATEGORIES) all[c.key] = true;
                setCollapsed(all);
              }}
              className="text-xs h-7 rounded-lg"
              data-testid="button-collapse-all"
            >
              Collapse all
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          {CATEGORIES.map((cat) => {
            const tiles = tilesByCategory.get(cat.key) || [];
            if (tiles.length === 0 && cat.key !== "admin-control" && cat.key !== "reports-export") return null;
            return (
              <CategorySection
                key={cat.key}
                category={cat}
                tiles={tiles}
                defaultOpen
                collapsed={!!collapsed[cat.key]}
                onToggleCollapsed={() => toggleCollapsed(cat.key)}
                pinnedSet={pinnedSet}
                onPinToggle={togglePin}
                onActivate={trackActivate}
              />
            );
          })}
        </div>
      </section>

      {/* ── Admin & Control: live clubs management ────────────────────── */}
      <section className="space-y-3" data-testid="section-clubs-management">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-bold tracking-tight">Clubs Management</p>
          <p className="text-[11px] text-muted-foreground">Approve, edit, transfer or pause clubs</p>
        </div>
        <Card className="border-border/40 rounded-2xl overflow-hidden" data-testid="card-clubs-management">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search clubs by name or city…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl"
                  data-testid="input-clubs-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] rounded-xl" data-testid="select-clubs-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setCreateOpen(true)} className="gap-2 rounded-xl" data-testid="button-create-club">
                <Plus className="w-4 h-4" />
                Create Club
              </Button>
            </div>
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">City</TableHead>
                    <TableHead className="hidden lg:table-cell">Admin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clubsLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading clubs…</TableCell></TableRow>
                  ) : visibleClubs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No clubs match your filters.</TableCell></TableRow>
                  ) : visibleClubs.map((club) => (
                    <TableRow key={club.id} className="hover:bg-muted/40" data-testid={`row-club-${club.id}`}>
                      <TableCell className="font-medium">{club.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{club.city || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">{getOwnerName(club.ownerId)}</TableCell>
                      <TableCell>{statusLabel(club.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg"
                          onClick={() => setActionClub(club)}
                          data-testid={`button-club-actions-${club.id}`}
                        >
                          Manage
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Reports & Export ──────────────────────────────────────────── */}
      <section className="space-y-4" data-testid="section-reports-export">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
          <p className="text-sm font-bold tracking-tight">Reports & Export</p>
          <p className="text-[11px] text-muted-foreground">AI summaries and data downloads</p>
        </div>
        <SuperAdminAIReportsSection clubs={(allClubs as any[]) || []} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="border-border/40 rounded-2xl">
            <CardContent className="p-4 flex items-start gap-3.5">
              <div className="bg-primary/10 rounded-xl p-2.5 shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Export All Users</p>
                <p className="text-xs text-muted-foreground mt-0.5">Download CSV with all user details, club memberships, and stats.</p>
                <Button size="sm" className="mt-2 rounded-lg" onClick={() => handleExport("users")} disabled={downloadingUsers} data-testid="button-sa-export-users">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  {downloadingUsers ? "Downloading…" : "Download CSV"}
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/40 rounded-2xl">
            <CardContent className="p-4 flex items-start gap-3.5">
              <div className="bg-blue-500/10 rounded-xl p-2.5 shrink-0">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Export Attendance</p>
                <p className="text-xs text-muted-foreground mt-0.5">Download CSV with attendance history, dates, and payment status.</p>
                <Button size="sm" className="mt-2 rounded-lg" onClick={() => handleExport("attendance")} disabled={downloadingAttendance} data-testid="button-sa-export-attendance">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  {downloadingAttendance ? "Downloading…" : "Download CSV"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── KPI detail dialog ─────────────────────────────────────────── */}
      <KpiDetailDialog
        open={kpiDetail !== null}
        onOpenChange={(open) => { if (!open) setKpiDetail(null); }}
        title={
          kpiDetail === "total-clubs" ? "All Clubs" :
          kpiDetail === "total-players" ? "Players by Club" :
          kpiDetail === "total-sessions" ? "Sessions by Club" :
          kpiDetail === "total-matches" ? "Matches by Club" :
          kpiDetail === "pending-clubs" ? "Pending Club Approvals" : ""
        }
        description={
          kpiDetail === "total-clubs" ? `${totalClubs} clubs registered` :
          kpiDetail === "total-players" ? `${totalPlayers} total players across all clubs` :
          kpiDetail === "total-sessions" ? `${totalSessions} total sessions` :
          kpiDetail === "total-matches" ? `${totalMatches} total matches played` :
          kpiDetail === "pending-clubs" ? `${pendingClubsCount} clubs awaiting approval` : undefined
        }
      >
        {(kpiDetail === "total-clubs" || kpiDetail === "total-players" || kpiDetail === "total-sessions" || kpiDetail === "total-matches") && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Club Name</TableHead>
                {kpiDetail === "total-clubs" && <TableHead>Status</TableHead>}
                {kpiDetail !== "total-clubs" && <TableHead className="text-right">{kpiDetail === "total-players" ? "Players" : kpiDetail === "total-sessions" ? "Sessions" : "Matches"}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics?.clubs?.map((c) => (
                <TableRow key={c.clubId} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/admin/club/${c.clubId}`)}>
                  <TableCell className="font-medium text-primary">{c.clubName}</TableCell>
                  {kpiDetail === "total-clubs" && <TableCell><Badge variant={c.status === "APPROVED" ? "default" : "secondary"}>{c.status}</Badge></TableCell>}
                  {kpiDetail === "total-players" && <TableCell className="text-right">{c.totalPlayers}</TableCell>}
                  {kpiDetail === "total-sessions" && <TableCell className="text-right">{c.totalSessions}</TableCell>}
                  {kpiDetail === "total-matches" && <TableCell className="text-right">{c.totalMatches}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {kpiDetail === "pending-clubs" && (
          pendingClubs.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No pending clubs</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>City</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {pendingClubs.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.city || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => { setKpiDetail(null); setEditClub(c); }} data-testid={`button-review-pending-${c.id}`}>Review</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}
      </KpiDetailDialog>

      {/* ── Global Command Palette ────────────────────────────────────── */}
      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Search any module, page or KPI…" value={topSearch} onValueChange={setTopSearch} data-testid="input-command-palette" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {pinnedTiles.length > 0 && (
            <CommandGroup heading="Pinned">
              {pinnedTiles.map((tile) => (
                <CommandItem
                  key={`pal-pin-${tile.id}`}
                  value={`${tile.label} ${tile.description}`}
                  onSelect={() => { trackActivate(tile.id); setPaletteOpen(false); navigate(tile.href); }}
                  data-testid={`palette-item-${tile.id}`}
                >
                  <tile.icon className={`w-4 h-4 mr-2 ${tile.color}`} />
                  <span>{tile.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {CATEGORIES.map((cat) => {
            const tiles = tilesByCategory.get(cat.key) || [];
            if (tiles.length === 0) return null;
            return (
              <div key={`pal-${cat.key}`}>
                <CommandSeparator />
                <CommandGroup heading={cat.label}>
                  {tiles.map((tile) => (
                    <CommandItem
                      key={`pal-${tile.id}`}
                      value={`${tile.label} ${tile.description} ${cat.label}`}
                      onSelect={() => { trackActivate(tile.id); setPaletteOpen(false); navigate(tile.href); }}
                    >
                      <tile.icon className={`w-4 h-4 mr-2 ${tile.color}`} />
                      <span>{tile.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground hidden sm:inline">{tile.href}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            );
          })}
        </CommandList>
      </CommandDialog>

      <Dialog open={!!actionClub} onOpenChange={(open) => { if (!open) setActionClub(null); }}>
        <DialogContent className="max-w-md" data-testid="dialog-club-actions">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-500" />
              {actionClub?.name}
            </DialogTitle>
            <DialogDescription>
              Choose an action for this club.
            </DialogDescription>
          </DialogHeader>
          {actionClub && (
            <div className="flex flex-col gap-2">
              {actionMenuItems(actionClub).map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-4 px-4 py-3 rounded-lg hover-elevate cursor-pointer border border-border/50 transition-all"
                  onClick={item.onClick}
                  data-testid={`action-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${item.bg}`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="flex-1 font-medium text-sm">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editClub} onOpenChange={(open) => { if (!open) setEditClub(null); }}>
        <DialogContent className="max-w-2xl" data-testid="dialog-edit-club">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              {editClub?.status === "PENDING" ? "Review Club Submission" : "Edit Club"}
            </DialogTitle>
            <DialogDescription>
              {editClub?.status === "PENDING" ? "Review and approve or reject this club application." : "Update the club details and admin assignment."}
            </DialogDescription>
          </DialogHeader>

          {editClub?.status === "PENDING" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
              <Clock className="w-4 h-4 flex-shrink-0" />
              This club is awaiting approval. Review the details and approve or reject below.
            </div>
          )}

          {editClub && (
            <div className="text-sm text-muted-foreground">
              Applicant: <strong>{getOwnerName(editClub.ownerId)}</strong>
            </div>
          )}

          <ClubFormFields form={editForm} setForm={setEditForm} users={allUsers} />

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editClub?.status === "PENDING" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => editClub && approveClubMutation.mutate({ id: editClub.id, status: "REJECTED" })}
                  disabled={approveClubMutation.isPending}
                  className="gap-2"
                  data-testid="button-reject-club"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
                <Button
                  onClick={() => editClub && approveClubMutation.mutate({ id: editClub.id, status: "APPROVED", adminUserId: editForm.adminUserId })}
                  disabled={approveClubMutation.isPending}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  data-testid="button-approve-club"
                >
                  {approveClubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approve Club
                </Button>
              </>
            )}
            <div className="flex gap-2 flex-1 justify-end">
              <Button variant="outline" onClick={() => setEditClub(null)} data-testid="button-cancel-edit">Cancel</Button>
              <Button
                onClick={() => editClub && updateClubMutation.mutate({ id: editClub.id, form: editForm })}
                disabled={updateClubMutation.isPending}
                data-testid="button-save-club"
              >
                {updateClubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-create-club">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Create New Club
            </DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new club and assign an admin.
            </DialogDescription>
          </DialogHeader>
          <ClubFormFields form={createForm} setForm={setCreateForm} users={allUsers} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} data-testid="button-cancel-create">Cancel</Button>
            <Button
              onClick={() => createClubMutation.mutate(createForm)}
              disabled={createClubMutation.isPending || !createForm.name.trim()}
              data-testid="button-confirm-create"
            >
              {createClubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Club
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!transferClub} onOpenChange={(open) => { if (!open) { setTransferClub(null); setTransferOwnerId(""); } }}>
        <DialogContent className="max-w-md" data-testid="dialog-transfer-admin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-500" />
              Change Club Admin
            </DialogTitle>
            <DialogDescription>
              Select a new admin for <strong>{transferClub?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Current Admin</Label>
              <p className="text-sm text-muted-foreground mt-1" data-testid="text-current-admin">{transferClub ? getOwnerName(transferClub.ownerId) : ""}</p>
            </div>
            <div>
              <Label>New Admin</Label>
              <Select value={transferOwnerId} onValueChange={setTransferOwnerId}>
                <SelectTrigger data-testid="select-new-admin">
                  <SelectValue placeholder="Select a user..." />
                </SelectTrigger>
                <SelectContent>
                  {allUsers?.map(u => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.fullName} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTransferClub(null); setTransferOwnerId(""); }} data-testid="button-cancel-transfer">Cancel</Button>
            <Button
              onClick={() => transferClub && transferOwnerId && transferAdminMutation.mutate({ clubId: transferClub.id, newOwnerId: parseInt(transferOwnerId) })}
              disabled={transferAdminMutation.isPending || !transferOwnerId}
              data-testid="button-confirm-transfer"
            >
              {transferAdminMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Transfer Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent data-testid="dialog-confirm-action">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmActionTitle()}</AlertDialogTitle>
            <AlertDialogDescription>{confirmActionDescription()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-confirm-action">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={confirmAction?.type === "delete" ? "bg-destructive text-destructive-foreground" : ""}
              data-testid="button-confirm-confirm-action"
            >
              {isConfirmPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {confirmAction?.type === "delete" ? "Delete Permanently" : confirmAction?.type === "archive" ? "Archive" : confirmAction?.type === "pause" ? "Pause" : "Resume"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MembersManagementDialog
        club={manageClub}
        open={!!manageClub}
        onClose={() => setManageClub(null)}
      />
    </div>
  );
}
