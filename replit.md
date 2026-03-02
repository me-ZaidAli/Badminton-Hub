# Club Master - Racket Sports Club Management Platform

## Overview
Club Master is a comprehensive full-stack web application designed to streamline operations for racket sports clubs (badminton, tennis, padel, squash, table tennis) and enhance player engagement. It provides a central platform for session scheduling, dynamic player ranking, match organization, member profiles, and administrative tasks. The system supports robust role-based access control, multi-club management, and a 2-plan freemium model. Its vision is to be the leading platform for racket sports clubs globally, significantly improving club efficiency and player satisfaction.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
The application uses React 18, TypeScript, Wouter, TanStack React Query, Tailwind CSS, and shadcn/ui for the frontend. The backend is built with Node.js, Express.js, and TypeScript, utilizing PostgreSQL as the database with Drizzle ORM.

### Plan & Billing System
A 2-plan freemium model (Basic FREE, Premium) is implemented with a clear plan status flow and backend enforcement via `requirePremium` middleware on premium-only API routes. Frontend gating ensures premium features are only accessible to active premium clubs. Key features like rankings, analytics, and advanced management tools are exclusive to the Premium plan, while basic club operations remain free.

### Multi-Sport Support
The platform supports multiple racket sports, allowing clubs to select one or more sport types, which are then reflected across the application for tailored experiences.

### UI/UX Decisions
The UI features a modern design with a privacy-enhanced public view, comprehensive player profiles, and an animated anniversary countdown. A sophisticated Premium Theme System offers 35 themes across 5 tiers (Standard, Accessibility, Premium, Elite, Signature, Ultra Exclusive), many optimized for AMOLED displays with unique animations and design tokens. Theme access can be unlocked via club ranking or special Black Card access, which is managed via a dedicated admin interface.

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
- **Premium Recognition Cards System**: Admin-gifted recognition cards celebrating character, leadership, and contribution. 10 card types (Heart of the Club, Captain's Spirit, Fair Play Champion, Rising Star, Community Builder, Ironclad Commitment, Mentor's Touch, Trailblazer, Silent Guardian, Golden Racket) with 5 rarity levels (Standard, Rare, Epic, Legendary, Mythic). Features 3D flippable cards with unique gradients, a Premium Wallet display on Profile, and full-screen carousel viewer. Schema: `cards` and `user_cards` tables.

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