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
- **Role-Based Access Control (RBAC)**: A centralized RBAC system (`server/rbac.ts`) with functions like `canPerform(user, action, clubId)` and an action enum. Supports platform-level OWNER and club-level roles (ADMIN, ORGANISER, COACH, PLAYER). Requires APPROVED club membership status for club-level access. Admin panel access (`/admin/*` routes) requires OWNER, ADMIN role, or club-level admin access (club ownership or ADMIN/ORGANISER club role via `/api/my-admin-clubs`). AdminRoute in App.tsx uses `useMyAdminClubs` hook for access validation. Backend endpoints enforce club-scoped data access — `/api/users` returns only club-scoped users for non-OWNER/non-ADMIN users. Password management endpoints validate target user belongs to admin's clubs.
- **Multi-Club Support**: The system supports multiple badminton clubs, each with specific player profiles and administration. Clubs undergo an approval workflow.
- **Match Management**: Features a visual court component, match lifecycle (QUEUED, LIVE, COMPLETED), a queuing system, and auto-generation. Includes a **Smart Match Engine** (`server/matchEngine.ts`) with Social (round-robin) and Competitive (category-based) modes, female player matching rules, anti-repetition logic, and player pause replacement. Endpoint: POST `/api/sessions/:id/matches/smart-generate`.
- **Membership System**: Manages club membership status (PENDING, APPROVED, REJECTED) and allows users to join clubs.
- **Venue Management**: Enables clubs to manage multiple venues and link sessions to locations.
- **Public Viewing System**: A comprehensive public landing page accessible without login, featuring a club directory, public sessions, live session views, and club leaderboards. All sensitive user data is excluded.
- **Dynamic Leaderboard System**: All player rankings are computed dynamically from completed matches. Leaderboard shows wins, losses, and win percentage instead of static ranking points. Includes club leaderboard (`/api/leaderboard/:clubId`), session leaderboard (`/api/sessions/:id/leaderboard`), and personal ranking view. Players ranked by (1) matches won, (2) win percentage, (3) matches played.
- **All Rankings (Admin Only)**: A comprehensive admin-only rankings page at `/all-rankings` restricted to ADMIN and OWNER roles via `StrictAdminRoute`. Features advanced multi-criteria filter panel (country, city, sex, age group, grade, club, membership status, verified, match type, time period) with AND logic and instant updates. Includes player profile quick-view modal popup with in-place editing for admins. Backend endpoint `GET /api/admin/rankings` restricted to ADMIN/OWNER only, returns extended user fields (email, phone, country, city, membershipStatus, emailVerified, isJunior, createdAt). Public users see "Leaderboard" at `/explore/rankings` instead.
- **Personal Ranking View**: Logged-in users can view their match results history and win/loss record.
- **Registration & Account Claiming**: New user registrations trigger in-app notifications to super admins. Users can "claim" pre-existing PENDING or guest accounts by setting a password.
- **Password Reset / Forgot Password**: Users request a reset via `/forgot-password`, generating a 24h token. OWNER users are notified and can view/copy reset links at `/admin/password-resets`. Users set a new password at `/reset-password/:token`. Endpoints: POST `/api/auth/forgot-password`, POST `/api/auth/reset-password`, GET `/api/admin/password-resets`.
- **Financial Dashboard & Credit System**: Accessible to OWNER, ADMIN, and club owners/admins at `/admin/financials`. Features:
  - **Advanced Filter Bar**: Unified filter with date range picker, month quick-select, club selector, session type, match mode, smart search (session name/ID/player/club), and payment status. All filters auto-update instantly with no Apply button. Clear resets to current month + all clubs.
  - **Summary Cards**: Total Revenue, Collected, Outstanding, Collection Rate computed from filtered data.
  - **View Modes**: Session-grouped and player-grouped views with expandable rows.
  - **Attendance Status Controls**: Per-player dropdown with statuses: ATTENDED, NOT_ATTENDED, PARTIAL_ATTENDANCE, LATE_ARRIVAL, NO_SHOW, JUSTIFIED_CANCELLATION, SICKNESS, EMERGENCY, SESSION_ABANDONED, OTHER. Each has specific policy validation modal flow.
  - **Credit Ledger System**: Central source of truth for all credit balances. `credit_ledger` table with userId, clubId, amount (+/-), reason, linkedSessionId, linkedSignupId, attendanceStatus, createdById, createdAt. Balance = SUM of all entries.
  - **Policy Validation Modals**: Attendance changes trigger step-by-step validation: policy check → credit confirmation → ledger entry creation. Partial attendance/late arrival support percentage-based partial credits. Session abandoned tracks reason and completion level.
  - **Credit Actions**: Add Credit (manual), Use Credit (deduct from balance), per-session row. Anti-abuse: credits capped at session fee, no duplicate credits, all logged.
  - **Profile Credit View**: Read-only credit balance and transaction history on player Profile page (`/profile`). Endpoints: GET `/api/my-credits`, GET `/api/my-credits/history`.
  - Endpoints: GET `/api/admin/financial-summary?clubId&dateFrom&dateTo&sessionType&matchMode&search`, PATCH `/api/sessions/:sessionId/signups/:signupId/payment`, PATCH `/api/admin/signups/:signupId/fee`, PATCH `/api/sessions/:sessionId/signups/:signupId/attendance`, POST `/api/credits`, POST `/api/credits/use`, GET `/api/credits/balance`, GET `/api/credits/history`, GET `/api/credits/club/:clubId/balances`. All endpoints enforce club-scoped RBAC via MANAGE_CREDITS action.
