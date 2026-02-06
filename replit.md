# Club Master - Badminton Club Management System

## Overview
Club Master is a full-stack web application designed for comprehensive badminton club management. It offers functionalities such as session scheduling, a player ranking system utilizing Elo ratings, match organization, member profile management, and administrative tools. The platform supports a robust role-based access control system for various user roles including Owner, Admin, Organiser, Coach, and Player, ensuring secure and differentiated access to features. The project aims to streamline club operations, enhance player engagement through competitive rankings, and provide a centralized platform for all club-related activities.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React 18 and TypeScript, using Wouter for routing and TanStack React Query for server state management. Styling is handled by Tailwind CSS, augmented with shadcn/ui components (New York style) and CSS variables for theming. Form handling is managed with React Hook Form, incorporating Zod for validation. Vite is used as the build tool, configured with path aliases.

### Backend
The backend runs on Node.js with Express.js, developed in TypeScript using ES modules. Authentication is implemented with Passport.js (local strategy) and `express-session` for session management. Passwords are hashed using Node.js's native crypto module (scrypt). The API follows a RESTful design, with endpoints defined in `shared/routes.ts` utilizing Zod schemas for type-safe contracts.

### Data Storage
PostgreSQL serves as the primary database, managed by Drizzle ORM. `drizzle-zod` is used for integrating Zod validation with Drizzle schemas. Session persistence is achieved through `connect-pg-simple`, storing sessions in PostgreSQL. The database schema, including all table definitions and relations, is centrally located in `shared/schema.ts`.

### Project Structure and Key Design Patterns
The project structure separates concerns into `client/`, `server/`, and `shared/` directories.
Key design patterns include:
- **Shared Types**: Centralized schema and route definitions in `shared/` ensure type safety across the entire application.
- **Storage Abstraction**: An `IStorage` interface abstracts database operations, promoting modularity.
- **API Contracts**: API routes are defined with clear method, path, input, and response schemas for robust, type-safe communication.
- **Role-Based Access Control**: Centralized RBAC system in `server/rbac.ts` with `canPerform(user, action, clubId)` function and action enum (VIEW_CLUB, MANAGE_CLUB, MANAGE_SESSIONS, MANAGE_TOURNAMENTS, etc.). Platform-level OWNER role gets automatic bypass for all actions without needing club membership. Club-level roles (`ADMIN`, `ORGANISER`, `COACH`, `PLAYER`) require APPROVED membership status. Super admins are blocked from joining clubs (403) as they have automatic full access. Comprehensive RBAC logging via `log_rbac()` tracks all permission checks.
- **Multi-Club Support**: The system inherently supports multiple badminton clubs, with club-specific player profiles and administrative capabilities. Clubs undergo an approval workflow (PENDING to APPROVED) by a super admin.
- **Match Management**: Features a visual court component, match lifecycle (QUEUED, LIVE, COMPLETED), a queuing system, and auto-generation capabilities.
- **Membership System**: Manages club membership status (PENDING, APPROVED, REJECTED), allows users to join clubs, and provides an admin panel for membership requests and role assignments.
- **Venue Management**: Enables clubs to manage multiple venues, linking sessions to specific locations, with CRUD operations for venues. Club admins (OWNER or ADMIN club role) can add and manage venues for their clubs. Super admins see all venues across all clubs.
- **Public Viewing System**: Comprehensive public landing page at `/` accessible without login. Features:
  - Hero section with "Get Started" CTA
  - Club directory with search/filter by name/city/postcode and list/map toggle (reuses ClubMap component with Leaflet)
  - All sessions from all clubs via `/api/public/all-sessions` endpoint with live match counts, queued matches, and recent results
  - Live sessions section showing matches in progress with scores, queued games, and recent results
  - Per-club leaderboard with club selector buttons
  - Session cards link to `/public/session/:id` for detailed live view with players, courts, and match status
  - Player rankings start at 0 points (default) and category D, building up through match wins
  - All data sanitized to exclude sensitive user info (email, password)
  - Separate dedicated pages: `/explore/clubs`, `/explore/sessions`, `/explore/rankings`
  - Shared `PublicLayout` component (client/src/components/layout/PublicLayout.tsx) provides consistent navigation across all public pages
  - Login page includes "Back to Home" link
  - PublicRoute wrapper uses PublicLayout for non-logged-in users (consistent nav on /public/session/:id etc.)
