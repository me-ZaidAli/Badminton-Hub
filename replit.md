# Club Master - Racket Sports Club Management Platform

## Overview
Club Master is a comprehensive full-stack web application designed to streamline operations for racket sports clubs (badminton, tennis, padel, squash, table tennis) and enhance player engagement. It provides a central platform for session scheduling, dynamic player ranking, match organization, member profiles, and administrative tasks. The system supports robust role-based access control, multi-club management, and a 2-plan freemium model. Its vision is to be the leading platform for racket sports clubs globally, significantly improving club efficiency and player satisfaction.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
The application uses React 18, TypeScript, Wouter, TanStack React Query, Tailwind CSS, and shadcn/ui for the frontend. The backend is built with Node.js, Express.js, and TypeScript, utilizing PostgreSQL as the database with Drizzle ORM.

### UI/UX Decisions
The UI features a modern design with privacy-enhanced public views, comprehensive player profiles, and a sophisticated Premium Theme System offering 64 themes across 7 tiers, 5 Branded Collections, and a Premium Collections category, many optimized for AMOLED displays. The Liquid Glass theme applies glassmorphism to all UI elements. Typography Studio allows font customization with 20 fonts across 5 categories. Dark themes feature enhanced visual variety, a global Ultra-Premium Transparent Glass UI system, neo-tactile button animations, premium CTA gradient buttons, sport-engraved racket string texture overlays, and glass-treated dialogs/sidebars/inputs/tables.

