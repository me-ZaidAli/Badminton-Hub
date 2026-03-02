# Club Master - Racket Sports Club Management Platform

## Overview
Club Master is a comprehensive full-stack web application designed to streamline operations for racket sports clubs (badminton, tennis, padel, squash, table tennis) and enhance player engagement. It provides a central platform for session scheduling, dynamic player ranking, match organization, member profiles, and administrative tasks. The system supports robust role-based access control, multi-club management, and a 2-plan freemium model. Its vision is to be the leading platform for racket sports clubs globally, significantly improving club efficiency and player satisfaction.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
The application uses React 18, TypeScript, Wouter, TanStack React Query, Tailwind CSS, and shadcn/ui for the frontend. The backend is built with Node.js, Express.js, and TypeScript, utilizing PostgreSQL as the database with Drizzle ORM.

### Plan & Billing System
A 2-plan freemium model (Basic FREE, Premium) is implemented with a clear plan status flow and backend enforcement via `requirePremium` middleware on 215+ premium-only API routes. Frontend gating ensures premium features are only accessible to active premium clubs. Key features like rankings, analytics, advanced management tools, internal messaging, helpdesk tickets, coach directory, league management, recognition cards, attendance analytics, and financial tools are exclusive to the Premium plan, while basic club operations (sessions, attendance, member list, basic dashboard, auth) remain free.

### Multi-Sport Support
The platform supports multiple racket sports, allowing clubs to select one or more sport types, which are then reflected across the application for tailored experiences.

### UI/UX Decisions
The UI features a modern design with a privacy-enhanced public view, comprehensive player profiles, and an animated anniversary countdown. A sophisticated Premium Theme System offers 63 themes across 7 tiers plus 5 Branded Collections plus a Premium Collections category (Standard, Accessibility, Premium, Elite, Signature, Ultra Exclusive, Metallic Comet, Royal Duty), many optimized for AMOLED displays with unique animations and design tokens. Theme access can be unlocked via club ranking, special Black Card access, Metallic Comet Card ownership, or Royal Duty Card ownership. The Metallic Comet tier includes 6 ultra-premium themes (Obsidian Gold Ultra, Mint Prestige, Crystal Court, Phosphor Elite, Adaptive Pro, Royal Indigo) unlocked exclusively by receiving the admin-gifted Metallic Comet recognition card. The Royal Duty tier includes 6 ultra-premium light-background themes (Champagne Pearl, Coral Luxe, Arctic Frost, Retro Cream-Tech, Lavender Opulence, Champagne Mint Modern) unlocked exclusively by receiving the admin-gifted Royal Duty recognition card, featuring hyper-realistic textures, frosted glass effects, custom typography, and premium micro-interactions. The Signature tier includes 6 nature-inspired light themes (Tropical Dawn, Savanna Breeze, Rainforest Canopy, Misty Bamboo, Tropical Lagoon, Sunset Savannah) unlocked by achieving top-10 club ranking. All dark themes feature enhanced visual variety with ambient lighting, radial gradient overlays, reflective card surfaces, and textured elements. A global Ultra-Premium Transparent Glass UI system applies to all dark themes: true glassmorphism cards with backdrop-filter blur(30px), neo-tactile button press animations, premium CTA gradient buttons with reflective streak, sport-engraved racket string texture overlays, glass-treated dialogs/sidebars/inputs/tables, high-contrast data visualization with glow effects, and accent glow utility classes.

