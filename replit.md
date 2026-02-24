# Club Master - Badminton Club Management System

## Overview
Club Master is a comprehensive full-stack web application for managing badminton clubs. It aims to streamline club operations, enhance player engagement, and provide a central platform for session scheduling, dynamic player ranking, match organization, member profiles, and administrative tasks. The system supports robust role-based access control and multi-club management, enhancing efficiency for club owners and offering an engaging experience for players.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
The frontend uses React 18, TypeScript, Wouter for routing, TanStack React Query, Tailwind CSS, and shadcn/ui. The backend is built with Node.js, Express.js, and TypeScript, with PostgreSQL as the primary database, interfaced via Drizzle ORM.

### UI/UX Decisions
- Public views are privacy-enhanced, stripping gender data and allowing users to control public visibility and use nicknames.
- Player Profile Dashboard provides modern metrics with drill-down capabilities.
- An animated anniversary countdown card with a shaking present icon and progress bar is displayed on the profile page.

### Technical Implementations
- **Role-Based Access Control (RBAC)**: Granular permissions at platform (OWNER) and club (ADMIN, PLAYER) levels with club-scoped data access.
- **Multi-Club Support**: Manages multiple independent clubs, each with its own players and administration, supporting various lifecycle states.
- **Match Management**: Includes a visual court component, queuing system, Smart Match Engine (social/competitive), and controls for live match cancellation.
- **Membership System**: Manages club-based memberships, plans, requests, approvals, proration, and merchandise integration.
- **Dynamic Leaderboard System**: Computes player rankings dynamically from completed matches, offering club, session, and personal views.
- **Financial Dashboard & Credit System**: Provides financial oversight, tracking revenue, attendance, credit ledger, and outstanding payments.
- **Inventory & Expense Tracking System**: Manages club inventory, stock movements, and general expenses.
- **Admin & Player Management**: Tools for super admins and club admins for user, club, venue, and administrator management.
- **Recurring Events System**: Facilitates creation of single or recurring sessions with automated generation.
- **Scheduled Session Publishing**: Allows sessions to open for sign-ups at a future date.
- **Session Player Management**: Enhanced in-session controls for admins, including gender override, pausing, player pairing, and guest player creation.
- **Session Waiting List & Participant States**: Four-state participant system (Confirmed, Waiting List, Invited, Not Attending) with automatic waiting-list promotion.
- **Coach Directory & Marketplace**: Manages and publicly lists coach profiles.
- **God's Mode Dashboard**: OWNER-exclusive dashboard for global entity management, including account merging.
- **Public Viewing System**: Landing page for public access to club directories, sessions, live views, and leaderboards.
- **Internal Messaging System**: Chat interface for same-club members and super admins.
- **Account Management**: Supports registration, claiming, password resets, and self-service deletion.
- **Announcements System**: Allows admins/OWNERs to create and manage announcements.
- **Notifications Panel**: Dedicated notification center with categorized tabs.
- **Legal Policies System**: Manages in-app legal content, logs acceptance, and supports parental consent.
- **Player Profile Merging System**: Admin/OWNER-only wizard for merging duplicate player profiles.
- **IT Helpdesk Ticketing System**: Secure, ticket-based support system with full lifecycle management, RBAC, and audit logging.
- **Automatic Player Grading System**: 9-tier skill grading system with automatic promotion/demotion based on performance.
- **Club-Scoped Referral System**: Independent referral programs per club with configurable settings.
- **Acquisition Tracking System**: Mandatory "How did you hear about us?" field on registration.
- **KPI Analytics Dashboard**: Admin-only panel for acquisition and KPI analytics with various filters and export options.
- **Monthly Admin Summary Report**: Auto-generated report with growth overview and recommendations.
- **Automated Notification & Messaging System**: Comprehensive system for in-app, chat, and optional email notifications (e.g., payment reminders, membership expiration, anniversary rewards).
- **Admin Member KPI & Acquisition Editing**: Admins can edit member acquisition source and KPI fields.
- **Club Join Date & Duration Tracking**: Tracks when a member joined each club with a live duration counter.
- **Multi-Level Rewards System**: Framework supporting multi-level referral programs, session attendance milestone rewards, and a player reward ledger.
- **Attendance Analytics Dashboard**: Comprehensive attendance analytics with KPI cards, drill-downs, and various charts.
- **Inactive Members Management**: Dashboard for identifying and managing inactive members, including re-engagement and scheduled deletion.
- **Admin Player Rewards Viewer**: Allows admins to view player-specific rewards data.
- **Club Anniversary Rewards**: Per-club configurable anniversary reward settings with automated issuance.
- **League Management System**: Full league fixture and results management with player-facing and admin interfaces for teams, matches, player assignments, and score entry. Supports multiple named leagues (e.g., Birmingham Badminton League) per club with filtering by league, category, and division. Admin workflow includes opponent management (with venue details), club home venue configuration, and dropdown-based fixture creation with auto-filled venue based on home/away selection. Schema includes `leagueOpponents` table and `homeVenueName/homeVenueAddress/homeGoogleMapsUrl` fields on clubs.

## External Dependencies

### Database
- **PostgreSQL**: Primary relational database.
- **Drizzle Kit**: For database schema migrations.

### Authentication
- **express-session**: For managing user sessions.
- **connect-pg-simple**: PostgreSQL store for session data.
- **passport / passport-local**: User authentication framework.

### Frontend Libraries
- **@tanstack/react-query**: For server state management and data fetching.
- **date-fns**: Date manipulation and formatting.
- **recharts**: For charts and data visualizations.
- **Radix UI primitives**: Provides accessible, unstyled components.

### Build & Development Tools
- **Vite**: Frontend build tool.
- **esbuild**: Backend bundling for production.
- **tsx**: For running TypeScript files directly in development.

### APIs / Integrations
- **OpenStreetMap Nominatim API**: Geocoding addresses to coordinates.
- **Google Calendar**: Integration for importing calendar events as sessions.
- **Badminton England**: Player insurance information section on Profile page.