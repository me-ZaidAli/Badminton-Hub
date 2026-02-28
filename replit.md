# Club Master - Badminton Club Management System

## Overview
Club Master is a comprehensive full-stack web application designed to streamline operations for badminton clubs and enhance player engagement. It provides a central platform for session scheduling, dynamic player ranking, match organization, member profiles, and administrative tasks. The system supports robust role-based access control and multi-club management, aiming to increase efficiency for club owners and offer an engaging experience for players.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
The application uses React 18, TypeScript, Wouter, TanStack React Query, Tailwind CSS, and shadcn/ui for the frontend. The backend is built with Node.js, Express.js, and TypeScript, utilizing PostgreSQL as the database with Drizzle ORM.

### UI/UX Decisions
The UI incorporates a privacy-enhanced public view, a modern player profile dashboard with drill-down metrics, and an animated anniversary countdown. The system offers several premium themes, including "Black & Gold," "Charcoal & Gold," and "Green Glowing," each with distinct color palettes, accents, and component stylings.

### Technical Implementations
- **Role-Based Access Control (RBAC)**: Granular permissions at platform and club levels.
- **Multi-Club Support**: Manages multiple independent clubs, each with its own data and administration.
- **Match Management**: Features a visual court component, queuing system, deterministic Smart Match Engine with 9-tier grade-based scoring, and a dual view system ("Courts" and "Cards"). Includes gender-aware match generation logic.
- **Membership System**: Handles club-based memberships, plans, requests, and approvals.
- **Dynamic Leaderboard System**: Computes player rankings dynamically from completed matches.
- **Financial Dashboard & Credit System**: Provides financial oversight, credit management, and a donation system.
- **Donation System**: In-app donation flow with status tracking and editable bank details.
- **Inventory & Expense Tracking**: Manages club inventory and general expenses.
- **Admin & Player Management**: Tools for user, club, venue, and administrator management.
- **Recurring Events System**: Facilitates single or recurring session creation with scheduled publishing.
- **Session Player Management**: Enhanced in-session controls for admins and a four-state participant system (Confirmed, Waiting List, Invited, Not Attending).
- **Coach Directory & Marketplace**: Manages and lists coach profiles publicly.
- **God's Mode Dashboard**: OWNER-exclusive dashboard for global entity management, including account merging.
- **Public Viewing System**: Landing page for public access to club information.
- **Internal Messaging System**: Chat interface for same-club members and super admins.
- **Account Management**: Supports registration, password resets, and self-service deletion.
- **Announcements System**: Allows admins/OWNERs to create and manage announcements.
- **Notifications Panel**: Dedicated notification center.
- **Legal Policies System**: Manages in-app legal content, acceptance logging, and parental consent.
- **User Guide**: Comprehensive tabbed guide for Player, Admin, and Owner roles, including a Junior Hub section.
- **Player Profile Merging System**: Admin/OWNER-only tool for merging duplicate profiles within a club.
- **Global Account Merge System**: OWNER-only tool for merging two user accounts across all clubs. Features a 5-step wizard (Search → Compare → Choose → Preview → Confirm) with cross-club profile merging, credit consolidation, match/session reassignment, OWNER account protection, and row-level locking for data integrity. Located in `GlobalMergeModal.tsx` with backend endpoints at `/api/admin/global-merge/*` and `/api/admin/global-users/search`.
- **IT Helpdesk Ticketing System**: Secure, ticket-based support system with RBAC.
- **Automatic Player Grading System**: 9-tier skill grading with automatic promotion/demotion.
- **Club-Scoped Referral System**: Independent referral programs per club.
- **Acquisition Tracking System**: Mandatory field on registration and a KPI analytics dashboard for admins.
- **Monthly Admin Summary Report**: Auto-generated report with growth overview.
- **Automated Notification & Messaging System**: Comprehensive system for in-app, chat, and optional email notifications.
- **Admin Member KPI & Acquisition Editing**: Admins can edit member acquisition source and KPI fields.
- **Club Join Date & Duration Tracking**: Tracks membership duration.
- **Multi-Level Rewards System**: Framework for referral programs, attendance milestones, and a player reward ledger.
- **Attendance Analytics Dashboard**: Comprehensive analytics with KPIs and drill-downs.
- **Inactive Members Management**: Dashboard for identifying and managing inactive members.
- **Club Anniversary Rewards**: Configurable anniversary reward settings with automated issuance.
- **Admin Children Account Management**: Admins/owners can manage junior accounts, including assignment, creation, and unassignment.
- **Juniors Page**: Consolidated parent-facing page with sections for My Children, Performance (embedded skill dashboard), Sessions (JUNIORS_ONLY), Fees, About, and Admin Management (for junior accounts).
- **League Management System**: Full league fixture and results management, supporting multiple named leagues per club with opponent and venue management.
- **Exercise Challenge & Training System**: Weekly progressive exercise challenges for junior players across various categories, with completion tracking and video embeds.
- **Junior Skill Development & Tracking System**: Full skill tracking system with 11 categories and 66 individual skills. Features an interactive dashboard with radar charts, skill progress, rankings, awards, and videos. Rankings are recalculated based on performance data.
- **Payment Confirmation System**: Players can confirm payments from their profile Outstanding Payments modal. Shows "I've Paid" button per session, asks for payment date and method, sets status to PENDING for admin verification, auto-creates support tickets, sends notifications and payment-category messages to admins.
- **Credit Request System**: Players can request credits applied to upcoming sessions from their Credit Balance modal. Validates club membership and credit balance, deducts from credit ledger, auto-creates tickets, sends payment reference in format "[Name], [Date], CR" to admins.
- **Message Categories**: Internal messages now have a `messageCategory` field (GENERAL, PAYMENT, SYSTEM). Payment-related messages from payment confirmations and credit requests are tagged as PAYMENT. Inbox shows category filter pills and payment badges on conversations and message bubbles. Payment reminders include profile confirmation prompt and are delayed until 24 hours after session.

## External Dependencies

### Database
- **PostgreSQL**: Primary relational database.
- **Drizzle Kit**: For database schema migrations.

### Authentication
- **express-session**: For managing user sessions.
- **connect-pg-simple**: PostgreSQL store for session data.
- **passport / passport-local**: User authentication framework.

### Frontend Libraries
- **@tanstack/react-query**: Server state management and data fetching.
- **date-fns**: Date manipulation and formatting.
- **recharts**: For charts and data visualizations.
- **Radix UI primitives**: Accessible, unstyled components.

### Build & Development Tools
- **Vite**: Frontend build tool.
- **esbuild**: Backend bundling for production.
- **tsx**: For running TypeScript files directly in development.

### APIs / Integrations
- **OpenStreetMap Nominatim API**: Geocoding addresses.
- **Google Calendar**: Integration for importing calendar events.
- **Badminton England**: Player insurance information section.