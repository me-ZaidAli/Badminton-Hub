# SmashClub - Badminton Club Management System

## Overview

SmashClub is a full-stack web application for managing badminton club operations. It provides session scheduling, player rankings using an Elo rating system, match management, member profiles, and administrative tools. The platform supports different user roles (Owner, Admin, Organiser, Coach, Player) with role-based access control.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with CSS variables for theming, shadcn/ui component library (New York style)
- **Form Handling**: React Hook Form with Zod validation via @hookform/resolvers
- **Build Tool**: Vite with path aliases (@/ for client/src, @shared/ for shared)

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy, express-session for session management
- **Password Hashing**: Node.js crypto module (scrypt)
- **API Design**: REST endpoints defined in shared/routes.ts with Zod schemas for type-safe contracts

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation integration
- **Session Store**: connect-pg-simple for persistent sessions in PostgreSQL
- **Schema Location**: shared/schema.ts contains all table definitions and relations

### Project Structure
```
client/           # React frontend
  src/
    components/   # UI components (shadcn/ui based)
    hooks/        # Custom React hooks for data fetching
    pages/        # Route components
    lib/          # Utilities (queryClient, utils)
server/           # Express backend
  auth.ts         # Passport authentication setup
  db.ts           # Database connection
  routes.ts       # API route handlers
  storage.ts      # Data access layer
shared/           # Shared between client and server
  schema.ts       # Drizzle database schema
  routes.ts       # API contract definitions with Zod
```

### Key Design Patterns
- **Shared Types**: Schema and route definitions in shared/ folder ensure type safety across client and server
- **Storage Abstraction**: IStorage interface in storage.ts abstracts database operations
- **API Contracts**: Routes defined with method, path, input schema, and response schemas enable type-safe API calls
- **Role-Based Access**: User roles control access to admin features and certain operations

### Database Schema
Core entities:
- **users**: Authentication and profile info with role-based permissions
- **playerProfiles**: Player-specific data (ranking points, category, gender, membership)
- **sessions**: Scheduled badminton sessions with capacity limits
- **sessionSignups**: Player registrations for sessions with payment/attendance tracking
- **matches**: Individual games with scores and player assignments
- **announcements**: Club communications with visibility controls
- **memberships**: Membership tiers with session rates

## Recent Changes

### Multi-Club Support (Feb 2026)
- Added `clubs` table to support multiple badminton clubs
- Player profiles are now club-specific - one user can have different profiles for different clubs
- Public leaderboard at `/rankings` accessible without login with club filter dropdown
- Club selection during registration - new users must select which club to join
- Admin club management page at `/admin/clubs` for creating and managing clubs (OWNER/ADMIN only)
- All sessions, memberships, and player profiles are linked to specific clubs

### Google Calendar Integration (Feb 2026)
- Added Google Calendar connection via Replit integration
- New admin page at `/admin/calendar` for importing calendar events as sessions
- Admins can select a calendar, preview upcoming events, and import selected events with configurable session settings (max players, courts, match mode)
- Backend endpoints with role-based access control (OWNER/ADMIN/ORGANISER only)

### User Club Creation (Feb 2026)
- Any authenticated user can create their own badminton club via POST /api/clubs
- Club creators become the owner (tracked via `clubs.ownerId` field)
- Auto-generates unique URL slug from club name (with suffix if duplicate)
- Auto-creates player profile for owner in new club
- Club owners have admin access to manage their clubs (sessions, matches, players) via `hasAdminAccess` helper
- "Create Club" page at `/create-club` with form validation
- "Start Your Own Club" card on Dashboard linking to creation page

### Match Management System (Feb 2026)
- Visual badminton court component displaying 2v2 player positions with court markings
- Match lifecycle: QUEUED → LIVE (with timer) → COMPLETED (archived)
- Live match timer showing elapsed time (minutes:seconds) calculated from startedAt timestamp
- Match queue system supporting up to 8 queued matches with dynamic court assignment (max 10 courts)
- Auto-generate matches feature with configurable court count and match quantity
- Player swap functionality via dropdown for both queued and live matches
- Auto-progression: when completing a match, the next queued match automatically moves to the freed court
- Match completion flow with score entry dialog and automatic archiving
- API endpoints: POST /api/matches/:id/start, /api/matches/:id/complete, /api/matches/:id/swap-player
- Role-based access: Match management restricted to OWNER/ADMIN/ORGANISER roles OR club owners

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via DATABASE_URL environment variable
- **Drizzle Kit**: Database migrations via `npm run db:push`

### Authentication
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store
- **passport / passport-local**: Username/password authentication

### Frontend Libraries
- **@tanstack/react-query**: Server state management and caching
- **date-fns**: Date formatting and manipulation
- **recharts**: Data visualization for player stats (noted in requirements)
- **Radix UI primitives**: Accessible component primitives for shadcn/ui

### Build & Development
- **Vite**: Frontend bundling with HMR
- **esbuild**: Server bundling for production
- **tsx**: TypeScript execution for development

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption (defaults to "secret" in development)