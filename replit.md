# 질주 (Jilju) - Korean Location-Based Benefits Discovery Platform

## Overview
질주 (Jilju) is a Korean location-based platform designed to connect users with nearby merchant benefits, coupons, and promotions. It supports multiple user roles (USER, MERCHANT_OWNER, OPERATOR, ADMIN) and features merchant registration, an admin console, and a robust RBAC system. The platform aims to be a comprehensive solution for local businesses to attract customers and for users to easily discover valuable deals.

## Recent Changes
**2025-10-30: Profile Page Simplification & User Stats Integration**
- **Profile Page Redesign**: Simplified for regular users by removing merchant-specific features
  - Removed "업주 전용" (Merchant-only) section and "권한 센터" (Permissions Center)
  - Removed "발급 쿠폰" (Issued Coupons) and "사용 완료" (Used) stats
  - Added real data integration: "전체 제휴" (Total Benefits) and "즐겨찾기" (Bookmarks) with live counts
  - Reorganized support section: added "문의하기" (Inquiries), kept "고객센터" (Help Center), "약관 및 정책" (Terms & Policies), and "로그아웃" (Logout)
- **New API Endpoint**: `GET /api/users/:userId/stats` returns `{ totalBenefits: number, bookmarks: number }`
- **Storage Layer**: Added `getUserStats()` method to fetch active benefits count and user's bookmark count
- **BenefitCard Typography**: Changed merchant name from `font-semibold` to `font-light` for Gmarket Sans Light 300 weight
- **BenefitCard Layout Fix**: Converted horizontal layout from grid to flex to prevent text/image overlap in narrow viewports

**2025-10-30: Custom Korean Typography & Design Refinements**
- **Typography**: Gmarket Sans font family implemented with three weights (Light 300, Medium 500, Bold 700) for Korean text optimization
- **Home Page**: Removed Black Friday (블프) section; partnership posters with reduced shadow (`shadow-[0_6px_12px_rgba(0,0,0,0.5)]`) and height limit (`max-h-[400px]`)
- **Discover Page**: Unified header/filter bar with shared dark background (`bg-black/40 backdrop-blur-md`), increased vertical padding (`pt-4 pb-4`)
- **Global Background**: Solid dark brown color (#1a0a0a) applied to body for clean, minimalist aesthetic
- **Primary Accent Color**: Changed from hot pink to pure red (#ff0000, `hsl(0, 100%, 50%)`) for all interactive elements, active tabs, and buttons
- **Bottom Navigation**: Semi-transparent black background (`bg-black/50`) with backdrop-blur-[10px]; icons/text use red for active state, white/70 for inactive
- **All Pages**: Consistent dark solid background across all tabs (Home, Discover, Map, Saved, Profile)
- **Design Goal**: "Dark floating cards on solid background" aesthetic with bold red accents and optimized Korean typography

**2025-10-17: BenefitCard Layout Refactor - Grid-Based Design**
- **Absolute positioning eliminated**: Removed all absolute badge positioning (primary cause of overlap)
- **Grid 2-column structure**: Implemented `grid-cols-[1fr_auto]` to separate content/bookmark areas
- **Content-driven heights**: Added `h-auto` to all cards, removed fixed heights (thumbnails removed from horizontal variant)
- **Badge text optimization**: All badges use `whitespace-nowrap` to prevent line breaks
- **Label abbreviation**: "지금 사용 가능" → "바로 사용" (3-character reduction for mobile efficiency)
- **NEW badge integration**: Converted from absolute overlay to `showNewBadge` prop (bg-red-500)
- **Reserved icon area**: Right column in grid always reserves space for bookmark button
- **Badge styling**: Solid backgrounds (pink-500 for availability, red-500 for NEW, type-specific colors)
- **Responsive sizing**: mobile (text-[10px], px-1.5) → tablet+ (text-xs, px-2)
- **Discover page header integration**: Search bar and filter area unified as single visual block (shadow-none, bg-card, padding adjusted to touch seamlessly)

**2025-10-16: UI/UX Improvements**
- Fixed z-index hierarchy on map page (Bottom Navigation: z-1000, BottomSheet: z-900) to enable bottom navigation clicks
- Added region filter to discover page with URL persistence for shareable, bookmarkable searches
- Improved "총 n개의 혜택" header layout with better spacing (pt-6) and visibility (text-base, font-medium)
- Enhanced badge designs: type badges (증정, 할인%, etc.) upgraded to text-sm, font-semibold, px-3 py-1
- Enhanced "지금 사용 가능" badge with Badge component, text-sm, font-medium styling for better visibility

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
    - **Discover Page:** Complete URL/State synchronization for all filters (categories, types, regions, nowOpen, sort, search query). Region filters enable location-based discovery with URL persistence.
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
- **New Backend API Endpoints:** `/api/categories`, `/api/banners`, `/api/events`, `/api/analytics/merchant/:merchantId`, `/api/users/:userId/stats`.

## External Dependencies
- **Database:** PostgreSQL (Neon-backed)
- **ORM:** Drizzle ORM
- **Authentication:** JWT (JSON Web Tokens), bcrypt
- **UI Frameworks/Libraries:** React, Vite, wouter, @tanstack/react-query, Tailwind CSS, shadcn/ui, Radix UI, Lucide React, react-hook-form, zod, Embla Carousel.
- **Geospatial:** Naver Maps API (NCP Maps API - for interactive maps and geocoding services), PostGIS (planned).
- **Testing:** Playwright (for end-to-end testing).