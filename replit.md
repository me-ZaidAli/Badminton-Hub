# SmashClub - Badminton Club Management System

## Overview
SmashClub is a full-stack web application designed for comprehensive badminton club management. It offers functionalities such as session scheduling, a player ranking system utilizing Elo ratings, match organization, member profile management, and administrative tools. The platform supports a robust role-based access control system for various user roles including Owner, Admin, Organiser, Coach, and Player, ensuring secure and differentiated access to features. The project aims to streamline club operations, enhance player engagement through competitive rankings, and provide a centralized platform for all club-related activities.

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
- **Role-Based Access Control**: Granular permissions based on user roles (`OWNER`, `ADMIN`, `PLAYER`, `ORGANISER`, `COACH`) govern access to features and data.
- **Multi-Club Support**: The system inherently supports multiple badminton clubs, with club-specific player profiles and administrative capabilities. Clubs undergo an approval workflow (PENDING to APPROVED) by a super admin.
- **Match Management**: Features a visual court component, match lifecycle (QUEUED, LIVE, COMPLETED), a queuing system, and auto-generation capabilities.
- **Membership System**: Manages club membership status (PENDING, APPROVED, REJECTED), allows users to join clubs, and provides an admin panel for membership requests and role assignments.
- **Venue Management**: Enables clubs to manage multiple venues, linking sessions to specific locations, with CRUD operations for venues.
- **Public Viewing System**: Provides public access to club information, upcoming sessions, and match details without requiring authentication, while safeguarding sensitive data.
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
- **Club Equipment & Skill Settings**: Clubs can specify:
  - Shuttlecock type: feather, plastic, or both
  - Whether they provide club T-shirts
  - Accepted player skill levels: beginner, intermediate, advanced, pro, all
- **Session Fee Management**: Sessions can have custom fees that override club defaults. Session cards display the fee (in £) and shuttlecock type so players know before joining. Financials are displayed in British Pounds (£).

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