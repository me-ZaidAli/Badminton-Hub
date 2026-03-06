# Club Master - Racket Sports Club Management Platform

## Overview
Club Master is a comprehensive full-stack web application designed to streamline operations for racket sports clubs (badminton, tennis, padel, squash, table tennis) and enhance player engagement. It provides a central platform for session scheduling, dynamic player ranking, match organization, member profiles, and administrative tasks. The system supports robust role-based access control, multi-club management, and a 2-plan freemium model. Its vision is to be the leading platform for racket sports clubs globally, significantly improving club efficiency and player satisfaction.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
The application uses React 18, TypeScript, Wouter, TanStack React Query, Tailwind CSS, and shadcn/ui for the frontend. The backend is built with Node.js, Express.js, and TypeScript, utilizing PostgreSQL as the database with Drizzle ORM.

### Plan & Billing System
A 2-plan freemium model (Basic FREE, Premium) is implemented with backend enforcement via `requirePremium` middleware and frontend gating for premium features. Key features like rankings, analytics, advanced management tools, internal messaging, helpdesk tickets, coach directory, league management, recognition cards, attendance analytics, and financial tools are exclusive to the Premium plan.

### Multi-Sport Support
The platform supports multiple racket sports, allowing clubs to select one or more sport types for tailored experiences.

### UI/UX Decisions
The UI features a modern design with privacy-enhanced public views and comprehensive player profiles. A sophisticated Premium Theme System offers 63 themes across 7 tiers plus 5 Branded Collections and a Premium Collections category, many optimized for AMOLED displays with unique animations and design tokens. Theme access is tier-gated by club ranking, special Black Card access, Metallic Comet Card ownership, or Royal Duty Card ownership. All dark themes feature enhanced visual variety with ambient lighting, radial gradient overlays, reflective card surfaces, and textured elements. A global Ultra-Premium Transparent Glass UI system applies to all dark themes, providing true glassmorphism cards with backdrop-filter blur, neo-tactile button animations, premium CTA gradient buttons, sport-engraved racket string texture overlays, and glass-treated dialogs/sidebars/inputs/tables. Typography Studio allows font customization with 20 fonts across 5 categories, with access tiered by plan and card ownership.

