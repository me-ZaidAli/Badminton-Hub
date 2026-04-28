# Club Master - Racket Sports Club Management Platform

## Overview
Club Master is a comprehensive full-stack web application designed to streamline operations for racket sports clubs (badminton, tennis, padel, squash, table tennis) and enhance player engagement. It provides a central platform for session scheduling, dynamic player ranking, match organization, member profiles, and administrative tasks. The system supports robust role-based access control, multi-club management, and a 2-plan freemium model. Its vision is to be the leading platform for racket sports clubs globally, significantly improving club efficiency and player satisfaction.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
The application uses React 18, TypeScript, Wouter, TanStack React Query, Tailwind CSS, and shadcn/ui for the frontend. The backend is built with Node.js, Express.js, and TypeScript, utilizing PostgreSQL as the database with Drizzle ORM.

### UI/UX Decisions
The UI features a modern design with privacy-enhanced public views, comprehensive player profiles, and a sophisticated Premium Theme System offering 64 themes across 7 tiers, 5 Branded Collections, and a Premium Collections category, many optimized for AMOLED displays. Dark themes include enhanced visual variety, a global Ultra-Premium Transparent Glass UI system, neo-tactile button animations, premium CTA gradient buttons, sport-engraved racket string texture overlays, and glass-treated dialogs/sidebars/inputs/tables. Mobile navigation uses a fixed bottom bar with customizable shortcut icons.