- **Personal Ranking View**: Offers logged-in users a personalized view of their ranking progress and match history.
- **Super Admin Player Management**: OWNER role users can manage all players across all clubs through `/admin/players`. Features include:
  - Club selector to view players from any club (including pending/inactive clubs)
  - Bulk actions: suspend, archive, activate, or delete multiple players at once
  - Individual player actions via dropdown menu
  - Player status management (ACTIVE, SUSPENDED, ARCHIVED)
  - Cross-club player allocation to add players to multiple clubs
  - Club customization: edit club name and logo URL
- **Admin Panel Access Control**: The entire Admin Panel (`/admin/*`) is restricted to OWNER role only. Regular ADMINs cannot access super admin functions.
- **Club Admin Management**: Super admins can manage all club administrators through `/admin/club-admins`. Features include:
  - View all admins across all clubs with club filtering
  - Add new admins by email to any club
  - Change club roles (OWNER, ADMIN, ORGANISER, COACH, PLAYER)
  - Role hierarchy: OWNER (full access) > ADMIN (club management) > ORGANISER/COACH (session management) > PLAYER (basic)
  - Permission checks require APPROVED membership status for club-level access
  - Venues navigation in sidebar/mobile nav only visible to users with actual admin access
- **Club Equipment & Skill Settings**: Clubs can specify:
  - Shuttlecock type: feather, plastic, or both
  - Whether they provide club T-shirts
  - Accepted player skill levels: beginner, intermediate, advanced, pro, all
- **Session Fee Management**: Sessions can have custom fees that override club defaults. Session cards display the fee (in £) and shuttlecock type so players know before joining. Financials are displayed in British Pounds (£).
- **Clubs Management (Super Admin)**: Dedicated page at `/admin/clubs-management` for super admins to manage all clubs from a centralized interface. Features:
  - Club list view with status badges (PENDING, APPROVED, REJECTED)
  - Per-club detail view with Members, Sessions, and Venues tabs
  - Members tab: view/edit membership status and club roles
  - Sessions tab: inline editing, individual and bulk deletion with checkbox selection
  - Venues tab: read-only view of venues and court names
- **Bulk Session Selection & Deletion**: Sessions page (`/sessions`) supports checkbox selection for organiser+ roles. Includes select-all, selected count badge, and bulk delete with confirmation dialog.
- **Venue Access for Club Admins**: Venues page (`/admin/venues`) is accessible to club admins (not just super admins), filtered to show only clubs the user has admin access to.
- **Session Player Management**: Enhanced player controls within sessions at `/sessions/:id`:
  - Gender override: quick swap between MALE/FEMALE per session (stored in session_signups.genderOverride, doesn't change profile)
  - Pause/Resume: temporarily exclude players from new match generation (session_signups.isPaused)
  - Player pairing: group two players to always play together (session_signups.pairGroupId with color-coded badges)
  - Guest player creation: add players not in the system (creates user + profile + signup in one action)
  - Single-page vertical layout: header → matches/courts → player management section (no tabs)
  - API endpoints: PATCH .../gender, PATCH .../pause, PATCH .../pair, POST .../guest-player
  - All endpoints enforce RBAC (MANAGE_SESSIONS permission required)
- **Tournament System**: Database tables preserved (tournaments, tournament_categories, tournament_teams, tournament_matches, tournament_standings) but UI/routes/hooks removed. Can be re-enabled in future.

## External Dependencies

### Database
- **PostgreSQL**: Core relational database.
- **Drizzle Kit**: Used for database schema migrations.

### Authentication
- **express-session**: For managing user sessions.
- **connect-pg-simple**: PostgreSQL store for session data.
- **passport / passport-local**: User authentication framework.

### Frontend Libraries
- **@tanstack/react-query**: For efficient server state management and data fetching.
- **date-fns**: Utility library for date manipulation and formatting.
- **recharts**: For rendering charts and data visualizations.
- **Radix UI primitives**: Provides accessible, unstyled components that `shadcn/ui` builds upon.

### Build & Development Tools
- **Vite**: Frontend build tool with hot module replacement.
- **esbuild**: Used for bundling the backend for production.
- **tsx**: For running TypeScript files directly in development.

### APIs / Integrations
- **OpenStreetMap Nominatim API**: Used for geocoding addresses to coordinates for club locations.
- **Google Calendar**: Integration for importing calendar events as sessions.