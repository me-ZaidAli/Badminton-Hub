# Club Master - Badminton Club Management System

## Overview
Club Master is a comprehensive full-stack web application for badminton club management. It streamlines club operations, enhances player engagement, and provides a centralized hub for all activities, including session scheduling, dynamic player ranking, match organization, member profiles, and administrative tools. The system supports robust role-based access control and multi-club management, aiming to improve efficiency for club owners and offer an engaging experience for players.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
The frontend is built with React 18, TypeScript, Wouter for routing, and TanStack React Query. Styling uses Tailwind CSS with shadcn/ui. The backend uses Node.js with Express.js and TypeScript. PostgreSQL serves as the primary database, managed by Drizzle ORM.

### Key Features and Design Patterns
-   **Role-Based Access Control (RBAC)**: Supports platform-level (OWNER) and club-level roles (ADMIN, PLAYER) with granular permissions and club-scoped data access.
-   **Multi-Club Support**: Manages multiple badminton clubs, each with specific player profiles and administration. Clubs support lifecycle states: PENDING, APPROVED, PAUSED, REJECTED, and ARCHIVED. Pausing a club temporarily hides it from public listings while preserving all data. Archiving soft-deletes a club permanently.
-   **Match Management**: Includes a visual court component, match lifecycle management, a queuing system, a **Smart Match Engine** for generating matches based on social or competitive modes, cancel-live-match functionality, and hard-stop controls that immediately halt all generation and prevent new matches until manually re-enabled.
-   **Membership System**: Comprehensive club-based membership management with plans, requests, approvals, proration, and merchandise integration.
-   **Dynamic Leaderboard System**: Computes player rankings (wins, losses, win percentage) dynamically from completed matches, supporting club, session, and personal views. An admin-only "All Rankings" page offers advanced filtering and in-place editing. Public rankings show only ranked players, blur names for unregistered users, use nicknames when available, and exclude gender information.
-   **Privacy-Enhanced Public Views**: Public session and ranking views strip gender data from API responses. Users can set an optional nickname during registration that displays instead of their full name on public leaderboards. A `showPublicName` consent field (default false) controls whether a player's name is visible or blurred on public rankings and sessions. Players who haven't consented have their names blurred via CSS (`blur-[4px] select-none`). The backend includes a `nameBlurred` flag in public API responses based on `showPublicName`. A privacy notice in the registration form explains public name visibility.
-   **Financial Dashboard & Credit System**: Provides a detailed financial overview for admins, including revenue tracking, attendance management, a credit ledger system with policy-validated transactions, and anti-abuse mechanisms. Includes comprehensive outstanding payment tracking: players see unpaid session fees grouped by club on their profile, credit balances always display (including zero), and admins can request payments via notifications from the player profile page.
-   **Inventory & Expense Tracking System**: Manages club inventory items, tracks stock movements, records general expenses, and integrates with financial reporting.
-   **Admin & Player Management**: Offers tools for super admins and club admins to manage users, clubs, venues, and administrators, including bulk actions and account deletion.
-   **Session Player Management**: Enhanced in-session controls for admins, including gender override, pause/resume, player pairing, guest player creation, and inline editing of player profiles.
-   **Session Waiting List & Participant States**: Four-state participant system (Confirmed, Waiting List, Invited, Not Attending) with player-controlled status management. Players can join sessions, accept/decline invitations, cancel attendance, and join waiting lists through self-service controls. Automatic waiting-list assignment when session is full and auto-promotion of first waiting player when a confirmed spot opens. Session creation auto-invites all approved club members (creates INVITED signups + notifications). Session details popup modal (triggered by clicking session title) with tabbed view of all participant states, player action bar showing context-sensitive controls based on current status, and admin override controls. Per-session finance panel with quick payment toggle, payment method selection (Cash, Online, Card, Bank Transfer, Membership Credit), and payment notes per participant. Backend endpoint: `POST /api/sessions/:id/player-status` with actions: accept, decline, cancel, join, wait.
-   **Coach Directory & Marketplace**: System for managing coach profiles, a public directory, and coach registration.
-   **God's Mode Dashboard**: A god-mode dashboard for OWNER users (renamed from "Super Admin") providing unrestricted global read/write access and management capabilities across all system entities. Includes a comprehensive Users Management page with ranked player lists, advanced filters (gender, club, city, grade), summary cards for pending approvals and password resets, bulk approval actions, full player detail editing, password management, and profile deletion.
-   **Public Viewing System**: Provides a public landing page with club directories, public sessions, live views, and leaderboards, accessible without login.
-   **Internal Messaging System**: WhatsApp/Telegram-style chat interface with two-column layout (conversation list + thread view). Messaging restricted to same-club members and super admins via server-side club membership validation. Features include searchable contact picker (grouped by super admins and club members), chat bubbles with read receipts, per-user archive flags (archivedBySender/archivedByRecipient), conversation delete, 5-conversation limit with archive/delete prompt, auto-mark-read on thread open, and mobile-responsive toggle between list and thread views. Backend endpoints: contacts, conversations, thread, send (with club validation), archive-conversation, delete-conversation, unread-count.
-   **Club Member Management**: Admins and super admins can manage club members directly from the Clubs page. Features include alphabetical member lists, advanced filters (search, gender, category, status, role), bulk actions (delete, archive, pause, suspend), pending approvals tab, and detailed user editing with password reset and messaging capabilities.
-   **Account Management**: Features registration, account claiming, password reset functionality, and self-service account deletion. Email login and registration are case-insensitive to prevent duplicate accounts. New registrations normalize email to lowercase. God Mode includes a "Merge Duplicate Accounts" tool with dry-run support and transactional safety.
-   **Notifications Panel**: Dedicated full-page notifications center accessible from sidebar and NotificationBell popover. Features tabbed categorization (In Progress, Completed, Archived), search filtering, per-notification and bulk status actions, unread indicators, type badges, and click-to-navigate to linked content. Schema includes `notification_status` enum with `status` field on notifications table.
-   **Legal Policies System**: Manages in-app legal content, policy acceptance logging, and parental consent for junior accounts.
-   **Automatic Player Grading System**: 9-tier skill grading (C3→C2→C1→B3→B2→B1→A3→A2→A1) with automatic promotion/demotion based on rolling 5-session performance windows. Thresholds: 55% win rate for promotion, below 40% for demotion, minimum 10 games and 3 sessions required. Admin lock feature prevents auto-changes. Club-level toggle to enable/disable auto-grading. Schema uses `grade` field (text) alongside legacy `category` enum for backward compatibility. Frontend displays `grade || category || "C3"` pattern throughout.

## External Dependencies

### Database
-   **PostgreSQL**: Core relational database.
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