### Technical Implementations
- **Freemium Model**: A 2-plan freemium model (Basic FREE, Premium) with backend enforcement and frontend gating.
- **Role-Based Access Control (RBAC)**: Granular permissions at platform and club levels.
- **Multi-Club & Multi-Sport Support**: Manages multiple independent clubs and supports various racket sports.
- **Match Management**: Includes a visual court component, queuing system, and a deterministic Smart Match Engine v6 with multi-mode matchmaking, gender-aware logic, and 9-tier grade-based scoring, enhanced by the BPG Competitive Balance Engine and Session Fairness Command Center.
- **Membership & Leaderboard Systems**: Handles club-based memberships, plans, requests, approvals, and computes dynamic player rankings.
- **Financial Intelligence System**: Multi-view financial dashboard with Smart Insights, credit management, donation system, and per-session invoice tracking.
- **Admin & Player Management**: Tools for comprehensive user, club, venue, and administrator management.
- **Recurring Events System**: Facilitates single or recurring session creation with scheduled publishing.
- **Session Player Management**: Enhanced in-session controls with a four-state participant system, supporting optional hall and court names.
- **Session Availability Notifications**: Automatic in-app, chat, and email notifications for session spaces.
- **Team Events System**: Club-scoped team events with full CRUD, signup/withdraw flow.
- **Coach Directory & Lesson Booking**: Manages public coach profiles, an interactive map, and an in-app private lesson request system.
- **Global Account Merge System**: Tool for merging duplicate user accounts (OWNER-only).
- **IT Helpdesk Ticketing System**: Secure, ticket-based support with RBAC and credit claim workflow.
- **Automatic Player Grading System**: 9-tier skill grading with automatic promotion/demotion.
- **Club-Scoped Referral System**: Independent referral programs per club.
- **Junior Management**: Features for managing junior players, skill tracking, exercise challenges, and parent dashboards.
- **League Management System**: Full league fixture and results management, including Player Selection Notifications and Squad Management.
- **Payment & Credit Request System**: Players can confirm payments and request credits in-app, with an enhanced credit wallet and automation settings, including Payment Verification Dashboard and Payment Reliability Score.
- **Internal Messaging System**: Chat interface with message categories and filtering.
- **AI-Powered Reporting**: AI-generated reports for coaches, parents, and admins.
- **Player Intelligence & Analytics System**: Comprehensive player analytics dashboard, interactive charts, AI Comparison Review, achievement badges, skill review system, coach notes timeline, AI-powered player style analysis, and Match Log/Development tabs.
- **Session Intelligence Layer**: Provides pre-session balance prediction, post-session engagement scores, and smart session recommendations.
- **AI Full Session Schedule Generator**: One-click full session schedule generation using the match engine with fairness optimization, preview functionality, and an AI Session Designer.
- **Session Financial Command Center**: Real-time financial overview per session with expected vs actual revenue comparison, per-player financial actions, payment reminders, and credit issuance.
- **3D Avatar Selection System**: Users can select AI-generated Pixar-style 3D avatar presets.
- **Match Engine Testing Lab**: Admin-only sandbox for stress-testing the matchmaking algorithm with simulated players and comprehensive analytics.
- **Advanced Analytics Dashboard**: Power BI-level business intelligence system with Interactive Performance Dashboard, a Command Center, and a Classic view.
- **Trial Onboarding & Evaluation System**: Manages trial players from registration to approval with a dedicated dashboard, admin command center, and automated notifications.
- **Rivalry Arena**: Player comparison component with a badminton court background, gender-specific avatars, animated scoreboard, rivalry strength indicator, win ratio rings, match timeline, momentum line graph, and AI rivalry analysis.
- **Player Skills Analytics System**: League and Premium player skill tracking with enrollment management, per-player editable skill profiles, radar/bar charts, and audit history.
- **Tournaments Module**: Full tournament management with esports-style UI, supporting various tournament types, registration, group/knockout brackets, score submission, and standings, including named "stages" for grouping rounds.
- **Tiered Session Fees**: Sessions support 4 fee tiers (Standard, Premium, Super Premium, Club Member) with dedicated input fields and display in the UI.
- **Timeline UI Enhancements**: Real-time live/past/upcoming session status, hype indicators, animated capacity bars, glassmorphism dropdown panels, golden crown for top-ranked players, gradient dividers, and enriched match/player insights.
- **Club Merchandise System**: Premium merchandise shopping experience with category-based entry view, product listing with filters, card-flip animations, featured product hero cards, save/favourite functionality, and a structured order request form. Admin system with full CRUD for products and order management dashboard.
- **Community Hub System**: Social layer for clubs with events, food experiences, community feed, reviews, and admin moderation.
- **Performance & Reliability Hardening**: LRU-based rate limiting on auth and heavy AI endpoints; idempotent hot-path DB indexes; per-user in-memory cache on `/api/badge-counts`.
- **Notification Helper**: Unified `notifyUser()` wrapper creates an in-app notification and sends emails for high-priority types.
- **Deals & Offers System**: Premium mobile-first experience with category discovery, filtered deals view, featured deal card, glassmorphism card design with card-flip animation, save/favorite functionality, copy-code feedback, and smooth framer-motion animations. Dynamic category system with full CRUD for categories.
- **Admin Inbox**: Aggregator at `/admin/inbox` showing pending join requests, outstanding payments, credit requests, new merchandise orders, helpdesk tickets, incidents, in-flight trials, lesson requests, and pending referrals—all club-scoped.
- **Operational Hardening**: `X-Request-Id` middleware for traceability; `/api/health` returns uptime, `/api/health/ready` checks DB connection; SIGTERM/SIGINT handler drains in-flight requests.
- **Unified Sidebar Tiles**: Consistent rounded-xl tiles for side menu groups (Home, Activity, My Club, Communication, Design, Help & Info, Management, Super Admin).
- **Audit Log Viewer**: Admin page at `/admin/audit-log` with paginated, filterable view over `admin_audit_logs` table.
- **Inactive Members Bulk Delete**: OWNER-only bulk selection (per-row + per-page indeterminate header checkbox + "Select all filtered" across pages) and bulk action bar on `/admin/inactive-members`. Supports "Delete Selected" and "Delete All (filtered)" via `POST /api/admin/inactive-members/bulk-delete` with required reason; archives users (`accountStatus=REJECTED`, `closedAt`) and player profiles (`playerStatus=ARCHIVED`, `deletedAt`) and writes `PERMANENT_DELETE_BULK` audit rows per target. Self-account guard prevents accidental self-deletion.
- **Session Cancellation**: Admins can mark a session as cancelled, with UI indicators and notifications to affected participants, and the ability to reactivate. Cancelled sessions stay visible to admins/super admins across **all** view modes (Cards, Calendar mini, Timeline, Grouped) — each rendered with a large prominent "CANCELLED" banner (orange, uppercase, wide tracking, flanking Ban icons), greyed-out body via `grayscale-[0.7] opacity-80`, line-through title, and orange accent stripe; live glow / elite ring suppressed when cancelled.
- **UK Time Standard**: All event date/time inputs and displays are anchored to Europe/London (BST/GMT auto-aware) via `client/src/lib/uk-time.ts` (Intl-based, no library deps) and the friendly `UkDateTimePicker` component (date + time + ±15min controls + quick presets + UK BST/GMT label). Applied to League fixtures and Tournament startDate/endDate/registrationDeadline/group startTime/match scheduledTime — eliminates the previous bug where browser-local interpretation shifted entered times by 1 hour.

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

### AI Match Input System
- **GPT-4o vision**: Used for Image Upload & AI Vision OCR.

### APIs / Integrations
- **OpenStreetMap Nominatim API**: Geocoding addresses.
- **Google Calendar**: Integration for importing calendar events.
- **Badminton England**: Player insurance information.