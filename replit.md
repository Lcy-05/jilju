# 질주 (Jilju) - Korean Location-Based Benefits Discovery Platform

## Overview
질주 (Jilju) is a Korean location-based platform connecting users with nearby merchant benefits, coupons, and promotions. It supports multiple user roles (USER, MERCHANT_OWNER, OPERATOR, ADMIN) and features merchant registration, an admin console, and a robust RBAC system. The platform aims to serve as a comprehensive solution for local businesses to attract customers and for users to easily discover valuable deals, ultimately fostering local commerce in Jeju.

## Recent Changes
**2025-11-04: Latest Updates (1,206 Unique Merchants, 1,211 Benefits)**

### Complete Data Import & Cleanup
- **Total Database**: 1,206 unique merchants and 1,211 benefits (all duplicates removed)
- **All Partnership Content Imported**: Every merchant now has benefits, including "제휴 협의 중", "제휴 확정", "혜택 협의 중"
- **Duplicate Removal**: Found and removed 5 duplicate merchants with trailing spaces in names
  - 동명정류장, 랭귀지피디어학원, 여부초밥 신제주점, 제주돈대패삼겹살, 팔미육
  - Merged associated benefits to primary merchant records
  - Zero duplicates remaining in database

### Map Page Image Display Fixed
- **Bottom Sheet Image Fix**: Added proper error handling for images on map page bottom sheet
  - Images now show fallback icon (🎁) when URL fails to load
  - Consistent with discover page behavior using `onError` handler
  - Prevents broken image placeholders in the UI
- **New Import Script**: `scripts/import-excel-incremental.ts` - safely adds new data without deleting existing records
  - Duplicate detection using normalized name+address keys
  - Dry-run mode for safe testing (`--dry-run` flag)
  - Latest incremental import: Added 148 merchants from "151_193(찐막).xlsx"
  - Skips duplicates automatically (1 duplicate detected and skipped)
- **Full Replace Script**: `scripts/import-new-excel.ts` - deletes all data and imports fresh
  - Base import: 1,062 merchants from "제휴_업체_완료_통합_1110개_3.xlsx"
  - Correctly handles coordinate mapping: 위도 (latitude), 경도 (longitude)
  - Maps 권역 (regions) to 8 Jeju zone codes
  - Intelligent category mapping based on description keywords
  - Automatic benefit type extraction (PERCENT/AMOUNT/GIFT) from partnership content

### Naver Maps API Integration Fixed
- **API Parameter Update**: Changed from deprecated `ncpClientId` to new `ncpKeyId` parameter
  - Updated script loading in `client/src/hooks/use-naver-maps.ts`
  - Maps now load successfully without authentication errors
  - Compatible with Naver Cloud Platform's upgraded Maps API service
- **Error Handling**: Added `MapErrorBoundary` component to gracefully handle map loading failures

### Google Sheets Integration Removed
- **Scripts Removed**: Deleted `scripts/import-from-sheets.ts` and `scripts/export-to-sheets.ts`
- **Package Cleanup**: Removed `googleapis` dependency from package.json
- **Data Source**: Application now exclusively uses PostgreSQL database with Excel-based imports
- **Environment Variables**: GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_SPREADSHEET_ID secrets no longer used

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