### Technical Implementations
- **Role-Based Access Control (RBAC)**: Granular permissions at platform and club levels.
- **Multi-Club Support**: Manages multiple independent clubs with separate data and administration.
- **Match Management**: Includes a visual court component, queuing system, and a deterministic Smart Match Engine with gender-aware logic and 9-tier grade-based scoring. The Session Fairness Command Center includes a Player Intelligence system with per-player Challenge Index (grade-based opponent comparison), Performance Score, Promotion Watch (auto-flags promotion candidates, struggling, under-challenged), and a Competitive Distribution Overview with session-wide analytics, grade distribution pie chart, and filterable player list.
- **Membership System**: Handles club-based memberships, plans, requests, and approvals.
- **Dynamic Leaderboard System**: Computes player rankings from completed matches.
- **Financial Intelligence System**: Multi-view financial dashboard with 5 views (Classic, Analytics, Profitability, Cashflow, Reports), Smart Insights with auto-detected alerts and Revenue Forecast, localStorage view persistence. Components in `client/src/components/financial/` with shared types. Includes credit management and donation system.
- **Admin & Player Management**: Tools for comprehensive user, club, venue, and administrator management.
- **Recurring Events System**: Facilitates single or recurring session creation with scheduled publishing. Scheduled (unpublished) sessions are shown in a separate admin-only section and move to the main listing when published. Editing a recurring session offers "Apply to This Session Only" or "Apply to All Future Sessions". Deleting offers "This Only", "This & Future", or "Entire Series" options. The same structure is used in both the main Sessions page and the Junior Sessions panel.
- **Session Player Management**: Enhanced in-session controls with a four-state participant system.
- **Coach Directory & Marketplace**: Manages and lists public coach profiles.
- **Global Account Merge System**: OWNER-only tool for merging duplicate user accounts.
- **IT Helpdesk Ticketing System**: Secure, ticket-based support system with RBAC.
- **Automatic Player Grading System**: 9-tier skill grading with automatic promotion/demotion.
- **Club-Scoped Referral System**: Independent referral programs per club with admin manual referral creation and approval.
- **Junior Management**: Comprehensive features for managing junior players, including skill tracking, exercise challenges, and parent-facing dashboards.
- **League Management System**: Full league fixture and results management, supporting multiple named leagues per club. This includes a Player Selection Notification banner for assigned players on their Dashboard, a League Squad Management System for admins to manage players, their format preferences, and send match availability polls.
- **Payment & Credit Request System**: Players can confirm payments and request credits in-app, triggering admin notifications and support tickets.
- **Internal Messaging System**: Chat interface with message categories and filtering.
- **AI-Powered Reporting**: AI-generated reports for coaches, parents, and admins.
- **Enhanced Badge Count System**: Sidebar badges for various notifications and pending items.
- **Social Media Links System**: Clubs can add and display social media links for 11 platforms.
- **Sidebar Hide/Lock System**: Collapsible sidebar with optional PIN protection for unhiding.
- **Premium Recognition Cards System**: Admin-gifted recognition cards (12 types, 5 rarity levels) with 3D flippable cards, Premium Wallet display, and full-screen carousel viewer. Specific cards unlock exclusive theme tiers.
- **Mobile Bottom Navigation System**: Mobile-only fixed bottom bar with up to 4 customizable shortcut icons and a "More" button opening a full menu sheet.
- **Announcement Reactions & Comments**: Users can react to announcements with emoji reactions (toggle on/off, visible counts on cards) and leave threaded comments with reply support. Comments expand/collapse via a comment icon on the card. Admins and comment owners can delete comments (with cascading reply deletion). Tables: `announcement_reactions`, `announcement_comments`.
- **Player Intelligence & Analytics System**: Premium feature at `/player-intelligence` with comprehensive player analytics dashboard. Features: player list with search/filter, per-player stats (matches, wins, win rate, points, sessions, hours, Session Impact Score, opponent difficulty), interactive recharts charts (performance over time area chart, difficulty bar chart, hours per month, skill radar chart), player comparison with head-to-head rivalry stats, achievement badges system (dynamically computed from match/session milestones), skill review system (£20 coach feedback with 0-100% skill ratings across 10 categories/52 skills), coach notes timeline, and AI-powered player style analysis (Attacking/Defensive/Tactical/Balanced/Power/Control classification via OpenAI). Tables: `player_avatar_selections`, `player_skill_categories`, `player_skills`, `player_skill_review_requests`, `player_skill_evaluations`, `player_achievements_record`, `player_coach_notes`. Page: `client/src/pages/PlayerIntelligence.tsx`.

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

- **3D Avatar Selection System**: AI-generated Pixar-style 3D avatar presets (10 avatars: 5 male, 5 female) stored in `public/avatars/`. Users select from a picker dialog on their Profile page. Selection stored in `users.selectedAvatar` column. Component: `client/src/components/AvatarPicker.tsx` with `getAvatarUrl()` utility. Integrated into Profile header and Sidebar. Route: `POST /api/user/selected-avatar`.

- **Match Engine Testing Lab**: Admin-only sandbox for stress-testing the matchmaking algorithm with simulated players and comprehensive analytics (fairness, balance, partner/opponent diversity, fatigue, gender distribution). Supports Standard vs AI Brain comparison, configurable player pools (4-40 players), match volumes (50-500), and side-by-side run comparison.

### APIs / Integrations
- **OpenStreetMap Nominatim API**: Geocoding addresses.
- **Google Calendar**: Integration for importing calendar events.
- **Badminton England**: Player insurance information.