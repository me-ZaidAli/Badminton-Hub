# Club Master - Racket Sports Club Management Platform

## Overview
Club Master is a comprehensive full-stack web application designed to streamline operations for racket sports clubs (badminton, tennis, padel, squash, table tennis) and enhance player engagement. It provides a central platform for session scheduling, dynamic player ranking, match organization, member profiles, and administrative tasks. The system supports robust role-based access control, multi-club management, and a 2-plan freemium model. Its vision is to be the leading platform for racket sports clubs globally, significantly improving club efficiency and player satisfaction.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
The application uses React 18, TypeScript, Wouter, TanStack React Query, Tailwind CSS, and shadcn/ui for the frontend. The backend is built with Node.js, Express.js, and TypeScript, utilizing PostgreSQL as the database with Drizzle ORM.

### Plan & Billing System
A 2-plan freemium model (Basic FREE, Premium) is implemented with backend enforcement and frontend gating for premium features. Key features like rankings, analytics, advanced management tools, internal messaging, helpdesk tickets, coach directory, league management, recognition cards, attendance analytics, and financial tools are exclusive to the Premium plan.

### UI/UX Decisions
The UI features a modern design with privacy-enhanced public views and comprehensive player profiles. A sophisticated Premium Theme System offers 64 themes across 7 tiers plus 5 Branded Collections and a Premium Collections category, many optimized for AMOLED displays with unique animations and design tokens. The Liquid Glass theme provides translucent frosted panels with liquid reflections, soft edge glow, and fluid depth, applying glassmorphism to all UI elements including match cards. Theme access is tier-gated by club ranking, special Black Card access, Metallic Comet Card ownership, or Royal Duty Card ownership. All dark themes feature enhanced visual variety with ambient lighting, radial gradient overlays, reflective card surfaces, and textured elements. A global Ultra-Premium Transparent Glass UI system applies to all dark themes, providing true glassmorphism cards with backdrop-filter blur, neo-tactile button animations, premium CTA gradient buttons, sport-engraved racket string texture overlays, and glass-treated dialogs/sidebars/inputs/tables. Typography Studio allows font customization with 20 fonts across 5 categories, with access tiered by plan and card ownership.

