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
- Premium Black & Gold theme: selectable luxurious dark theme with deep matte black backgrounds, metallic gold accents (hue 43), gold-tinted borders/glows, custom scrollbars, and chat styling. Available in Display & Accessibility settings alongside other themes.
- Ultra-Premium Charcoal & Gold theme: elite charcoal black (hue 220/40) with realistic brushed metallic gold accents (hue 40), subtle crosshatch texture, inset card shadows, gradient gold dividers, slow hover transitions (0.45s), champagne-gold secondary text, increased heading letter-spacing, metallic gradient buttons/progress bars with specular highlights, and styled scrollbars/tables/modals.
- Green Glowing theme: futuristic neon green (hue 145) with deep dark backgrounds (hsl 150 10% 3%), semi-transparent glassmorphism cards (backdrop-filter blur), no visible border boxes, green gradient headings with slow shimmer animation, neon green glowing accents on icons/buttons/progress bars, custom green-gradient scrollbars, and styled chat/tables/dialogs. Stored as `green-glow` displayMode.

### Technical Implementations
- **Role-Based Access Control (RBAC)**: Granular permissions at platform (OWNER) and club (ADMIN, PLAYER) levels with club-scoped data access.
- **Multi-Club Support**: Manages multiple independent clubs, each with its own players and administration, supporting various lifecycle states.
- **Match Management**: Includes a visual court component, queuing system, deterministic Smart Match Engine (social/competitive) with 9-tier grade-based scoring (C3→A1), state invariants (player in one match only), atomic player movement, validation pipeline, scoring decision logging, and controls for live match cancellation. Dual view system: "Courts" (visual BadmintonCourt) and "Cards" (compact dark cards with futuristic rolling neon-green timer, expandable score entry dropdowns). View toggle in Match Management header. Session match counts computed from LIVE+COMPLETED matches displayed inline on player names. Crowd Control panel (admin-only dialog) with horizontal bar chart, fairness score, player-sorted list, and warnings for players with no games. Gender-aware match generation: when MIXED gender type and ≥4 females + ≥2 males available, allocates ~80% female-only match slots and ~20% mixed slots with male rotation tracking (-25 penalty per repeat) to ensure fair mixed game distribution. Fallback to any valid match type when female-only candidates exhausted. Mixed slot preference bonus (+30) steers remaining slots toward mixed compositions.
- **Membership System**: Manages club-based memberships, plans, requests, approvals, proration, and merchandise integration.
- **Dynamic Leaderboard System**: Computes player rankings dynamically from completed matches, offering club, session, and personal views.
- **Financial Dashboard & Credit System**: Provides financial oversight, tracking revenue, attendance, credit ledger, and outstanding payments. Includes independent "Manage Credits" section for directly adding credits, debits, or fixing balances on player profiles, linked across all financial views and personal profiles.
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
- **Admin Children Account Management**: Admins/owners can manage children (junior) accounts for any member via the UnifiedMemberEditDialog. Supports viewing assigned children, assigning existing junior accounts (with force-reassign confirmation for children already linked to another parent), creating new child accounts, and unassigning children. Backend endpoints under `/api/admin/users/:userId/children`.
- **Juniors Page**: Dedicated parent-facing page at `/juniors` with Hero banner, What We Do (6 feature cards), Pricing (3 plans: £15 group, £25 1-to-1, £8 matches), Safeguarding section, Junior Sessions listing (filters JUNIORS_ONLY sessions), and My Children management (CRUD via `/api/juniors`, club assignment). Sessions with `sessionType === "JUNIORS_ONLY"` are excluded from the regular Sessions page and only appear here. Sidebar item with Baby icon in activity group.
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