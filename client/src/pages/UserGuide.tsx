import { useState } from "react";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  Users,
  ShieldCheck,
  Zap,
  Calendar,
  Trophy,
  CreditCard,
  Bell,
  Mail,
  Ticket,
  Gift,
  Building2,
  BarChart3,
  Settings,
  UserPlus,
  ClipboardList,
  Megaphone,
  HelpCircle,
  Search,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface GuideSection {
  icon: any;
  title: string;
  description: string;
  steps: string[];
  tips?: string[];
}

function SectionCard({ section }: { section: GuideSection }) {
  return (
    <AccordionItem value={section.title} className="border rounded-lg mb-3 overflow-hidden">
      <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]]:bg-muted/50" data-testid={`guide-section-${section.title.toLowerCase().replace(/\s+/g, '-')}`}>
        <div className="flex items-center gap-3 text-left">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <section.icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{section.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="ml-12 space-y-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">How It Works</h4>
            <ol className="space-y-2">
              {section.steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          {section.tips && section.tips.length > 0 && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5">Tips</h4>
              <ul className="space-y-1">
                {section.tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm text-amber-800 dark:text-amber-300">
                    <ChevronRight className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

const playerSections: GuideSection[] = [
  {
    icon: Settings,
    title: "Getting Started",
    description: "Set up your account and join a club",
    steps: [
      "Register an account using the sign-up page with your name, email, and password.",
      "Once logged in, you'll land on your Dashboard showing your credits, stats, and upcoming sessions.",
      "Head to 'Clubs' in the sidebar to browse available clubs and request to join one.",
      "After your request is approved by a club admin, you'll have full access to that club's sessions and features.",
    ],
    tips: [
      "You can join multiple clubs at once.",
      "If you already have a guest profile in a club, use the 'Claim Account' option to link it to your registered account.",
    ],
  },
  {
    icon: Calendar,
    title: "Sessions",
    description: "View, sign up for, and manage your session attendance",
    steps: [
      "Go to 'Sessions' in the sidebar to see all upcoming sessions for your club(s).",
      "Click on a session to see its details including date, time, venue, available spots, and cost.",
      "Click the sign-up button to confirm your attendance. If the session is full, you'll be placed on the waiting list.",
      "You can change your status between Confirmed, Waiting List, and Not Attending at any time before the session.",
      "Go to 'My Sessions' to see all sessions you've signed up for, including past ones.",
    ],
    tips: [
      "Some sessions may have a scheduled opening time - you won't be able to sign up until that time arrives.",
      "If you're on the waiting list and a spot opens up, you'll be automatically promoted to confirmed.",
      "Check session costs before signing up - unpaid sessions will appear in your outstanding payments.",
    ],
  },
  {
    icon: Trophy,
    title: "Rankings & Leaderboard",
    description: "Track your performance and see where you stand",
    steps: [
      "Go to 'Rankings' in the sidebar to see the club leaderboard.",
      "Rankings are calculated from your completed matches - wins, losses, and win percentage.",
      "You can view rankings for specific sessions or see the overall club leaderboard.",
      "Your personal stats are also shown on your Dashboard and Profile page.",
    ],
    tips: [
      "Your grade level (Beginner to Elite) is automatically updated based on your recent session performance.",
      "You can choose to show or hide your name on public leaderboards using the privacy toggle in your profile.",
      "Set a nickname in your profile if you'd prefer that to appear on public views.",
    ],
  },
  {
    icon: CreditCard,
    title: "Credits & Payments",
    description: "Understand your credit balance and outstanding payments",
    steps: [
      "Your credit balance is shown at the top of your Dashboard.",
      "Credits can be earned through referrals, attendance milestones, and club anniversary rewards.",
      "Outstanding payments for sessions you've attended are visible on your Dashboard.",
      "Contact your club admin if you need to make a payment or have questions about your balance.",
    ],
    tips: [
      "Keep an eye on payment reminders - your admin may send automated reminders for unpaid sessions.",
      "Credits are automatically applied when earned and tracked in your credit ledger.",
    ],
  },
  {
    icon: Gift,
    title: "Refer & Earn",
    description: "Invite friends and earn rewards",
    steps: [
      "Go to 'Refer & Earn' in the sidebar to find your personal referral code.",
      "Share your referral code with friends who want to join your club.",
      "When they register using your code, you'll both earn rewards once the referral is approved.",
      "Track your referral progress and milestones on the referrals page.",
    ],
    tips: [
      "Each club may have different referral reward amounts - check the details for your specific club.",
      "Referral codes have an expiry date, so share them promptly.",
      "Reach Premium and Champion milestones by making enough successful referrals for bonus rewards.",
    ],
  },
  {
    icon: Mail,
    title: "Inbox & Messages",
    description: "Communicate with other club members",
    steps: [
      "Go to 'Inbox' in the sidebar to see your conversations.",
      "You can send messages to any member of your club(s).",
      "Use the search bar to find specific contacts.",
      "Messages show read receipts so you know when they've been seen.",
    ],
    tips: [
      "You can archive conversations you no longer need.",
      "The badge count on the sidebar tells you how many unread messages you have.",
    ],
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "Stay informed about club activities",
    steps: [
      "Go to 'Notifications' in the sidebar to see all your notifications.",
      "Notifications are organised into categories - you can filter by type using the tabs.",
      "Use the search bar to find specific notifications.",
      "Mark notifications as read individually or use bulk actions to clear them.",
    ],
    tips: [
      "You'll receive notifications for session reminders, payment reminders, referral updates, and more.",
      "The bell icon in the top corner shows your unread notification count.",
    ],
  },
  {
    icon: Megaphone,
    title: "Announcements",
    description: "Read important club-wide announcements",
    steps: [
      "Go to 'Announcements' in the sidebar to see club announcements.",
      "Announcements may include images and rich content from your club admins.",
      "You can archive announcements you've already read.",
    ],
  },
  {
    icon: Ticket,
    title: "Support Tickets",
    description: "Get help from club administrators",
    steps: [
      "Go to 'My Tickets' in the sidebar to create and manage support requests.",
      "Click 'New Ticket' and choose a category (e.g. Payment Issue, Technical Problem, General Query).",
      "Set a priority level and describe your issue in detail.",
      "Track the status of your ticket as admins respond and work on it.",
      "You'll receive notifications when your ticket is updated.",
    ],
    tips: [
      "Mark a ticket as 'Confidential' if it contains sensitive information - only admins will be able to see it.",
      "Provide as much detail as possible when creating a ticket to help admins resolve it faster.",
    ],
  },
  {
    icon: Users,
    title: "Profile & Account",
    description: "Manage your personal information and preferences",
    steps: [
      "Click the settings icon next to your name in the sidebar, or go to 'Profile'.",
      "Update your personal details like name, email, phone, and profile photo.",
      "Set your playing preferences including skill level and availability.",
      "Toggle your public name visibility and set a nickname for public views.",
      "Choose your display mode (light/dark theme) and reduced motion preferences.",
      "View your detailed player stats, session history, and earned rewards.",
    ],
    tips: [
      "Your anniversary countdown shows when you'll receive your next club anniversary reward.",
      "You can see a live timer showing exactly how long you've been a member of each club.",
      "If you need to delete your account, you can do so from the profile page - but it's permanent!",
    ],
  },
];

const adminSections: GuideSection[] = [
  {
    icon: ShieldCheck,
    title: "Admin Panel Overview",
    description: "Your central hub for managing club operations",
    steps: [
      "Click 'Admin Panel' in the sidebar to access the admin dashboard.",
      "The dashboard shows key metrics for your club(s) including member count, upcoming sessions, and recent activity.",
      "From here, you can navigate to all admin tools using the tabs and links.",
      "If you manage multiple clubs, use the club selector to switch between them.",
    ],
    tips: [
      "The admin panel is only visible to users with Admin or Owner roles.",
      "Organisers have a simplified view with limited access to certain admin features.",
    ],
  },
  {
    icon: Calendar,
    title: "Session Management",
    description: "Create, edit, and manage club sessions",
    steps: [
      "From the Admin Panel, go to the Sessions section.",
      "Click 'Create Session' to set up a new session with date, time, venue, court count, max players, and fee.",
      "For recurring sessions, set the frequency (weekly/fortnightly/monthly) and date range - the system generates up to 52 sessions automatically.",
      "Use 'Scheduled Publishing' to set a future date when signups will open for a session.",
      "During a live session, use in-session controls to manage players: override gender, pause/resume, pair players, and add guest players.",
      "The Smart Match Engine can generate matches automatically in social or competitive mode.",
      "Use the visual court display to see current matches and manage court assignments.",
    ],
    tips: [
      "You can cancel matches or hard-stop match generation at any time during a session.",
      "The queuing system automatically manages player rotation during sessions.",
      "Mark attendance for players to trigger automatic attendance milestone rewards.",
    ],
  },
  {
    icon: Users,
    title: "Player & Member Management",
    description: "Manage your club's membership roster",
    steps: [
      "Go to 'Admin Panel' and then the Players/Members section.",
      "View all club members with filtering options (by status, membership type, gender, etc.).",
      "Click on any player to see their detailed profile including stats, payment history, and activity.",
      "Use inline editing to update player details like name, contact info, gender, and acquisition source.",
      "Perform bulk actions: send messages, update statuses, or remove members.",
      "Create guest player profiles for visitors who attend sessions without full accounts.",
    ],
    tips: [
      "Use the Import Members feature to bulk-add members from a spreadsheet.",
      "Players can claim guest profiles later using the Claim Account feature.",
      "Edit a member's KPI fields (ranking points, matches played/won) and acquisition source directly from their profile.",
    ],
  },
  {
    icon: CreditCard,
    title: "Financial Dashboard",
    description: "Track revenue, payments, credits, and expenses",
    steps: [
      "Go to 'Admin Panel' then 'Financials' to open the Financial Dashboard.",
      "The Overview tab shows total revenue, attendance figures, and financial KPIs.",
      "The Credits tab shows the credit ledger with all credit transactions and policy validation.",
      "The Memberships tab displays membership revenue summaries, active plans, and overdue payment alerts.",
      "The Outstanding tab shows past sessions with unpaid or pending payments.",
      "Click on any outstanding session to see individual player payment details.",
      "Use inline fee editing to adjust session fees, and mark payments as paid individually or per player.",
    ],
    tips: [
      "The Outstanding tab only shows past sessions - current/future sessions appear in the regular session list.",
      "Payment status badges (Pending/Unpaid) help you quickly distinguish between payment states.",
      "Use 'Pay All' on a player to mark all their outstanding payments at once.",
    ],
  },
  {
    icon: ClipboardList,
    title: "Membership Plans",
    description: "Create and manage membership plans for your club",
    steps: [
      "Go to 'Admin Panel' then 'Memberships' to manage your club's membership plans.",
      "Create membership plans with custom names, durations, and pricing.",
      "Review and approve/reject membership requests from players.",
      "Track active memberships, expiring plans, and renewal rates.",
      "The system automatically sends reminders before memberships expire (1 week, 3 days, on day, and after).",
    ],
    tips: [
      "Membership plan names appear throughout the analytics dashboards - choose clear, descriptive names.",
      "You can customise plan durations and the system will auto-calculate end dates.",
      "Proration is supported for mid-period membership changes.",
    ],
  },
  {
    icon: Gift,
    title: "Rewards Management",
    description: "Configure referral, attendance, and anniversary rewards",
    steps: [
      "Go to 'Admin Panel' then 'Rewards' to manage all reward programmes.",
      "The Anniversary tab lets you configure credits and gifts members receive on their club anniversary.",
      "The Attendance tab lets you set milestone rewards (e.g. free session after 10 attendances).",
      "The Referrals tab shows referral programme settings including credit amounts and thresholds.",
      "All reward issuances are logged and can be viewed in each player's profile.",
    ],
    tips: [
      "Attendance milestones can be repeating - a player can earn the same reward multiple times.",
      "Anniversary rewards are issued automatically on the anniversary date with no admin action needed.",
      "Referral programme settings are per-club, so each club can have different reward amounts.",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Track acquisition, attendance, and KPIs",
    steps: [
      "Acquisition Analytics: Shows how new members find your club, conversion rates by channel, retention, and channel quality scores.",
      "Attendance Analytics: Shows session attendance patterns, top attendees, growth trends, and no-show rates with drill-down modals.",
      "Inactive Members: Identifies members who haven't attended for a configurable period (30/60/90+ days).",
      "Monthly Reports: Auto-generated summary of growth, acquisitions, membership conversions, and referral performance.",
      "Use filters (date range, club, source, membership type) to narrow down analytics to specific segments.",
      "Export data as CSV for external analysis.",
    ],
    tips: [
      "Analytics update dynamically based on your selected club filter.",
      "The Channel Quality Score weighs membership conversion (40%), retention (30%), and activity (30%).",
      "Click on KPI cards in Attendance Analytics to see detailed breakdowns in drill-down modals.",
    ],
  },
  {
    icon: Bell,
    title: "Notification Settings",
    description: "Configure automated messaging and reminders",
    steps: [
      "Go to 'Admin Panel' then 'Notification Settings'.",
      "Configure payment reminders: set how many days before, on the day, and after a session to send reminders.",
      "Set up membership expiry reminders with configurable timing.",
      "Add your club's bank details to include in payment reminder messages.",
      "View the delivery log to see which notifications have been sent and their status.",
      "Monitor notification statistics to see delivery rates and engagement.",
    ],
    tips: [
      "The notification scheduler runs hourly with deduplication - members won't receive duplicate reminders.",
      "Notifications are delivered via in-app alerts, internal messages, and optionally by email.",
    ],
  },
  {
    icon: Megaphone,
    title: "Announcements",
    description: "Create and manage club-wide announcements",
    steps: [
      "Go to 'Admin Panel' then 'Announcements' (Owner access required).",
      "Click 'Create Announcement' to compose a new announcement with a title, content, and optional image.",
      "Published announcements are visible to all club members in their Announcements section.",
      "Manage existing announcements - edit, archive, or delete as needed.",
    ],
  },
  {
    icon: Ticket,
    title: "IT Helpdesk & Tickets",
    description: "Manage support tickets from members",
    steps: [
      "Go to 'Tickets' in the sidebar to see all support tickets.",
      "View tickets by status (Open, In Progress, Resolved, Closed).",
      "Click a ticket to see full details, add internal notes, and respond to the member.",
      "Change ticket priority and category as needed.",
      "Use the ban integration to restrict member access if needed.",
      "All actions are recorded in an immutable audit log for accountability.",
    ],
    tips: [
      "Confidential tickets are only visible to admins - not other members.",
      "Internal notes are not visible to the ticket creator - use them for admin-only discussions.",
    ],
  },
  {
    icon: Building2,
    title: "Inventory & Expenses",
    description: "Track club inventory and general expenses",
    steps: [
      "Go to 'Admin Panel' then 'Inventory' to manage stock and expenses.",
      "Add inventory items with quantities, costs, and categories.",
      "Record stock movements (purchases, usage, adjustments) to keep track of inventory levels.",
      "Log general club expenses for financial reporting.",
      "Inventory and expense data integrates with the Financial Dashboard.",
    ],
  },
];

const ownerSections: GuideSection[] = [
  {
    icon: Zap,
    title: "God Mode Dashboard",
    description: "Unrestricted global access to manage everything",
    steps: [
      "Click 'God Mode' in the Super Admin section of the sidebar.",
      "The God Mode dashboard provides direct links to all system management tools.",
      "Access advanced user management, club oversight, and system-wide settings.",
      "Use quick-access links to Acquisition & KPI Analytics, Notification Settings, and Reward Management.",
    ],
    tips: [
      "God Mode bypasses all club-scoping restrictions - you can see and manage all data across all clubs.",
      "Use this responsibly as changes affect the entire platform.",
    ],
  },
  {
    icon: Users,
    title: "User Management",
    description: "Manage all platform users globally",
    steps: [
      "From God Mode, access User Management to see all registered users across all clubs.",
      "Search, filter, and sort users by name, email, role, status, or club membership.",
      "Edit user details including role assignments (OWNER, ADMIN, PLAYER).",
      "Use the 'Merge Duplicate Accounts' tool to combine duplicate player profiles.",
      "Approve or reject new user registrations from the Approvals section.",
      "Reset user passwords from the Password Resets section.",
    ],
    tips: [
      "The merge tool handles data reassignment, deduplication, stat recalculation, and creates an audit log.",
      "Be careful when changing user roles - this affects what they can see and do across the platform.",
    ],
  },
  {
    icon: Building2,
    title: "Club Management",
    description: "Oversee all clubs on the platform",
    steps: [
      "From God Mode, access Club Management to see all clubs.",
      "Approve, pause, reject, or archive clubs through their lifecycle states.",
      "Edit club details, assign admins, and manage club settings.",
      "Review club approval requests from the Club Approvals section.",
      "Manage venues that clubs use for their sessions.",
    ],
    tips: [
      "Clubs go through states: PENDING -> APPROVED -> (PAUSED/ARCHIVED/REJECTED).",
      "You can manage organisers for each club from the club admin section.",
    ],
  },
  {
    icon: Gift,
    title: "Referral Programs",
    description: "Configure platform-wide referral programmes",
    steps: [
      "Go to 'Referral Programs' in the Super Admin section of the sidebar.",
      "Create multi-level referral programmes with configurable rewards at each level.",
      "Set the number of referrals required, credits (in £), gifts, free sessions, and unlock descriptions for each level.",
      "Each club has independent referral settings - configure credit amounts, premium/champion thresholds, code expiry, and active/inactive toggle.",
      "View referral analytics including approval rates and total credits issued.",
    ],
  },
  {
    icon: BarChart3,
    title: "Platform Analytics",
    description: "View system-wide analytics and reports",
    steps: [
      "From God Mode, access the Analytics section for platform-wide insights.",
      "View aggregated data across all clubs or filter by specific club.",
      "Monitor platform growth, user acquisition trends, and engagement metrics.",
      "Generate monthly admin summary reports with recommendations.",
    ],
  },
  {
    icon: Mail,
    title: "Message Management",
    description: "Oversee platform communications",
    steps: [
      "From the Admin Panel, access Messages to view platform-wide message activity.",
      "Use Chat Moderation to monitor and manage conversations.",
      "Super admins can message any user on the platform, not just within their club.",
    ],
  },
  {
    icon: ClipboardList,
    title: "Inactive Members & Deletion",
    description: "Manage inactive members and account deletion workflow",
    steps: [
      "From the Admin Panel, go to 'Inactive Members' to identify disengaged members.",
      "Set the inactivity threshold (30, 60, 90+ days, or a custom number).",
      "Send re-engagement messages to inactive members directly from the dashboard.",
      "Add admin notes about member status or outreach attempts.",
      "Schedule account deletion with a 3-day countdown period, during which the deletion can be cancelled.",
      "As an Owner, you can perform permanent immediate deletion when needed.",
      "All deletion actions are logged in the admin audit log.",
    ],
    tips: [
      "Scheduled deletions send internal notifications to the member, giving them a chance to respond.",
      "Always try re-engagement before scheduling deletion - use the messaging feature to reach out first.",
    ],
  },
];

interface FAQItem {
  question: string;
  answer: string;
  roles: ("player" | "admin" | "owner")[];
}

const faqItems: FAQItem[] = [
  {
    question: "How do I join a club?",
    answer: "After logging in, go to 'Clubs' in the sidebar, browse available clubs, and click 'Join'. Your request will be sent to the club admin for approval. Once approved, you'll have full access to the club's sessions and features.",
    roles: ["player"],
  },
  {
    question: "How do I sign up for a session?",
    answer: "Go to 'Sessions' in the sidebar, find the session you want to attend, and click the sign-up button. If the session is full, you'll be placed on the waiting list and automatically promoted when a spot opens up.",
    roles: ["player"],
  },
  {
    question: "What happens if I'm on the waiting list?",
    answer: "If you're on the waiting list, you'll be automatically promoted to confirmed status when a confirmed player cancels or the session capacity increases. You'll receive a notification when this happens.",
    roles: ["player"],
  },
  {
    question: "How are my rankings calculated?",
    answer: "Rankings are based on your completed matches. The system tracks wins, losses, and win percentage. Your overall ranking position is determined by your performance relative to other club members. Your grade level (Beginner to Elite) is automatically updated based on rolling session performance.",
    roles: ["player"],
  },
  {
    question: "How do I earn credits?",
    answer: "Credits can be earned in several ways: successful referrals (when your referred friend joins and is approved), reaching attendance milestones (e.g. attending 10 sessions), and on your club joining anniversary. Credits are automatically added to your balance.",
    roles: ["player"],
  },
  {
    question: "Can I hide my name on public leaderboards?",
    answer: "Yes! Go to your Profile and toggle the 'Show Public Name' option. When disabled, your name will appear blurred on public views. You can also set a nickname that will be shown instead of your real name.",
    roles: ["player"],
  },
  {
    question: "How do I create a recurring session?",
    answer: "When creating a new session, select a frequency (weekly, fortnightly, or monthly) and set a date range. The system will automatically generate all sessions in that range, up to a maximum of 52 occurrences.",
    roles: ["admin"],
  },
  {
    question: "How does the Smart Match Engine work?",
    answer: "The Smart Match Engine has two modes: Social (random pairing for casual play) and Competitive (skill-based pairing for balanced matches). During a live session, activate it from the session controls. You can cancel individual matches or hard-stop all match generation at any time.",
    roles: ["admin"],
  },
  {
    question: "How do I handle outstanding payments?",
    answer: "Go to Admin Panel > Financials > Outstanding tab to see all past sessions with unpaid or pending payments. Click on a session to see individual player payment details. You can mark payments as paid individually, edit fees inline, or use 'Pay All' to clear all of a player's outstanding payments at once.",
    roles: ["admin"],
  },
  {
    question: "How do I set up automated payment reminders?",
    answer: "Go to Admin Panel > Notification Settings. Configure payment reminders to be sent at specific intervals (days before session, on the day, next day, and daily until paid). Add your club's bank details so they're included in reminder messages.",
    roles: ["admin"],
  },
  {
    question: "What do the different membership plan states mean?",
    answer: "Active: Currently valid membership. Expired: Past the end date. Pending: Awaiting admin approval. The system tracks all states and sends automated reminders before memberships expire.",
    roles: ["admin"],
  },
  {
    question: "How do I import members from a spreadsheet?",
    answer: "Go to Admin Panel > Import Members. Upload a CSV or Excel file with member details. The system will validate the data and create profiles for new members. You can map columns to the correct fields during the import process.",
    roles: ["admin"],
  },
  {
    question: "How do I merge duplicate accounts?",
    answer: "From God Mode, access the Merge Duplicate Accounts tool. Search for the accounts you want to merge, select the primary account to keep, and confirm. The system handles data reassignment, deduplication, stat recalculation, and creates a full audit log. This is done within a database transaction for safety.",
    roles: ["owner"],
  },
  {
    question: "How do I manage club lifecycle states?",
    answer: "From God Mode > Club Management, you can change a club's state: PENDING (awaiting approval), APPROVED (active), PAUSED (temporarily disabled), REJECTED (denied), or ARCHIVED (no longer active). Each state change is logged.",
    roles: ["owner"],
  },
  {
    question: "How do I set up multi-level referral rewards?",
    answer: "Go to Referral Programs in the Super Admin section. Create a programme with multiple levels, each requiring a certain number of referrals. For each level, set the credit reward (in £), gifts, free sessions, and a description of what the player unlocks.",
    roles: ["owner"],
  },
  {
    question: "What is the Channel Quality Score?",
    answer: "The Channel Quality Score in Acquisition Analytics is a weighted metric that rates how effective each acquisition channel is. It weighs: Membership Conversion (40%), Retention Rate (30%), and Activity Level (30%). A higher score means that channel brings in more engaged, long-term members.",
    roles: ["admin", "owner"],
  },
  {
    question: "How does the inactivity detection work?",
    answer: "The Inactive Members dashboard identifies members who haven't attended a session or had platform activity within a configurable threshold (30, 60, 90+ days). You can message them for re-engagement, add admin notes, or schedule their account for deletion with a 3-day grace period.",
    roles: ["admin", "owner"],
  },
  {
    question: "How do I schedule a session to open for sign-ups later?",
    answer: "When creating or editing a session, set a 'Scheduled Publish Date'. The session will be visible to members but sign-up buttons won't be active until that date arrives. This lets you announce sessions early while controlling when registration opens.",
    roles: ["admin"],
  },
  {
    question: "How do support tickets work?",
    answer: "Members can create tickets categorised by type (Payment, Technical, General, etc.) with priority levels. Admins see all tickets in the Tickets section, can respond, add internal notes (not visible to the member), and track resolution. All actions are logged in an immutable audit trail. Confidential tickets are only visible to admins.",
    roles: ["admin", "owner"],
  },
  {
    question: "Can I delete my account?",
    answer: "Yes, you can request account deletion from your Profile page. Note that this is permanent and cannot be undone. Admin-scheduled deletions have a 3-day grace period during which the deletion can be cancelled.",
    roles: ["player"],
  },
  {
    question: "How do club anniversary rewards work?",
    answer: "Each club can configure anniversary rewards (credits, gifts, and a custom message) in the Rewards section. On the anniversary of a member joining the club, the system automatically issues the configured rewards, creates a credit ledger entry, sends a notification, and sends an internal message.",
    roles: ["admin", "owner"],
  },
  {
    question: "What are attendance milestone rewards?",
    answer: "Attendance milestones are configurable per club. For example, you can set a reward for every 10 sessions attended. When a player's attendance is marked at a session and they hit a milestone, the reward is automatically issued. Milestones can be repeating, so a player earns the reward each time they reach the threshold.",
    roles: ["admin", "owner"],
  },
  {
    question: "How do I export analytics data?",
    answer: "On the Acquisition Analytics page, look for the CSV Export button. This exports the current filtered view to a CSV file that you can open in Excel or Google Sheets for further analysis.",
    roles: ["admin", "owner"],
  },
];

export default function UserGuide() {
  const { data: user } = useUser();
  const userRole = user?.role || "PLAYER";
  const defaultTab = userRole === "OWNER" ? "owner" : userRole === "ADMIN" ? "admin" : "player";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFAQs = faqItems.filter((item) => {
    const matchesRole = item.roles.includes(activeTab as any);
    const matchesSearch = searchQuery
      ? item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesRole && matchesSearch;
  });

  const filterSections = (sections: GuideSection[]) => {
    if (!searchQuery) return sections;
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.steps.some((step) => step.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  return (
    <div className="space-y-6" data-testid="page-user-guide">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-guide-title">
            <BookOpen className="h-6 w-6 text-primary" />
            User Guide
          </h1>
          <p className="text-muted-foreground mt-1">
            Learn how to use every feature of Club Master
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search guides & FAQ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-guide-search"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto" data-testid="tabs-guide-roles">
          <TabsTrigger value="player" className="gap-1.5" data-testid="tab-player-guide">
            <Users className="h-4 w-4" />
            Player Guide
          </TabsTrigger>
          <TabsTrigger value="admin" className="gap-1.5" data-testid="tab-admin-guide">
            <ShieldCheck className="h-4 w-4" />
            Admin Guide
          </TabsTrigger>
          {(userRole === "OWNER" || userRole === "ADMIN") && (
            <TabsTrigger value="owner" className="gap-1.5" data-testid="tab-owner-guide">
              <Zap className="h-4 w-4" />
              Owner Guide
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="player" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Player Guide
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Everything you need to know as a club member
              </p>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-0">
                {filterSections(playerSections).map((section) => (
                  <SectionCard key={section.title} section={section} />
                ))}
                {filterSections(playerSections).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No matching sections found.</p>
                )}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Club Admin Guide
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                How to manage your club's operations, members, and finances
              </p>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-0">
                {filterSections(adminSections).map((section) => (
                  <SectionCard key={section.title} section={section} />
                ))}
                {filterSections(adminSections).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No matching sections found.</p>
                )}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="owner" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-destructive" />
                Owner / Super Admin Guide
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Platform-wide management, user oversight, and advanced tools
              </p>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-0">
                {filterSections(ownerSections).map((section) => (
                  <SectionCard key={section.title} section={section} />
                ))}
                {filterSections(ownerSections).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No matching sections found.</p>
                )}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card data-testid="section-faq">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Frequently Asked Questions
            <Badge variant="secondary" className="ml-2">{filteredFAQs.length}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Common questions for {activeTab === "player" ? "players" : activeTab === "admin" ? "club admins" : "owners"}
          </p>
        </CardHeader>
        <CardContent>
          {filteredFAQs.length > 0 ? (
            <Accordion type="multiple" className="space-y-0">
              {filteredFAQs.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg mb-2 overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline text-left text-sm font-medium" data-testid={`faq-item-${i}`}>
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-center text-muted-foreground py-8">No matching FAQ items found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
