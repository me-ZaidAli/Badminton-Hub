# Club Master - Racket Sports Club Management Platform

## Overview
Club Master is a comprehensive full-stack web application designed to streamline operations for racket sports clubs (badminton, tennis, padel, squash, table tennis) and enhance player engagement. It provides a central platform for session scheduling, dynamic player ranking, match organization, member profiles, and administrative tasks. The system supports robust role-based access control, multi-club management, and a 2-plan freemium model. Its vision is to be the leading platform for racket sports clubs globally, significantly improving club efficiency and player satisfaction.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
The application uses React 18, TypeScript, Wouter, TanStack React Query, Tailwind CSS, and shadcn/ui for the frontend. The backend is built with Node.js, Express.js, and TypeScript, utilizing PostgreSQL as the database with Drizzle ORM.

### UI/UX Decisions
The UI features a modern design with privacy-enhanced public views, comprehensive player profiles, and a sophisticated Premium Theme System offering 64 themes across 7 tiers, 5 Branded Collections, and a Premium Collections category, many optimized for AMOLED displays. The Liquid Glass theme applies glassmorphism to all UI elements. Typography Studio allows font customization with 20 fonts across 5 categories. Dark themes include enhanced visual variety, a global Ultra-Premium Transparent Glass UI system, neo-tactile button animations, premium CTA gradient buttons, sport-engraved racket string texture overlays, and glass-treated dialogs/sidebars/inputs/tables. Mobile navigation uses a fixed bottom bar with customizable shortcut icons.