### Technical Implementations
- **Role-Based Access Control (RBAC)**: Granular permissions at platform and club levels.
- **Multi-Club Support**: Manages multiple independent clubs with separate data and administration.
- **Match Management**: Includes a visual court component, queuing system, and a deterministic Smart Match Engine with gender-aware logic and 9-tier grade-based scoring.
- **Membership System**: Handles club-based memberships, plans, requests, and approvals.
- **Dynamic Leaderboard System**: Computes player rankings from completed matches.
- **Financial Dashboard & Credit System**: Provides financial oversight, credit management, and a donation system.
- **Admin & Player Management**: Tools for comprehensive user, club, venue, and administrator management.
- **Recurring Events System**: Facilitates single or recurring session creation with scheduled publishing.
- **Session Player Management**: Enhanced in-session controls with a four-state participant system.
- **Coach Directory & Marketplace**: Manages and lists public coach profiles.
- **Global Account Merge System**: OWNER-only tool for merging duplicate user accounts across the platform with a 5-step wizard for data consolidation.
- **IT Helpdesk Ticketing System**: Secure, ticket-based support system with RBAC.
- **Automatic Player Grading System**: 9-tier skill grading with automatic promotion/demotion.
- **Club-Scoped Referral System**: Independent referral programs per club.
- **Junior Management**: Comprehensive features for managing junior players, including skill tracking, exercise challenges, and parent-facing dashboards.
- **League Management System**: Full league fixture and results management, supporting multiple named leagues per club.
- **Payment & Credit Request System**: Players can confirm payments and request credits in-app, triggering admin notifications and support tickets.
- **Internal Messaging System**: Chat interface with message categories (General, Payment, System) and filtering.
- **AI-Powered Reporting**: AI-generated reports for coaches (junior skill analytics, personalized progress reports), parents (junior progress reports with PDF download), and admins (financial, match, attendance summaries).
- **Enhanced Badge Count System**: Sidebar badges for notifications, tickets, messages, announcements, upcoming sessions, pending memberships, outstanding payments, and rewards.
- **Typography Studio**: Font customization system with 20 fonts across 5 categories (Free, Sport, Modern, Luxury, Black Card Exclusive). Tier-gated: free fonts for all, sport/modern/luxury for premium, black card exclusive for black card holders. Supports "entire app" or "headings only" application modes. Preferences saved to user profile via `font_family` and `font_mode` columns. Google Fonts loaded dynamically. Hook: `client/src/hooks/use-typography.ts`, Page: `client/src/pages/TypographyStudio.tsx`.
- **Sidebar Hide/Lock System**: Collapsible sidebar with optional PIN protection. "Hide Menu" button in sidebar footer collapses sidebar, a floating arrow tab on the left edge reveals it. Admin/Owner can set a 4-20 char PIN via key icon in sidebar footer; when set, the PIN is required to unhide the sidebar. Hidden state stored in localStorage, shared globally via module-level pub/sub pattern. PIN stored in `sidebar_pin` column on users table. APIs: `PUT /api/user/sidebar-pin`, `POST /api/user/sidebar-pin/verify`, `GET /api/user/sidebar-pin/status`. Main content area (`AuthenticatedShell` in `App.tsx`) smoothly expands/collapses via `transition-[margin]`.
- **Premium Recognition Cards System**: Admin-gifted recognition cards celebrating character, leadership, and contribution. 12 card types (Heart of the Club, Captain's Spirit, Fair Play Champion, Rising Star, Community Builder, Ironclad Commitment, Mentor's Touch, Trailblazer, Silent Guardian, Golden Racket, Metallic Comet, Royal Duty) with 5 rarity levels (Standard, Rare, Epic, Legendary, Mythic). Features 3D flippable cards with unique gradients, a Premium Wallet display on Profile, and full-screen carousel viewer. The Metallic Comet card unlocks the exclusive Metallic Comet theme tier. The Royal Duty card unlocks the exclusive Royal Duty theme tier. Schema: `cards` and `user_cards` tables.

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

### Premium UI Components (`client/src/components/premium/`)
- **GlassCard**: Glassmorphism card with Framer Motion hover lift, variant prop (default/elevated/subtle/frosted), optional glow color.
- **DataCard**: Data visualization card with headline metric, trend indicator, glow accent classes.
- **GradientButton**: Multi-gradient CTA button with reflective streak animation and press compression.
- **ClayButton**: Neo-tactile clay button with extruded depth shadows and press inversion.
- **ChartCard**: Glass-styled chart container with title/subtitle header.

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