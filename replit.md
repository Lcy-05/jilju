# 질주 (Jilju) - Korean Location-Based Benefits Discovery Platform

## Overview
질주 (Jilju) is a Korean location-based platform connecting users with nearby merchant benefits, coupons, and promotions. It supports multiple user roles (USER, MERCHANT_OWNER, OPERATOR, ADMIN) and features merchant registration, an admin console, and a robust RBAC system. The platform aims to serve as a comprehensive solution for local businesses to attract customers and for users to easily discover valuable deals, ultimately fostering local commerce in Jeju.

## User Preferences
I prefer clear, concise, and direct instructions. When suggesting code changes, provide the exact code snippets or file modifications needed. For new features, outline the steps required for implementation, from schema definition to API routes and frontend integration. Always prioritize security best practices, especially concerning user data and authentication. When making changes, avoid modifying primary key ID column types in existing tables. Use `npm run db:push --force` only when absolutely necessary.

## System Architecture
The application features a React 18 + Vite frontend and a Node.js + Express.js backend, all built with TypeScript. PostgreSQL (Neon-backed) with Drizzle ORM is used for data persistence.

**UI/UX Decisions:**
- **Design System:** "Dark floating cards on solid background" aesthetic with bold red accents and optimized Korean typography (Gmarket Sans Light 300, Medium 500, Bold 700).
- **Navigation:** A 5-tab bottom navigation bar (`Home`, `Discover`, `Map`, `Saved`, `Profile`) with semi-transparent black background and red active states.
- **Components:** Tailwind CSS and shadcn/ui (built on Radix UI and Lucide React icons) for styling.
- **Forms:** `react-hook-form` with `zod` for validation.
- **Splash Screen:** Dedicated launch animation with Framer Motion (fade-in, display, fade-out, logo scale animation).
- **Profile Page:** Simplified for regular users, displaying real-time "Total Benefits" and "Bookmarks" counts, and offering inquiry submission.
- **Admin Interfaces:** Dedicated pages for chat management and inquiry management with real-time updates, filtering, and response capabilities.

**Technical Implementations:**
- **State Management:** `@tanstack/react-query` v5 for server state.
- **Routing:** `wouter` for client-side routing.
- **Authentication:** Stateless JWT with `bcrypt` (12 salt rounds) for password hashing. JWTs expire in 7 days and contain user ID, email, name, and roles.
- **Authorization:** Role-Based Access Control (RBAC) supporting `USER`, `MERCHANT_OWNER`, `OPERATOR`, `ADMIN` roles.
- **Storage Layer:** An `IStorage` interface (`server/storage.ts`) abstracts data access, implemented by `DatabaseStorage` using Drizzle ORM.
- **Multi-environment Configuration:** Supports Production, Development/Staging, Local Development, and Replit Preview.
- **Geospatial:** Database-driven region system with 8 Jeju zones; `GET /api/regions/detect` endpoint for coordinate-based region detection. Comprehensive region-dong mapping system.
- **Real-time Chat:** 1:1 chat rooms between users and admin/operator, with real-time polling, message management (edit/delete), and unread counts.
- **Inquiry System:** User inquiry submission and admin response/status management.

**Feature Specifications:**
- **Authentication:** User registration, login, protected endpoints.
- **Key Features:**
    - **HP_SCORE Algorithm:** Weighted scoring for home page recommendations.
    - **Coupon System:** Generation, validation (with geofencing), and redemption.
    - **Merchant Wizard:** Multi-step onboarding for merchants.
    - **Admin Console:** Interface for managing merchants, users, roles, inquiries, and chat.
    - **Home Page Enhancements:** Dynamic banner carousel, category quick access buttons.
    - **Discover Page:** Complete URL/State synchronization for all filters (categories, types, regions, nowOpen, sort, search query).
    - **Merchant Center:** Dashboard, Store Management, and Benefits Management with real data integration and robust validation for `MERCHANT_OWNER` users.

**System Design Choices:**
- **Database Schema:** Includes `users`, `roles`, `merchants`, `benefits`, `categories`, `regions`, `coupons`, `coupon_redemptions`, `user_bookmarks`, `merchant_applications`, `home_banners`, `benefit_versions`, `event_logs`, `daily_merchant_kpis`, `inquiries`, `chat_rooms`, `chat_messages`.
- **Development Workflow:** Schema-first development with Drizzle ORM; `npm run db:push` syncs schema.
- **Security:** Password fields are stripped from API responses; JWT verification for protected routes.
- **Map Page Integration:** Database-based region detection, region badge display, URL parameter support for regions. Z-index hierarchy for map, bottom sheet, and navigation.
- **API Endpoints:** Comprehensive API for all features, including dedicated endpoints for chat, inquiries, user stats, and admin functionalities.

## External Dependencies
- **Database:** PostgreSQL (Neon-backed)
- **ORM:** Drizzle ORM
- **Authentication:** JWT (JSON Web Tokens), bcrypt
- **UI Frameworks/Libraries:** React, Vite, wouter, @tanstack/react-query, Tailwind CSS, shadcn/ui, Radix UI, Lucide React, react-hook-form, zod, Embla Carousel, Framer Motion.
- **Geospatial:** Naver Maps API (NCP Maps API - for interactive maps and geocoding services), PostGIS (planned).
- **Testing:** Playwright (for end-to-end testing).