- **Admin & Player Management**: Super admins have access to user approval panels with bulk actions, and can manage players across all clubs, including bulk actions for player status and cross-club allocation. Club admins can manage venues and administrators for their specific clubs. Admins and super admins can completely delete user accounts from the Manage Members section. Self-service account deletion is also available from the Profile page. Deleted users can create new accounts in the future. Endpoint: DELETE `/api/admin/users/:userId`, POST `/api/account/close`.
- **Club Customization**: Clubs can define shuttlecock types, T-shirt provision, and accepted player skill levels. Sessions can have custom fees.
- **Session Player Management**: Enhanced in-session player controls include gender override, pause/resume functionality, player pairing, and guest player creation. Admin/Owner users can inline-edit player names (click on name), toggle gender (click on gender badge to switch MALE/FEMALE on profile), change grade via dropdown (click on grade badge), and upload player profile pictures (camera icon on avatar). Changes update the actual player profile across the system, not just session-local overrides. Endpoints: PATCH `/api/admin/player-profiles/:profileId/inline`, POST `/api/admin/users/:userId/profile-picture`.
- **Profile Pictures**: Users can upload profile pictures from their Profile page. Admins/Owners can also upload pictures for any player from session views. Pictures are stored in `public/uploads/profiles/` and served via `/uploads/profiles/`. The `users` table has a `profilePictureUrl` field. Profile pictures display in session player cards and the Profile page. Endpoints: POST `/api/user/profile-picture`, POST `/api/admin/users/:userId/profile-picture`.
- **Coach Directory & Marketplace**: A system for coaches, including profiles, a public directory, a full directory for authenticated members, coach registration, and administrative management. Integrates a user suspension system.
- **Google Maps Integration**: Provides "Open in Google Maps" links for clubs and coaches, with fallbacks for coordinate-based links.
- **Search & Filtering**: Searchable club dropdowns and location-based filtering (postcode, city) for exploration pages.
- **Legal Policies System**: In-app legal content for Privacy Policy, Terms & Conditions, and Junior & Parental Consent Policy. Includes policy acceptance logging and support for junior accounts with parental consent.
- **Super Admin Dashboard**: A dedicated god-mode dashboard (`/super-admin`) for OWNER users only, providing unrestricted global read/write access to all system entities. Includes:
  - **Dashboard Home** (`/super-admin`): Real-time global stats (users by role, clubs by status, sessions, matches, coaches, revenue), pending actions hub, and quick action links.
  - **Users Control** (`/super-admin/users`): Global user management with search, role/status/verified filters, pagination, edit modal (all fields including role/status), password reset, and user deletion.
  - **Clubs Control** (`/super-admin/clubs`): Global club management with search, status filter, approve/reject, ownership transfer, and club deletion.
  - **Sessions Control** (`/super-admin/sessions`): Global session management with search, status filter, session editing (title/status/players/courts), and session cancellation.
  - API endpoints: `GET /api/super-admin/stats`, `GET /api/super-admin/sessions`, `PATCH /api/super-admin/sessions/:id`, `PATCH /api/super-admin/matches/:id/score`, `PATCH /api/super-admin/users/:id`, `POST /api/super-admin/users/:id/reset-password`, `PATCH /api/super-admin/clubs/:id/transfer`.
  - Sidebar shows dedicated "Super Admin" section with red label, visible only to OWNER role users.

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