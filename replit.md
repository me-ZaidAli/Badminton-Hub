# Club Master - Badminton Club Management System

## Overview
Club Master is a comprehensive full-stack web application designed for managing badminton clubs. It aims to streamline club operations, improve player engagement, and provide a central platform for activities such as session scheduling, dynamic player ranking, match organization, member profiles, and administrative tasks. The system supports robust role-based access control and multi-club management, with the goal of enhancing efficiency for club owners and offering an engaging experience for players.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
The frontend utilizes React 18, TypeScript, Wouter for routing, and TanStack React Query. Styling is managed with Tailwind CSS and shadcn/ui. The backend is built with Node.js, Express.js, and TypeScript. PostgreSQL serves as the primary database, interfaced via Drizzle ORM.

### Key Features and Design Patterns
-   **Role-Based Access Control (RBAC)**: Implements granular permissions at both platform (OWNER) and club (ADMIN, PLAYER) levels, ensuring club-scoped data access.
-   **Multi-Club Support**: Allows management of multiple independent badminton clubs, each with its own players and administration, supporting various lifecycle states (PENDING, APPROVED, PAUSED, REJECTED, ARCHIVED).
-   **Match Management**: Features a visual court component, a queuing system, a Smart Match Engine for generating matches (social or competitive), and controls for live match cancellation and hard-stopping match generation.
-   **Membership System**: Comprehensive club-based membership management including plans, requests, approvals, proration, and merchandise integration. Plans support customizable durations and recalculation of end dates.
-   **Dynamic Leaderboard System**: Computes player rankings (wins, losses, win percentage) dynamically from completed matches, offering club, session, and personal views. Includes privacy features like blurred names for unregistered users and optional nicknames.
-   **Privacy-Enhanced Public Views**: Public session and ranking views strip gender data and allow users to control public visibility of their name using a `showPublicName` consent field and optional nicknames.
-   **Financial Dashboard & Credit System**: Provides financial oversight for admins, tracking revenue, attendance, a credit ledger with policy validation, and outstanding payments. Includes a detailed Memberships tab with revenue summaries and overdue alerts.
-   **Inventory & Expense Tracking System**: Manages club inventory, stock movements, and general expenses, integrating with financial reporting.
-   **Admin & Player Management**: Tools for super admins and club admins to manage users, clubs, venues, and other administrators, including bulk actions and account deletion.
-   **Recurring Events System**: Facilitates the creation of single or recurring sessions with automated generation based on frequency and date range, capped at 52 occurrences.
-   **Scheduled Session Publishing**: Allows sessions to be scheduled to open for sign-ups at a future date, with controls to prevent early player actions.
-   **Session Player Management**: Enhanced in-session controls for admins, including gender override, pause/resume, player pairing, guest player creation, and inline profile editing.
-   **Session Waiting List & Participant States**: Implements a four-state participant system (Confirmed, Waiting List, Invited, Not Attending) with player-controlled status management and automatic waiting-list promotion. Includes a finance panel for payment tracking.
-   **Coach Directory & Marketplace**: System for managing and publicly listing coach profiles.
-   **Player Profile Dashboard**: A modern dashboard displaying player metrics like credits, outstanding payments, performance stats, and session activity, with drill-down capabilities.
-   **God's Mode Dashboard**: An OWNER-exclusive dashboard providing unrestricted global access for managing all system entities, including advanced user management and a tool for merging duplicate accounts.
-   **Public Viewing System**: A landing page offering public access to club directories, sessions, live views, and leaderboards without requiring login.
-   **Internal Messaging System**: A chat interface for same-club members and super admins, featuring searchable contacts, read receipts, archiving, and conversation management.
-   **Club Member Management**: Tools for admins and super admins to manage club members directly, including filtering, bulk actions, and detailed user editing.
-   **Account Management**: Supports user registration, account claiming, password resets, and self-service account deletion. Includes a "Merge Duplicate Accounts" tool for God Mode.
-   **Announcements System**: Allows admins/OWNERs to create and manage announcements with rich content, optional images, and per-user archiving.
-   **Notifications Panel**: A dedicated notification center with categorized tabs, search, bulk actions, and unread indicators.
-   **Legal Policies System**: Manages in-app legal content, logs policy acceptance, and supports parental consent for junior accounts.
-   **Player Profile Merging System**: An admin/OWNER-only wizard for merging duplicate player profiles, handling data reassignments, deduplication, stat recalculations, and audit logging with transactional safety.
-   **IT Helpdesk Ticketing System**: A secure, ticket-based support system with full lifecycle management, category classification, priority levels, RBAC, confidential tickets, internal notes, and immutable audit logging. Includes integration for banning members.
-   **Automatic Player Grading System**: A 9-tier skill grading system with automatic promotion/demotion based on rolling session performance and customizable thresholds, with an admin override lock.
-   **Club-Scoped Referral System**: Each club has its own independent referral program with configurable settings (credit amount, premium/champion thresholds, code expiry days, active/inactive toggle) stored in `club_referral_settings` table. Referral codes are tagged to specific clubs, user dashboards show per-club progress with club-specific milestones, admin panel includes club-specific settings management and analytics (approval rates, credits issued), all notifications/messages include club context, and registration shows club name when validating referral codes.
-   **Acquisition Tracking System**: Mandatory "How did you hear about us?" field on registration with 10 selectable channels (Facebook, Instagram, TikTok, Website, Word of Mouth, Leisure Centre, Saw a Session, Through a Coach, Referral, Other). Auto-sets to Referral when code used. Stored at creation, locked from user edits.
-   **KPI Analytics Dashboard**: Admin-only Acquisition & KPI Analytics panel with signups per month, signups by channel, MoM growth, Premium conversion rate by channel, avg time to Premium, retention rate by channel (90-day threshold), avg active lifespan, referral effectiveness, organic ratio, and weighted Channel Quality Score. Includes date range, club, membership type, and source filters, plus CSV export.
-   **Monthly Admin Summary Report**: Auto-generated monthly report with growth overview, acquisition breakdown, Premium insights, retention insights, referral performance, and system-generated recommendations.
-   **Automated Notification & Messaging System**: Comprehensive automated messaging system delivering notifications via in-app, chat (internal messages), and optional email. Includes session payment reminders (configurable days before, on day, next day, daily until paid with bank details), membership expiration reminders (1 week, 3 days, on day, 5 days, 7 days after), referral code expiry reminders (2 days before, on day), yearly club joining anniversary notifications with GBP 16 credit reward, and instant ticket/message notifications. Features delivery tracking via `notification_logs` table, per-club configurable scheduling via `notification_schedule_settings` table, club bank details storage for payment reminders, admin UI for settings management, delivery log viewer, and notification stats dashboard. Scheduler runs hourly with deduplication via log-based and credit-ledger-based tracking.
-   **Admin Member KPI & Acquisition Editing**: Admins and super admins can edit member acquisition source (how they heard about the club) and KPI fields (ranking points, matches played, matches won) via the comprehensive member update endpoint. God's Mode control panel includes direct links to Acquisition & KPI Analytics and Notification Settings.
-   **Club Join Date & Duration Tracking**: `player_profiles` table includes `joinedAt` timestamp tracking when a member joined each club. Player dashboard and God's Mode member edit modal display a live duration counter (years, months, days, hours, minutes, seconds) since joining.
-   **Multi-Level Rewards System**: Comprehensive rewards framework with three database tables (`referral_programs`, `session_attendance_rewards`, `player_reward_ledger`) and two enums (`reward_type`, `reward_status`). Supports multi-level referral programs with JSONB levels array (referralsRequired, credits in pence, gifts, freeSessions, unlockDescription), session attendance milestone rewards with auto-issuance on attendance marking (repeating milestones), player reward ledger tracking all earned rewards with request/redemption workflow. Super Admin manages referral programs globally, club admins configure attendance rewards per club, players view/request rewards on profile page. All reward actions logged with [AUDIT] prefix. Credits automatically flow to credit_ledger for financial integration.
-   **Club Anniversary Rewards**: Per-club configurable anniversary reward settings stored in `club_anniversary_settings` table (credits in pence, gifts, custom message). Profile page displays an animated anniversary countdown card with shaking present icon, progress bar, and live countdown (months, days, hours). When anniversary day is reached, system auto-issues rewards (credits + gifts), creates credit ledger entry, sends notification, and sends internal message. Unified Club Rewards admin page (`/admin/rewards`) combines anniversary settings, attendance milestones, and referral programs in a tabbed layout. Super Admin has full unrestricted access to manage all club reward settings from God Mode panel.

## External Dependencies

### Database
-   **PostgreSQL**: Primary relational database.
-   **Drizzle Kit**: For database schema migrations.

### Authentication
-   **express-session**: For managing user sessions.
-   **connect-pg-simple**: PostgreSQL store for session data.
-   **passport / passport-local**: User authentication framework.

### Frontend Libraries
-   **@tanstack/react-query**: For server state management and data fetching.
-   **date-fns**: Date manipulation and formatting.
-   **recharts**: For charts and data visualizations.
-   **Radix UI primitives**: Provides accessible, unstyled components.

### Build & Development Tools
-   **Vite**: Frontend build tool.
-   **esbuild**: Backend bundling for production.
-   **tsx**: For running TypeScript files directly in development.

### APIs / Integrations
-   **OpenStreetMap Nominatim API**: Geocoding addresses to coordinates.
-   **Google Calendar**: Integration for importing calendar events as sessions.