### Technical Implementations
- **Role-Based Access Control (RBAC)**: Granular permissions at platform and club levels. Club-level admins (users with OWNER/ADMIN clubRole in `player_profiles`) get their own "Club Admin" sidebar section and can access admin pages scoped to their clubs only. Backend uses `isAnyClubAdmin()` for access gating and `getUserAdminClubIds()` for data scoping. Platform-only actions (user approval/rejection) remain restricted to platform OWNER/ADMIN.
- **Multi-Club Support**: Manages multiple independent clubs with separate data and administration.
- **Multi-Sport Support**: The platform supports multiple racket sports.
- **Match Management**: Includes a visual court component, queuing system, and a deterministic Smart Match Engine with gender-aware logic and 9-tier grade-based scoring. The BPG Competitive Balance Engine ensures balanced play, and the Session Fairness Command Center provides player intelligence and session analytics.
- **Membership System**: Handles club-based memberships, plans, requests, and approvals.
- **Dynamic Leaderboard System**: Computes player rankings from completed matches.
- **Financial Intelligence System**: Multi-view financial dashboard with Smart Insights, credit management, donation system, and per-session invoice number tracking.
- **Admin & Player Management**: Tools for comprehensive user, club, venue, and administrator management.
- **Recurring Events System**: Facilitates single or recurring session creation with scheduled publishing and flexible editing/deletion options.
- **Session Player Management**: Enhanced in-session controls with a four-state participant system.
- **Session Match Recovery**: Allows recovery of soft-deleted (archived) matches.
- **Coach Directory & Marketplace**: Manages and lists public coach profiles with interactive map.
- **Coach Finder & Lesson Booking**: In-app private lesson request system. Players can request lessons from coaches (date, time, duration, type, location, message). Coaches accept/decline with response message and agreed price. Both parties manage requests via `/my-lessons` page. Status lifecycle: PENDING → ACCEPTED/DECLINED/CANCELLED → COMPLETED. Schema: `lessonRequests` table. Routes: `/api/lesson-requests/*`.
- **Global Account Merge System**: Tool for merging duplicate user accounts (OWNER-only).
- **IT Helpdesk Ticketing System**: Secure, ticket-based support system with RBAC, enhanced with a credit claim workflow.
- **Automatic Player Grading System**: 9-tier skill grading with automatic promotion/demotion.
- **Club-Scoped Referral System**: Independent referral programs per club.
- **Junior Management**: Comprehensive features for managing junior players, including skill tracking, exercise challenges, and parent-facing dashboards.
- **League Management System**: Full league fixture and results management, including Player Selection Notifications and Squad Management.
- **Payment & Credit Request System**: Players can confirm payments and request credits in-app, with an enhanced credit wallet and automation settings.
- **Internal Messaging System**: Chat interface with message categories and filtering.
- **AI-Powered Reporting**: AI-generated reports for coaches, parents, and admins.
- **Enhanced Badge Count System**: Sidebar badges for various notifications and pending items.
- **Social Media Links System**: Clubs can add and display social media links for 11 platforms.
- **Sidebar Hide/Lock System**: Collapsible sidebar with optional PIN protection.
- **Premium Recognition Cards System**: Admin-gifted recognition cards with 3D flippable RPG-style display, unlocking exclusive theme tiers.
- **Mobile Bottom Navigation System**: Mobile-only fixed bottom bar with customizable shortcut icons.
- **Announcement Reactions & Comments**: Users can react to announcements with emoji reactions and leave threaded comments.
- **Player Intelligence & Analytics System**: Available to players with an active annual club membership (and admins/owners). Offers comprehensive player analytics dashboard, interactive charts, AI Comparison Review, achievement badges, skill review system, coach notes timeline, AI-powered player style analysis, and Match Log/Development tabs. Access gated via `hasActiveAnnualMembership` flag from `/api/auth/me` (checks `clubMemberships` table for ACTIVE status with non-expired end date). Coach review requests auto-create a helpdesk ticket and send an internal message from the player to the OWNER.
- **Session Intelligence Layer**: Provides pre-session balance prediction, post-session engagement scores, and smart session recommendations.
- **AI Full Session Schedule Generator**: One-click full session schedule generation using the match engine with fairness optimization, preview functionality, and an AI Session Designer for optimal session structure suggestions.
- **Payment Flow Enhancement**: Session signup includes payment method selection, a Payment Verification Dashboard, and a Payment Reliability Score for players.
- **Session Financial Command Center**: Real-time financial overview per session with expected vs actual revenue comparison, per-player financial actions, payment reminders, and credit issuance.
- **3D Avatar Selection System**: Users can select AI-generated Pixar-style 3D avatar presets.
- **Match Engine Testing Lab**: Admin-only sandbox for stress-testing the matchmaking algorithm with simulated players and comprehensive analytics.
- **Advanced Analytics Dashboard**: Power BI-level business intelligence system at `/dashboard/analytics`. Two views: **Interactive Performance Dashboard** (default) with unified global filter state — a single `MultiFilter` object (playerIds, sessionTitles, clubIds, months, weekdays, timeOfDay, dateFrom, dateTo) drives ALL components (KPI cards, charts, tables, AI insights). Period controls (Year/Month/Week/Day) act as chart grouping selectors that also clear drill-down date filters when switched. Cross-filtering by clicking any chart bar (player/session/club/weekday) updates KPIs, all charts, tables, and AI context simultaneously. Drill-down (clicking master chart bars) applies date range filters scoped to the clicked period. KPI cards always compute from the active filtered dataset with strikethrough totals showing unfiltered values. 6 toggleable chart metrics (players, revenue, sessions, fill rate, no-shows, rev/player), player analysis table with click-to-filter, session details table, player profile cards, fullscreen mode, and context-aware AI insights. **Classic view** with 10 KPI cards, 12+ charts, session table, smart alerts, and AI report. Only uses COMPLETED sessions. Revenue in £ GBP (pence converted for AI). Routes: `/api/dashboard/analytics` (GET), `/api/dashboard/analytics/ai-insights` (POST). Access: OWNER only via God Mode. Key files: `client/src/pages/AnalyticsDashboard.tsx`, `client/src/components/InteractiveDashboard.tsx`, `server/routes.ts`.

