# 질주 (Jilju) - Korean Location-Based Benefits Discovery Platform

## Overview

질주 (Jilju) is a Korean location-based platform designed to help users discover nearby merchant benefits, issue and redeem coupons. The platform supports multiple user roles (USER, MERCHANT_OWNER, OPERATOR, ADMIN) and includes features for merchant registration, an admin console, and a robust RBAC system. The project aims to provide a comprehensive solution for local businesses to attract customers through targeted promotions and for users to easily access valuable deals.

## User Preferences

I prefer clear, concise, and direct instructions. When suggesting code changes, provide the exact code snippets or file modifications needed. For new features, outline the steps required for implementation, from schema definition to API routes and frontend integration. Always prioritize security best practices, especially concerning user data and authentication. When making changes, avoid modifying primary key ID column types in existing tables. Use `npm run db:push --force` only when absolutely necessary.

## System Architecture

The application is built with a React 18 + Vite frontend and a Node.js + Express.js backend, leveraging TypeScript across the stack. PostgreSQL (Neon-backed) with Drizzle ORM handles data persistence.

**UI/UX Decisions:**
- **Navigation:** A 5-tab bottom navigation bar (`Home`, `Discover`, `Map`, `Saved`, `Profile`) provides core navigation.
- **Components:** Utilizes Tailwind CSS and shadcn/ui for styling, built on Radix UI primitives and Lucide React icons.
- **Forms:** `react-hook-form` with `zod` for validation ensures robust form handling.

**Technical Implementations:**
- **State Management:** `@tanstack/react-query` v5 for server state.
- **Routing:** `wouter` for lightweight client-side routing.
- **Authentication:** Stateless JWT with `bcrypt` (12 salt rounds) for password hashing. JWTs include user ID, email, name, and roles, expiring in 7 days. New users are assigned a default `USER` role.
- **Authorization:** Role-Based Access Control (RBAC) with defined roles: `USER`, `MERCHANT_OWNER`, `OPERATOR`, `ADMIN`.
- **Storage Layer:** An `IStorage` interface (`server/storage.ts`) abstracts data access, implemented by `DatabaseStorage` using Drizzle ORM.
- **Multi-environment Configuration:** Service URLs are configured for Production, Development/Staging, Local Development, and Replit Preview, with automatic environment detection.

**Feature Specifications:**
- **Authentication:** User registration, login, and protected endpoints.
- **User Roles:** Distinct permissions for each role.
- **Key Features (Planned/Partial):**
    - **HP_SCORE Algorithm:** Weighted scoring for home page recommendations based on distance, CTR, issue count, benefit strength, and freshness.
    - **Geospatial Queries:** Planned integration with PostGIS for efficient nearby searches and location-based filtering.
    - **Coupon System:** Generation, validation (with geofencing), and redemption of coupons.
    - **Merchant Wizard:** A multi-step application flow for merchants to onboard and manage their offerings.
    - **Admin Console:** Interface for reviewing merchant applications, managing users, and roles.

**System Design Choices:**
- **Database Schema:** Key tables include `users`, `roles`, `merchants`, `benefits`, `categories`, `regions`, `coupons`, `coupon_redemptions`, `user_bookmarks`, and `merchant_applications`.
- **Development Workflow:** Schema-first development with Drizzle ORM; `npm run db:push` syncs schema.
- **Security:** Password fields are always stripped from API responses. JWT tokens are verified for protected routes.

## External Dependencies

- **Database:** PostgreSQL (Neon-backed)
- **ORM:** Drizzle ORM
- **Authentication:** JWT (JSON Web Tokens), bcrypt
- **UI Frameworks/Libraries:** React, Vite, wouter, @tanstack/react-query, Tailwind CSS, shadcn/ui, Radix UI, Lucide React, react-hook-form, zod.
- **Geospatial:** Naver Maps API (planned integration, credentials needed)
- **Testing:** Playwright (for end-to-end testing)