### Technical Implementations
- **Freemium Model**: A 2-plan freemium model (Basic FREE, Premium) with backend enforcement and frontend gating.
- **Role-Based Access Control (RBAC)**: Granular permissions at platform and club levels.
- **Multi-Club & Multi-Sport Support**: Manages multiple independent clubs and supports various racket sports.
- **Match Management**: Includes a visual court component, queuing system, and a deterministic Smart Match Engine v6 with multi-mode matchmaking (ADVANCED/HYBRID/ROTATION), gender-aware logic, and 9-tier grade-based scoring, enhanced by the BPG Competitive Balance Engine and Session Fairness Command Center. Engine Control Panel settings for weights, grade spread limits, team avg diff limits, candidate window size, priority bonus, and strong-weak pairing bonus are fully wired and club-specific.
- **Membership & Leaderboard Systems**: Handles club-based memberships, plans, requests, approvals, and computes dynamic player rankings.
- **Financial Intelligence System**: Multi-view financial dashboard with Smart Insights, credit management, donation system, and per-session invoice tracking. Includes a unified wallet/credit system where the wallet is the single source of truth for all credit balances. Session-level expense tracking with Expenses and Profit tabs per session card in the financial dashboard. `expenses` table has optional `sessionId` column for linking expenses to specific sessions. `expense_materials` table for club-scoped reusable materials with price per unit. Venues have `pricePerUnit` column. Session expenses support venue/material dropdown selection with auto-filled prices and inline add-new-venue/material dialogs.
- **Admin & Player Management**: Tools for comprehensive user, club, venue, and administrator management.
- **Recurring Events System**: Facilitates single or recurring session creation with scheduled publishing.
- **Session Player Management**: Enhanced in-session controls with a four-state participant system, supporting optional hall and court names.
- **Session Availability Notifications**: Automatic in-app, chat, and email notifications for session spaces, including reminders and admin manual reminders.
- **Communications Admin Center**: Admin page at `/admin/communications` with per-club notification settings and a delivery log viewer.
- **Team Events System**: Club-scoped team events (Social, Match, Tournament Prep, Training, Fundraiser, Other) with full CRUD, signup/withdraw flow, and a dedicated "Team Events" tab.
- **Session Match Recovery**: Allows recovery of soft-deleted (archived) matches.
- **Coach Directory & Lesson Booking**: Manages public coach profiles, an interactive map, and an in-app private lesson request system.
- **Global Account Merge System**: Tool for merging duplicate user accounts (OWNER-only).
- **IT Helpdesk Ticketing System**: Secure, ticket-based support with RBAC and credit claim workflow.
- **Automatic Player Grading System**: 9-tier skill grading with automatic promotion/demotion.
- **Club-Scoped Referral System**: Independent referral programs per club.
- **Junior Management**: Features for managing junior players, skill tracking, exercise challenges, and parent dashboards.
- **League Management System**: Full league fixture and results management, including Player Selection Notifications and Squad Management.
- **Payment & Credit Request System**: Players can confirm payments and request credits in-app, with an enhanced credit wallet and automation settings. Session signup includes payment method selection, a Payment Verification Dashboard, and a Payment Reliability Score for players.
- **Internal Messaging System**: Chat interface with message categories and filtering.
- **AI-Powered Reporting**: AI-generated reports for coaches, parents, and admins.
- **Enhanced Badge Count System**: Sidebar badges for notifications and pending items.
- **Social Media Links System**: Clubs can add social media links for 11 platforms.
- **Sidebar Hide/Lock System**: Collapsible sidebar with optional PIN protection.
- **Premium Recognition Cards System**: Admin-gifted recognition cards with 3D flippable RPG-style display, unlocking exclusive theme tiers.
- **Announcement Reactions & Comments**: Users can react to announcements with emoji reactions and threaded comments.
- **Player Intelligence & Analytics System**: Comprehensive player analytics dashboard, interactive charts, AI Comparison Review, achievement badges, skill review system, coach notes timeline, AI-powered player style analysis, and Match Log/Development tabs for players with active annual club memberships.
- **Session Intelligence Layer**: Provides pre-session balance prediction, post-session engagement scores, and smart session recommendations.
- **AI Full Session Schedule Generator**: One-click full session schedule generation using the match engine with fairness optimization, preview functionality, and an AI Session Designer for optimal session structure suggestions.
- **Session Financial Command Center**: Real-time financial overview per session with expected vs actual revenue comparison, per-player financial actions, payment reminders, and credit issuance.
- **3D Avatar Selection System**: Users can select AI-generated Pixar-style 3D avatar presets.
- **Match Engine Testing Lab**: Admin-only sandbox for stress-testing the matchmaking algorithm with simulated players and comprehensive analytics.
- **Advanced Analytics Dashboard**: Power BI-level business intelligence system with Interactive Performance Dashboard, a Command Center, and a Classic view.
- **Trial Onboarding & Evaluation System**: Manages trial players from registration to approval with a dedicated dashboard, admin command center for session assignment, evaluation, decision workflow, and automated notifications.
- **Rivalry Arena**: A component for player comparison in Player Intelligence featuring a badminton court background, gender-specific avatars, animated scoreboard, rivalry strength indicator, win ratio rings, match timeline, momentum line graph, and AI rivalry analysis.
- **Player Skills Analytics System**: League and Premium player skill tracking with enrollment management, per-player editable skill profiles, radar/bar charts, and audit history.
- **Tournaments Module**: Full tournament management with esports-style UI, supporting various tournament types, registration, group/knockout brackets, score submission, standings, and an extensive admin panel. Includes dual entry fee and prize management systems. Dashboard tournament banner shows registered players their tournament details (date, time, venue), group assignment, group start time, court/hall info, and other pairs in their group via `/api/my-tournament-dashboard` endpoint. GROUP_KNOCKOUT multi-stage flow: Group Stage (round 1, groupNumber 1-99) → Quarter-Finals (round 200, groupNumber 201-204) → Semi-Finals (round 300, groupNumber 300+) → Final (round 400, groupNumber 400). Group data sourced from `tournament_groups`/`tournament_group_pairs` tables (category-scoped). Top qualifiers from each group advance; QF groups are shuffled from different source groups.
- **Tiered Session Fees**: Sessions support 4 fee tiers (Standard, Premium, Super Premium, Club Member) with dedicated input fields and display in the UI.
- **Timeline UI Enhancements**: Real-time live/past/upcoming session status, hype indicators, animated capacity bars, glassmorphism dropdown panels, golden crown for top-ranked players, gradient dividers, and enriched match/player insights.
- **Club T-Shirt System**: Legacy club-scoped t-shirt management with player requests, admin management, and batch ordering (at `/tshirt` and `/admin/tshirts`).
- **Club Merchandise System**: Premium merchandise shopping experience at `/merchandise` with category-based entry view (2-column gradient grid cards with floating emojis), product listing with sticky search bar and real-time filters (category, gender), card-flip animations, featured product hero cards, save/favourite functionality, and a structured order request form (size, gender, style, quantity, notes). Admin system with full CRUD for products (categories, sizes, genders, styles, materials, specifications, tags, status, featured flag), order management dashboard (view/edit/update status: Pending→Approved→Ready→Collected, delete), and category management (seed defaults, create/edit/hide/delete). Schema tables: `merchandise_categories`, `merchandise_products`, `merchandise_order_items`. Sidebar entry renamed from "Club T-Shirt" to "Club Merchandise".
- **Community Hub System**: Social layer for clubs at `/community` with events, food experiences, community feed, reviews, and admin moderation. DB tables: `community_events`, `community_event_participants`, `food_entries`, `food_interests`, `community_posts`, `community_comments`, `community_likes`, `community_reviews`. Backend routes in `server/communityRoutes.ts`. Features: event creation with types (social/team/food/tournament), cover images, tags, featured events, join/leave, food experience with 6-step form (country flags, allergens, dietary info), "I Want a Bite" interest system, community feed with posts/likes/comments, star ratings and reviews for events, admin moderation panel (visibility/featured/delete). Club-scoped RBAC for create/edit/delete. Event detail page at `/community/event/:id` with Overview, People, Food, and Feed tabs.
- **Deals & Offers System**: Premium mobile-first experience at `/deals` with category discovery page (2-column grid with gradient cards, floating emojis, deal counts), filtered deals view with sticky search bar, pill-style filter chips (All, 10%+, 20%+, 50%+, Expiring Soon, New), featured deal card with countdown timer, glassmorphism card design with card-flip animation for details, save/favorite functionality, copy-code feedback with "Copied ✅", smooth framer-motion animations throughout. Categories: Food, Fitness, Services, Equipment, Wellness, Travel, Beauty, Fashion, Other. Admin management tab with category selection. `discount_codes` schema includes `category` column. Per-club scoping with assignment system. **Dynamic category system**: `deal_categories` DB table (name, emoji, gradient, imageUrl, sortOrder, isDefault, isActive) with full CRUD routes (`/api/deal-categories`, `/api/deal-categories/all`, `/api/deal-categories/seed-defaults`); admin "Categories" tab in Deals page with create/edit/hide/delete controls and gradient colour picker. AI-generated category images for default categories stored in `attached_assets/generated_images/deal_cat_*.png`.

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
- **GPT-4o vision**: Used for Image Upload & AI Vision OCR to extract player names, teams, and scores from score sheet images.
- **API Endpoints**: `POST /api/admin/ai-match-extract`, `POST /api/admin/ai-match-quick-create-player`, `POST /api/admin/ai-match-save`.

### APIs / Integrations
- **OpenStreetMap Nominatim API**: Geocoding addresses.
- **Google Calendar**: Integration for importing calendar events.
- **Badminton England**: Player insurance information.