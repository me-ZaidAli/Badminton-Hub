# Club Master - Racket Sports Club Management Platform

## Overview
Club Master is a comprehensive full-stack web application designed to streamline operations for racket sports clubs (badminton, tennis, padel, squash, table tennis) and enhance player engagement. It provides a central platform for session scheduling, dynamic player ranking, match organization, member profiles, and administrative tasks. The system supports robust role-based access control, multi-club management, and a 2-plan freemium model. Its vision is to be the leading platform for racket sports clubs globally, significantly improving club efficiency and player satisfaction.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
The application uses React 18, TypeScript, Wouter, TanStack React Query, Tailwind CSS, and shadcn/ui for the frontend. The backend is built with Node.js, Express.js, and TypeScript, utilizing PostgreSQL as the database with Drizzle ORM.

### UI/UX Decisions
The UI features a modern design with privacy-enhanced public views and comprehensive player profiles. A sophisticated Premium Theme System offers 64 themes across 7 tiers plus 5 Branded Collections and a Premium Collections category, many optimized for AMOLED displays with unique animations and design tokens. The Liquid Glass theme provides translucent frosted panels with liquid reflections, soft edge glow, and fluid depth, applying glassmorphism to all UI elements including match cards. Typography Studio allows font customization with 20 fonts across 5 categories, with access tiered by plan and card ownership. Dark themes feature enhanced visual variety with ambient lighting, radial gradient overlays, reflective card surfaces, and textured elements, and a global Ultra-Premium Transparent Glass UI system providing true glassmorphism cards with backdrop-filter blur, neo-tactile button animations, premium CTA gradient buttons, sport-engraved racket string texture overlays, and glass-treated dialogs/sidebars/inputs/tables.

### Technical Implementations
- **Freemium Model**: A 2-plan freemium model (Basic FREE, Premium) with backend enforcement and frontend gating for premium features.
- **Role-Based Access Control (RBAC)**: Granular permissions at platform and club levels for various user roles.
- **Multi-Club & Multi-Sport Support**: Manages multiple independent clubs and supports various racket sports.
- **Match Management**: Includes a visual court component, queuing system, and a deterministic Smart Match Engine with gender-aware logic and 9-tier grade-based scoring, enhanced by the BPG Competitive Balance Engine and Session Fairness Command Center.
- **Membership & Leaderboard Systems**: Handles club-based memberships, plans, requests, approvals, and computes dynamic player rankings.
- **Financial Intelligence System**: Multi-view financial dashboard with Smart Insights, credit management, donation system, and per-session invoice tracking.
- **Admin & Player Management**: Tools for comprehensive user, club, venue, and administrator management.
- **Recurring Events System**: Facilitates single or recurring session creation with scheduled publishing and flexible editing/deletion.
- **Session Player Management**: Enhanced in-session controls with a four-state participant system, supporting optional hall and court names.
- **Session Availability Notifications**: Automatic in-app + chat + email notifications for session spaces. When a player withdraws, invitees are notified. Scheduled reminders at 2 days, 1 day, and day-of session if spaces remain. Admin "Remind Members" bell button sends manual reminders to unconfirmed members. Route: `POST /api/sessions/:id/remind-invitees`. Logic in `server/notification-scheduler.ts`.
- **Session Match Recovery**: Allows recovery of soft-deleted (archived) matches.
- **Coach Directory & Lesson Booking**: Manages public coach profiles, an interactive map, and an in-app private lesson request system.
- **Global Account Merge System**: Tool for merging duplicate user accounts (OWNER-only).
- **IT Helpdesk Ticketing System**: Secure, ticket-based support with RBAC and credit claim workflow.
- **Automatic Player Grading System**: 9-tier skill grading with automatic promotion/demotion.
- **Club-Scoped Referral System**: Independent referral programs per club.
- **Junior Management**: Features for managing junior players, skill tracking, exercise challenges, and parent dashboards.
- **League Management System**: Full league fixture and results management, including Player Selection Notifications and Squad Management.
- **Payment & Credit Request System**: Players can confirm payments and request credits in-app, with an enhanced credit wallet and automation settings.
- **Internal Messaging System**: Chat interface with message categories and filtering.
- **AI-Powered Reporting**: AI-generated reports for coaches, parents, and admins.
- **Enhanced Badge Count System**: Sidebar badges for notifications and pending items.
- **Social Media Links System**: Clubs can add social media links for 11 platforms.
- **Sidebar Hide/Lock System**: Collapsible sidebar with optional PIN protection.
- **Premium Recognition Cards System**: Admin-gifted recognition cards with 3D flippable RPG-style display, unlocking exclusive theme tiers.
- **Mobile Bottom Navigation System**: Mobile-only fixed bottom bar with customizable shortcut icons.
- **Announcement Reactions & Comments**: Users can react to announcements with emoji reactions and threaded comments.
- **Player Intelligence & Analytics System**: Comprehensive player analytics dashboard, interactive charts, AI Comparison Review, achievement badges, skill review system, coach notes timeline, AI-powered player style analysis, and Match Log/Development tabs for players with active annual club memberships.
- **Session Intelligence Layer**: Provides pre-session balance prediction, post-session engagement scores, and smart session recommendations.
- **AI Full Session Schedule Generator**: One-click full session schedule generation using the match engine with fairness optimization, preview functionality, and an AI Session Designer for optimal session structure suggestions.
- **Payment Flow Enhancement**: Session signup includes payment method selection, a Payment Verification Dashboard, and a Payment Reliability Score for players.
- **Session Financial Command Center**: Real-time financial overview per session with expected vs actual revenue comparison, per-player financial actions, payment reminders, and credit issuance.
- **3D Avatar Selection System**: Users can select AI-generated Pixar-style 3D avatar presets.
- **Match Engine Testing Lab**: Admin-only sandbox for stress-testing the matchmaking algorithm with simulated players and comprehensive analytics.
- **Advanced Analytics Dashboard**: Power BI-level business intelligence system with Interactive Performance Dashboard (unified global filter state, cross-filtering, drill-down, KPI cards, chart metrics, player analysis, session details, player profile cards, fullscreen, AI insights), a Command Center (premium dark-mode executive analytics dashboard with glassmorphism + neon aesthetic, global KPIs, trends, attendance, financial, member value analytics, AI insights, smart alerts), and a Classic view with KPI cards, charts, and AI reports, all primarily using completed session data.
- **Trial Onboarding & Evaluation System**: Manages trial players from registration to approval with a dedicated dashboard, admin command center for session assignment, evaluation, decision workflow, and automated notifications. Includes auto-credit upon approval.
- **Rivalry Arena**: A component for player comparison in Player Intelligence featuring a badminton court background, gender-specific avatars, animated scoreboard, rivalry strength indicator, win ratio rings, match timeline, momentum line graph, and AI rivalry analysis.

## External Dependencies

### Database
- **PostgreSQL**: Primary relational database.

### Authentication
- **express-session**: For managing user sessions.
- **passport / passport-local**: User authentication framework.

### Frontend Libraries
- **@tanstack/react-query**: Server state management.
- **date-fns**: Date manipulation.
- **recharts**: For charts and data visualizations.
- **framer-motion**: Animation library for premium UI components.

### Build & Development Tools
- **Vite**: Frontend build tool.
- **esbuild**: Backend bundling.

### Progressive Web App (PWA)
- **Web App Manifest**: Defines PWA properties.
- **Service Worker**: Implements network-first caching strategy.

### APIs / Integrations
- **OpenStreetMap Nominatim API**: Geocoding addresses.
- **Google Calendar**: Integration for importing calendar events.
- **Badminton England**: Player insurance information.