### Technical Implementations
- **Freemium Model**: A 2-plan freemium model (Basic FREE, Premium) with backend enforcement and frontend gating.
- **Role-Based Access Control (RBAC)**: Granular permissions at platform and club levels.
- **Multi-Club & Multi-Sport Support**: Manages multiple independent clubs and supports various racket sports.
- **Match Management**: Includes a visual court component, queuing system, and a deterministic Smart Match Engine v6 with multi-mode matchmaking (ADVANCED/HYBRID/ROTATION), gender-aware logic, 9-tier grade-based scoring, enhanced by the BPG Competitive Balance Engine and Session Fairness Command Center. It includes features like capped deficit penalty, match quality floor filters, adaptive candidate limit, opponent cooldown, and various configuration options via an admin UI.
- **Membership & Leaderboard Systems**: Handles club-based memberships, plans, requests, approvals, and computes dynamic player rankings.
- **Financial Intelligence System**: Multi-view financial dashboard with Smart Insights, credit management, donation system, and per-session invoice tracking.
- **Admin & Player Management**: Tools for comprehensive user, club, venue, and administrator management.
- **Recurring Events System**: Facilitates single or recurring session creation with scheduled publishing.
- **Session Player Management**: Enhanced in-session controls with a four-state participant system, supporting optional hall and court names.
- **Session Availability Notifications**: Automatic in-app, chat, and email notifications for session spaces, including reminders and admin manual reminders.
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
- **Premium Recognition Cards System**: Admin-gifted recognition cards with 3D flippable RPG-style display, unlocking exclusive theme tiers, designed with legal compliance for non-monetary value.
- **Mobile Bottom Navigation System**: Mobile-only fixed bottom bar with customizable shortcut icons.
- **Announcement Reactions & Comments**: Users can react to announcements with emoji reactions and threaded comments.
- **Player Intelligence & Analytics System**: Comprehensive player analytics dashboard, interactive charts, AI Comparison Review, achievement badges, skill review system, coach notes timeline, AI-powered player style analysis, and Match Log/Development tabs for players with active annual club memberships.
- **Session Intelligence Layer**: Provides pre-session balance prediction, post-session engagement scores, and smart session recommendations.
- **AI Full Session Schedule Generator**: One-click full session schedule generation using the match engine with fairness optimization, preview functionality, and an AI Session Designer for optimal session structure suggestions.
- **Payment Flow Enhancement**: Session signup includes payment method selection, a Payment Verification Dashboard, and a Payment Reliability Score for players.
- **Session Financial Command Center**: Real-time financial overview per session with expected vs actual revenue comparison, per-player financial actions, payment reminders, and credit issuance.
- **3D Avatar Selection System**: Users can select AI-generated Pixar-style 3D avatar presets.
- **Match Engine Testing Lab**: Admin-only sandbox for stress-testing the matchmaking algorithm with simulated players and comprehensive analytics.
- **Advanced Analytics Dashboard**: Power BI-level business intelligence system with Interactive Performance Dashboard, a Command Center (premium dark-mode executive analytics dashboard), and a Classic view, all primarily using completed session data.
- **Trial Onboarding & Evaluation System**: Manages trial players from registration to approval with a dedicated dashboard, admin command center for session assignment, evaluation, decision workflow, and automated notifications.
- **Rivalry Arena**: A component for player comparison in Player Intelligence featuring a badminton court background, gender-specific avatars, animated scoreboard, rivalry strength indicator, win ratio rings, match timeline, momentum line graph, and AI rivalry analysis.
- **Player Skills Analytics System**: League and Premium player skill tracking with enrollment management, per-player editable skill profiles, radar/bar charts, and audit history.
- **Tournaments Module**: Full tournament management with esports-style UI, supporting various tournament types, registration, group/knockout brackets, score submission, standings, and an extensive admin panel. Includes a dual entry fee system and a prize management system.
- **Tiered Session Fees**: Sessions support 4 fee tiers — Standard (`sessionFee`), Premium (`premiumFee`), Super Premium (`superPremiumFee`), and Club Member (`clubMemberFee`). All stored in pence. Session creation/edit forms show a 2x2 grid for entering each tier. Timeline dropdown and session details modal display all configured fees with color-coded labels.
- **Timeline UI Enhancements**: Real-time live/past/upcoming session status via `useCurrentTime` hook and `getSessionLiveStatus`. Session hype indicators (`getSessionHype`), animated capacity bars, glassmorphism dropdown panels, golden crown for top-ranked players with challenge banner, gradient dividers, and enriched match/player insights.
- **Club T-Shirt System**: Club-scoped t-shirt management with player requests, admin management, and batch ordering. Players see a club selector on `/tshirt` page (only clubs they belong to that have `providesClubTShirts: true`). T-shirts and requests are filtered per selected club. 2 models available: Chaotica (`@assets/image_1775147617249.png`), Slasher (`@assets/image_1775147642411.png`). A models showcase photo (`@assets/Screenshot_20260403_232959_Replit_1775255409511.jpg`) is displayed at the top of the request form. Admins manage via `/admin/tshirts` with T-Shirt Manager and Batch Manager. Tables: `tshirts`, `tshirt_requests`, `tshirt_batches`. Collection flow: not_ready → ready → player_confirmed → collected. All state changes logged to `admin_audit_logs` and trigger notifications.
- **Unified Wallet/Credit System**: The wallet is the **single source of truth** for all credit balances. The Financial Dashboard, Use Credit dialogs, and Wallet Management page all read from the `wallets` table. Credit ledger entries (`creditLedger`) serve as an audit trail but wallet balance is authoritative. Wallets are **automatically created** via `ensureUserWallet` whenever credits are issued. Both the Wallet Management page (`/super-admin/wallets`) and Financial Dashboard support per-player wallet reset (to £0.00) with confirmation dialogs. API endpoints: `/api/credits/balance` and `/api/credits/club/:clubId/balances` read from wallets; `/api/credits/reset` resets wallet+ledger atomically; `/api/god-mode/wallets/:walletId/reset` resets individual wallets.

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

### AI Match Input System
- **Image Upload & AI Vision OCR**: Admin/organiser/god-mode feature at `/admin/ai-match-input`. Upload score sheet images (whiteboards, screenshots) and GPT-4o vision extracts player names, teams, and scores.
- **Auto Player Linking**: Fuzzy name matching auto-links extracted names to existing players, scoped to admin's club access.
- **Unlinked Player Handling**: Unlinked players are highlighted with "Unlinked Player" badge. Users can search and link to existing players or quick-create new ones via modal.
- **Session Linking**: All matches must be linked to an existing session before saving. Strict validation ensures session selected, all players linked, and valid scores.
- **Match Save**: Saves as COMPLETED matches with `scoreEnteredByUserId` set to current admin. Updates `matchesPlayed`/`matchesWon` stats atomically in a DB transaction. Matches tagged as "AI Imported" or "AI Imported (Edited)".
- **Security**: Club-level authorization enforced on save. All matches must belong to the same session. Profile resolution scoped to session's club.
- **API Endpoints**: `POST /api/admin/ai-match-extract`, `POST /api/admin/ai-match-quick-create-player`, `POST /api/admin/ai-match-save`.

### APIs / Integrations
- **OpenStreetMap Nominatim API**: Geocoding addresses.
- **Google Calendar**: Integration for importing calendar events.
- **Badminton England**: Player insurance information.