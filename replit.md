# Club Master - Badminton Club Management System

## Overview
Club Master is a full-stack web application designed for comprehensive badminton club management. It offers session scheduling, a dynamic player ranking system (wins/losses/win%), match organization, member profile management, and administrative tools. The platform supports a robust role-based access control system for various user roles, streamlining club operations, enhancing player engagement, and providing a centralized hub for all club activities. The project aims to improve efficiency for club owners and provide an engaging experience for players.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React 18, TypeScript, Wouter for routing, and TanStack React Query for server state management. Styling utilizes Tailwind CSS with shadcn/ui components and CSS variables for theming. Form handling uses React Hook Form with Zod for validation. Vite is the build tool.

### Backend
The backend uses Node.js with Express.js, developed in TypeScript. Authentication is handled by Passport.js (local strategy) and `express-session`, with passwords hashed using Node.js's native crypto module. The API is RESTful, with type-safe contracts defined using Zod schemas.

### Data Storage
PostgreSQL is the primary database, managed by Drizzle ORM. `drizzle-zod` integrates Zod validation with Drizzle schemas. Session persistence uses `connect-pg-simple` for PostgreSQL storage.

### Project Structure and Key Design Patterns
The project is structured into `client/`, `server/`, and `shared/` directories.
Key design patterns include:
- **Shared Types**: Centralized schema and route definitions in `shared/` for type safety.
- **Storage Abstraction**: An `IStorage` interface abstracts database operations.
- **API Contracts**: Clear API route definitions with Zod schemas for type-safe communication.
- **Role-Based Access Control (RBAC)**: A centralized RBAC system (`server/rbac.ts`) with functions like `canPerform(user, action, clubId)` and an action enum. Supports platform-level OWNER and club-level roles (ADMIN, ORGANISER, COACH, PLAYER). Requires APPROVED club membership status for club-level access.
- **Multi-Club Support**: The system supports multiple badminton clubs, each with specific player profiles and administration. Clubs undergo an approval workflow.
- **Match Management**: Features a visual court component, match lifecycle (QUEUED, LIVE, COMPLETED), a queuing system, and auto-generation. Includes a **Smart Match Engine** (`server/matchEngine.ts`) with Social (round-robin) and Competitive (category-based) modes, female player matching rules, anti-repetition logic, and player pause replacement. Endpoint: POST `/api/sessions/:id/matches/smart-generate`.
- **Membership System**: Manages club membership status (PENDING, APPROVED, REJECTED) and allows users to join clubs.
- **Venue Management**: Enables clubs to manage multiple venues and link sessions to locations.
- **Public Viewing System**: A comprehensive public landing page accessible without login, featuring a club directory, public sessions, live session views, and club leaderboards. All sensitive user data is excluded.
- **Dynamic Leaderboard System**: All player rankings are computed dynamically from completed matches. Leaderboard shows wins, losses, and win percentage instead of static ranking points. Includes club leaderboard (`/api/leaderboard/:clubId`), session leaderboard (`/api/sessions/:id/leaderboard`), and personal ranking view. Players ranked by (1) matches won, (2) win percentage, (3) matches played.
- **Personal Ranking View**: Logged-in users can view their match results history and win/loss record.
- **Registration & Account Claiming**: New user registrations trigger in-app notifications to super admins. Users can "claim" pre-existing PENDING or guest accounts by setting a password.
- **Password Reset / Forgot Password**: Users request a reset via `/forgot-password`, generating a 24h token. OWNER users are notified and can view/copy reset links at `/admin/password-resets`. Users set a new password at `/reset-password/:token`. Endpoints: POST `/api/auth/forgot-password`, POST `/api/auth/reset-password`, GET `/api/admin/password-resets`.
- **Admin & Player Management**: Super admins have access to user approval panels with bulk actions, and can manage players across all clubs, including bulk actions for player status and cross-club allocation. Club admins can manage venues and administrators for their specific clubs.
- **Club Customization**: Clubs can define shuttlecock types, T-shirt provision, and accepted player skill levels. Sessions can have custom fees.
- **Session Player Management**: Enhanced in-session player controls include gender override, pause/resume functionality, player pairing, and guest player creation.
- **Coach Directory & Marketplace**: A system for coaches, including profiles, a public directory, a full directory for authenticated members, coach registration, and administrative management. Integrates a user suspension system.
- **Google Maps Integration**: Provides "Open in Google Maps" links for clubs and coaches, with fallbacks for coordinate-based links.
- **Search & Filtering**: Searchable club dropdowns and location-based filtering (postcode, city) for exploration pages.
- **Legal Policies System**: In-app legal content for Privacy Policy, Terms & Conditions, and Junior & Parental Consent Policy. Includes policy acceptance logging and support for junior accounts with parental consent.

## External Dependencies

### Database
- **PostgreSQL**: Core relational database.
- **Drizzle Kit**: For database schema migrations.

### Authentication
- **express-session**: For managing user sessions.
- **connect-pg-simple**: PostgreSQL store for session data.
- **passport / passport-local**: User authentication framework.

### Frontend Libraries
- **@tanstack/react-query**: For server state management and data fetching.
- **date-fns**: Date manipulation and formatting utility.
- **recharts**: For charts and data visualizations.
- **Radix UI primitives**: Provides accessible, unstyled components.

### Build & Development Tools
- **Vite**: Frontend build tool.
- **esbuild**: Backend bundling for production.
- **tsx**: For running TypeScript files directly in development.

### APIs / Integrations
- **OpenStreetMap Nominatim API**: Geocoding addresses to coordinates.
- **Google Calendar**: Integration for importing calendar events as sessions.