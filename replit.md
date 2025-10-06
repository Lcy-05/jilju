# 질주 (Jilju) - Korean Location-Based Benefits Discovery Platform

## Overview
질주 (Jilju) is a Korean location-based platform designed to connect users with nearby merchant benefits, coupons, and promotions. It supports multiple user roles (USER, MERCHANT_OWNER, OPERATOR, ADMIN) and features merchant registration, an admin console, and a robust RBAC system. The platform aims to be a comprehensive solution for local businesses to attract customers and for users to easily discover valuable deals.

## User Preferences
I prefer clear, concise, and direct instructions. When suggesting code changes, provide the exact code snippets or file modifications needed. For new features, outline the steps required for implementation, from schema definition to API routes and frontend integration. Always prioritize security best practices, especially concerning user data and authentication. When making changes, avoid modifying primary key ID column types in existing tables. Use `npm run db:push --force` only when absolutely necessary.

## System Architecture
The application features a React 18 + Vite frontend and a Node.js + Express.js backend, all built with TypeScript. PostgreSQL (Neon-backed) with Drizzle ORM is used for data persistence.

**UI/UX Decisions:**
- **Navigation:** A 5-tab bottom navigation bar (`Home`, `Discover`, `Map`, `Saved`, `Profile`).
- **Components:** Tailwind CSS and shadcn/ui (built on Radix UI and Lucide React icons) for styling.
- **Forms:** `react-hook-form` with `zod` for validation.

**Technical Implementations:**
- **State Management:** `@tanstack/react-query` v5 for server state.
- **Routing:** `wouter` for client-side routing.
- **Authentication:** Stateless JWT with `bcrypt` (12 salt rounds) for password hashing. JWTs expire in 7 days and contain user ID, email, name, and roles. New users get a default `USER` role.
- **Authorization:** Role-Based Access Control (RBAC) supporting `USER`, `MERCHANT_OWNER`, `OPERATOR`, `ADMIN` roles.
- **Storage Layer:** An `IStorage` interface (`server/storage.ts`) abstracts data access, implemented by `DatabaseStorage` using Drizzle ORM.
- **Multi-environment Configuration:** Supports Production, Development/Staging, Local Development, and Replit Preview.

**Feature Specifications:**
- **Authentication:** User registration, login, protected endpoints.
- **User Roles:** Distinct permissions for each role.
- **Key Features:**
    - **HP_SCORE Algorithm:** Weighted scoring for home page recommendations.
    - **Geospatial Queries:** Planned integration with PostGIS for location-based searches.
    - **Coupon System:** Generation, validation (with geofencing), and redemption.
    - **Merchant Wizard:** Multi-step onboarding for merchants.
    - **Admin Console:** Interface for managing merchants, users, and roles.
    - **Database-Driven Region System:** `regions` table with 8 Jeju zones, `GET /api/regions/detect` endpoint for coordinate-based region detection.
    - **Home Page Enhancements:** Dynamic banner carousel, category quick access buttons.
    - **Discover Page:** Complete URL/State synchronization for filters.
    - **Merchant Center:** Dashboard, Store Management, and Benefits Management with real data integration and robust validation for `MERCHANT_OWNER` users.

**System Design Choices:**
- **Database Schema:** Includes `users`, `roles`, `merchants`, `benefits`, `categories`, `regions`, `coupons`, `coupon_redemptions`, `user_bookmarks`, `merchant_applications`, `home_banners`, `benefit_versions`, `event_logs`, `daily_merchant_kpis`.
- **Development Workflow:** Schema-first development with Drizzle ORM; `npm run db:push` syncs schema.
- **Security:** Password fields are stripped from API responses; JWT verification for protected routes.
- **Map Page Integration:** Database-based region detection, region badge display, URL parameter support for regions.
- **Layout & Safe-Area Support:** Map and bottom sheet adhere to `100vh` and safe-area insets.
- **Z-Index Hierarchy:** Bottom Navigation (z-[1000]), Map Controls (z-[950]), Bottom Sheet (z-[900]), Map Container (z-[800]).
- **New Database Tables:** `home_banners` (admin-editable carousel), `benefit_versions` (history), `event_logs` (analytics), `daily_merchant_kpis` (aggregated analytics).
- **Updated Categories:** Simplified to 5 main categories (`뷰티`, `쇼핑`, `음식`, `카페`, `헬스`).
- **Storage Layer Extensions:** CRUD for home banners, event logging, analytics retrieval.
- **New Backend API Endpoints:** `/api/categories`, `/api/banners`, `/api/events`, `/api/analytics/merchant/:merchantId`.

## External Dependencies
- **Database:** PostgreSQL (Neon-backed)
- **ORM:** Drizzle ORM
- **Authentication:** JWT (JSON Web Tokens), bcrypt
- **UI Frameworks/Libraries:** React, Vite, wouter, @tanstack/react-query, Tailwind CSS, shadcn/ui, Radix UI, Lucide React, react-hook-form, zod, Embla Carousel.
- **Geospatial:** Naver Maps API (NCP Maps API - for interactive maps and geocoding services), PostGIS (planned).
- **Testing:** Playwright (for end-to-end testing).