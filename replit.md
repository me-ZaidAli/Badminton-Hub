# Club Master - Badminton Club Management System

## Overview
Club Master is a comprehensive full-stack web application designed for managing badminton clubs. It aims to streamline club operations, improve player engagement, and provide a central platform for activities such as session scheduling, dynamic player ranking, match organization, member profiles, and administrative tasks. The system supports robust role-based access control and multi-club management, with the goal of enhancing efficiency for club owners and offering an engaging experience for players.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
The frontend utilizes React 18, TypeScript, Wouter for routing, and TanStack React Query. Styling is managed with Tailwind CSS and shadcn/ui. The backend is built with Node.js, Express.js, and TypeScript. PostgreSQL serves as the primary database, interfaced via Drizzle ORM.

### Key Features and Design Patterns
-   **Role-Based Access Control (RBAC)**: Implements granular permissions at both platform (OWNER) and club (ADMIN, PLAYER) levels, ensuring club-scoped data access.
-   **Multi-Club Support**: Allows management of multiple independent badminton clubs, each with its own players and administration, supporting various lifecycle states (PENDING, APPROVED, PAUSED, REJECTED, ARCHIVED).
-   **Match Management**: Features a visual court component, a queuing system, a Smart Match Engine for generating matches (social or competitive), and controls for live match cancellation and hard-stopping match generation.
-   **Membership System**: Comprehensive club-based membership management including plans, requests, approvals, proration, and merchandise integration. Plans support customizable durations and recalculation of end dates.
-   **Dynamic Leaderboard System**: Computes player rankings (wins, losses, win percentage) dynamically from completed matches, offering club, session, and personal views. Includes privacy features like blurred names for unregistered users and optional nicknames.
-   **Privacy-Enhanced Public Views**: Public session and ranking views strip gender data and allow users to control public visibility of their name using a `showPublicName` consent field and optional nicknames.
-   **Financial Dashboard & Credit System**: Provides financial oversight for admins, tracking revenue, attendance, a credit ledger with policy validation, and outstanding payments. Includes a detailed Memberships tab with revenue summaries and overdue alerts.
-   **Inventory & Expense Tracking System**: Manages club inventory, stock movements, and general expenses, integrating with financial reporting.
-   **Admin & Player Management**: Tools for super admins and club admins to manage users, clubs, venues, and other administrators, including bulk actions and account deletion.
-   **Recurring Events System**: Facilitates the creation of single or recurring sessions with automated generation based on frequency and date range, capped at 52 occurrences.
-   **Scheduled Session Publishing**: Allows sessions to be scheduled to open for sign-ups at a future date, with controls to prevent early player actions.
-   **Session Player Management**: Enhanced in-session controls for admins, including gender override, pause/resume, player pairing, guest player creation, and inline profile editing.
-   **Session Waiting List & Participant States**: Implements a four-state participant system (Confirmed, Waiting List, Invited, Not Attending) with player-controlled status management and automatic waiting-list promotion. Includes a finance panel for payment tracking.
-   **Coach Directory & Marketplace**: System for managing and publicly listing coach profiles.
-   **Player Profile Dashboard**: A modern dashboard displaying player metrics like credits, outstanding payments, performance stats, and session activity, with drill-down capabilities.
-   **God's Mode Dashboard**: An OWNER-exclusive dashboard providing unrestricted global access for managing all system entities, including advanced user management and a tool for merging duplicate accounts.
-   **Public Viewing System**: A landing page offering public access to club directories, sessions, live views, and leaderboards without requiring login.
-   **Internal Messaging System**: A chat interface for same-club members and super admins, featuring searchable contacts, read receipts, archiving, and conversation management.
-   **Club Member Management**: Tools for admins and super admins to manage club members directly, including filtering, bulk actions, and detailed user editing.
-   **Account Management**: Supports user registration, account claiming, password resets, and self-service account deletion. Includes a "Merge Duplicate Accounts" tool for God Mode.
-   **Announcements System**: Allows admins/OWNERs to create and manage announcements with rich content, optional images, and per-user archiving.
-   **Notifications Panel**: A dedicated notification center with categorized tabs, search, bulk actions, and unread indicators.
-   **Legal Policies System**: Manages in-app legal content, logs policy acceptance, and supports parental consent for junior accounts.
-   **Player Profile Merging System**: An admin/OWNER-only wizard for merging duplicate player profiles, handling data reassignments, deduplication, stat recalculations, and audit logging with transactional safety.
-   **IT Helpdesk Ticketing System**: A secure, ticket-based support system with full lifecycle management, category classification, priority levels, RBAC, confidential tickets, internal notes, and immutable audit logging. Includes integration for banning members.
-   **Automatic Player Grading System**: A 9-tier skill grading system with automatic promotion/demotion based on rolling session performance and customizable thresholds, with an admin override lock.
-   **Referral System**: Full-featured refer-and-earn system with unique single-use codes (REF-XXXXXXXX format), 30-day expiration, admin approval workflow, £4 credit rewards per approved referral, milestone tracking (£8 for premium rate eligibility, £16 for Referral Champion status), automated notifications and internal messages, and registration page integration with URL parameter support (?ref=CODE).

## External Dependencies

### Database
-   **PostgreSQL**: Primary relational database.
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