## External Dependencies

### Database
- **PostgreSQL**: Primary relational database.

### Authentication
- **express-session**: For managing user sessions.
- **passport / passport-local**: User authentication framework.

### Frontend Libraries
- **@tanstack/react-query**: Server state management.
- **date-fns**: Date manipulation.
- **recharts**: For charts and data visualizations.
- **framer-motion**: Animation library for premium UI components.

### Build & Development Tools
- **Vite**: Frontend build tool.
- **esbuild**: Backend bundling.

### Progressive Web App (PWA)
- **Web App Manifest**: Defines PWA properties.
- **Service Worker**: Implements network-first caching strategy.

### APIs / Integrations
- **OpenStreetMap Nominatim API**: Geocoding addresses.
- **Google Calendar**: Integration for importing calendar events.
- **Badminton England**: Player insurance information.

### Trial Onboarding & Evaluation System
- **Database Tables**: `trial_players` (tracks trial lifecycle: PENDING → SCHEDULED → ATTENDED → EVALUATED → APPROVED/REDIRECTED/REJECTED), `trial_evaluations` (5-category scoring: technical, tactical, movement, awareness, communication)
- **Registration**: "Are you joining as a Trial Player?" toggle on registration form with self-assessed level, experience, preferred days, and club selection. Referral IDs auto-linked.
- **Trial Dashboard** (`/trial-dashboard`): Player-facing 6-stage visual progress tracker, session details, evaluation results, admin messages, and Join Club confirmation button on approval.
- **Admin Trial Command Center** (`/admin/trials`): Full management dashboard with filterable/sortable trial player table, session assignment modal with AI recommendations, evaluation panel with 5x 1-10 scoring sliders, auto-calculated overall scores with recommendation thresholds (8-10: Club membership, 5-7: BPG training, <5: Not suitable), final decision workflow, and referral conversion funnel analytics.
- **Access Control**: Trial players are restricted to Trial Dashboard and Notifications only. PrivateRoute checks `/api/trial-players/me` and redirects non-approved trial players. Sidebar and BottomNavBar show limited navigation.
- **Automated Notifications**: Status change notifications at every stage (registration, scheduled, attended, evaluated, decision).
- **Trial Approval Auto-Credit**: On approval, £4 welcome credit is automatically added to the player's wallet (idempotent — only once per trial). A congratulatory internal message is sent from the OWNER with credit details, session fee info, and annual membership benefits.
- **Direct Approval**: Admins can approve/redirect/reject trials from any status without requiring session assignment first.
- **Key Files**: `shared/schema.ts` (trialPlayers, trialEvaluations), `server/storage.ts` (trial CRUD), `server/routes.ts` (trial API endpoints), `client/src/pages/TrialDashboard.tsx`, `client/src/pages/admin/TrialManagement.tsx`, `client/src/pages/auth/Register.tsx`

### Rivalry Arena (Player Comparison)
- **Component**: `client/src/components/RivalryArena.tsx` — Replaces old ComparisonView in PlayerIntelligence
- **Features**: Badminton court background, gender-specific athletic silhouette avatars (male/female SVGs with layered shadow + glow), animated count-up scoreboard, rivalry strength indicator (Dominant/Competitive/Close), animated win ratio rings, match timeline with connected cards, momentum line graph (cumulative wins over time), AI rivalry analysis
- **Integration**: Used in `client/src/pages/PlayerIntelligence.tsx` when Compare Players mode is active
- **Data**: Uses existing `/api/players/analytics/compare`, `/api/players/analytics/head-to-head`, and `/api/players/analytics/ai-comparison` endpoints (no backend changes)