# Club Master - Badminton Club Management System

## Overview
Club Master is a comprehensive full-stack web application for badminton club management. It streamlines club operations, enhances player engagement, and provides a centralized hub for all activities, including session scheduling, dynamic player ranking, match organization, member profiles, and administrative tools. The system supports robust role-based access control and multi-club management, aiming to improve efficiency for club owners and offer an engaging experience for players.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
The frontend is built with React 18, TypeScript, Wouter for routing, and TanStack React Query. Styling uses Tailwind CSS with shadcn/ui. The backend uses Node.js with Express.js and TypeScript. PostgreSQL serves as the primary database, managed by Drizzle ORM.

### Key Features and Design Patterns
-   **Role-Based Access Control (RBAC)**: Supports platform-level (OWNER) and club-level roles (ADMIN, ORGANISER, COACH, PLAYER) with granular permissions and club-scoped data access.
-   **Multi-Club Support**: Manages multiple badminton clubs, each with specific player profiles and administration. Clubs support lifecycle states: PENDING, APPROVED, PAUSED, REJECTED, and ARCHIVED. Pausing a club temporarily hides it from public listings while preserving all data. Archiving soft-deletes a club permanently.
-   **Match Management**: Includes a visual court component, match lifecycle management, a queuing system, and a **Smart Match Engine** for generating matches based on social or competitive modes.
-   **Membership System**: Comprehensive club-based membership management with plans, requests, approvals, proration, and merchandise integration.
-   **Dynamic Leaderboard System**: Computes player rankings (wins, losses, win percentage) dynamically from completed matches, supporting club, session, and personal views. An admin-only "All Rankings" page offers advanced filtering and in-place editing.
-   **Financial Dashboard & Credit System**: Provides a detailed financial overview for admins, including revenue tracking, attendance management, a credit ledger system with policy-validated transactions, and anti-abuse mechanisms.
-   **Inventory & Expense Tracking System**: Manages club inventory items, tracks stock movements, records general expenses, and integrates with financial reporting.
-   **Admin & Player Management**: Offers tools for super admins and club admins to manage users, clubs, venues, and administrators, including bulk actions and account deletion.
-   **Session Player Management**: Enhanced in-session controls for admins, including gender override, pause/resume, player pairing, guest player creation, and inline editing of player profiles.
-   **Coach Directory & Marketplace**: System for managing coach profiles, a public directory, and coach registration.
-   **Super Admin Dashboard**: A god-mode dashboard for OWNER users providing unrestricted global read/write access and management capabilities across all system entities.
-   **Public Viewing System**: Provides a public landing page with club directories, public sessions, live views, and leaderboards, accessible without login.
-   **Account Management**: Features registration, account claiming, password reset functionality, and self-service account deletion.
-   **Legal Policies System**: Manages in-app legal content, policy acceptance logging, and parental consent for junior accounts.

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