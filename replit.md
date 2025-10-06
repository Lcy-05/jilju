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
- **Geospatial:** Naver Maps API (NCP Maps API - active integration)
- **Testing:** Playwright (for end-to-end testing)

## Naver Maps Integration

**Current Status (October 4, 2025):**
The application uses Naver Maps JavaScript API v3 for interactive mapping and Naver Cloud Platform (NCP) APIs for geospatial services.

**API Configuration:**
- **Frontend:** Uses `ncpKeyId` parameter for Naver Maps JavaScript API v3
- **Backend:** Uses `X-NCP-APIGW-API-KEY-ID` and `X-NCP-APIGW-API-KEY` headers for server-side API calls
- **Environment Variables:** `VITE_NAVER_MAPS_CLIENT_ID` (frontend), `NAVER_MAPS_CLIENT_ID`, `NAVER_MAPS_CLIENT_SECRET` (backend)
- **Web Service URL:** Configured in NCP console (domain only, no trailing slash)

**Implemented Features:**

1. **Interactive Map (client/src/hooks/use-naver-maps.ts):**
   - ✅ Map initialization with custom center and zoom
   - ✅ Marker management (add, remove, clustering)
   - ✅ Map controls (zoom in/out, current location)
   - ✅ Pan to location
   - ✅ Bounds retrieval
   - ✅ Event handling (click, bounds_changed)

2. **Geocoding Services (server/services/naver-maps.ts):**
   - ✅ Forward geocoding: Address → Coordinates
   - ✅ Reverse geocoding: Coordinates → Address
   - ✅ Distance calculation (Haversine formula)
   - ✅ Distance formatting (m/km)
   - ✅ Static Map URL generation
   - ✅ Directions deep link generation (Naver Map app)

3. **Location Services (client/src/hooks/use-location.ts):**
   - ✅ Browser geolocation API integration
   - ✅ Reverse geocoding for current location
   - ✅ Location caching in localStorage

4. **Map Page (client/src/pages/map.tsx):**
   - ✅ Interactive map with benefit markers
   - ✅ Bottom sheet for benefit list
   - ✅ Location-based search (bbox and lat/lng/radius)
   - ✅ Map controls (zoom, current location)

**Implemented But Not Yet Used:**
- Static Map URL generation (for thumbnails, previews)
- Directions deep link (for navigation to merchant)

**Technical Improvements Needed:**

1. **Location Data Format:**
   - Current: `merchant.location` stored as `"lat,lng"` string in database
   - Needed: Parse to `{lat: number, lng: number}` object for frontend use
   - Impact: Currently handled in frontend parsing, but should be normalized

2. **Geospatial Queries:**
   - Current: `getBenefitsNearby` returns all ACTIVE benefits (no true filtering)
   - Needed: PostGIS extension for efficient spatial queries
   - Features: Distance-based filtering, radius search, bbox queries, spatial indexing

3. **Map Markers:**
   - Current: Infrastructure ready (marker clustering, custom icons)
   - Needed: Parse merchant location strings and display markers on map
   - Status: Location data now available through API with merchant info

**Planned Enhancements:**

1. **Advanced Map Features:**
   - Heat maps for benefit density
   - Drawing tools for custom search areas
   - Route optimization for multiple merchants
   - Real-time traffic integration

2. **Static Map Usage:**
   - Benefit card thumbnails
   - Share previews (Open Graph images)
   - Email notifications with map snapshots

3. **Navigation Features:**
   - In-app directions to merchant
   - Walking/driving time estimates
   - Public transit integration (if available from Naver)

4. **Performance Optimizations:**
   - Marker viewport culling
   - Lazy loading for distant markers
   - Debounced bounds change events
   - Progressive marker loading

**Recent Changes (October 4, 2025):**
- Fixed header UX: Removed from map/saved/profile pages, made compact on home/discover
- Connected map zoom controls to Naver Maps API
- Implemented database seeding with test merchants and benefits in Seoul and Jeju
- Enhanced `getBenefitsNearby` to join merchant location data
- Added lat/lng/radius parameter support to `/api/benefits/search`
- **Map UX Improvements:**
  - Enabled map dragging (draggable, pinchZoom, scrollWheel, kinetic pan)
  - Redesigned bottom sheet drag handle: #D9D9D9 color, 36px × 4px pill shape
  - Updated home category icons: transparent background, larger size (text-3xl)
- **Jeju Region System:**
  - Implemented 8-zone classification (아라권, 삼화권, 시청권, 공항연안권, 노형권, 동부권, 서부권, 서귀포권)
  - Added region detection using Haversine formula
  - Map click shows region badge with filter functionality
  - URL parameter support: `/map?region=jeju` centers on Jeju
- **Location Data Optimization:**
  - Fixed critical location parsing bug (prevented {lat:0,lng:0} fallback)
  - Implemented useMemo for location normalization (parse once, cache results)
  - Merchant locations now correctly parsed from JSON strings to objects

**Map Screen Improvements (October 5, 2025):**
- **Jeju Island Default Center:** Map now initializes centered on Jeju Island (33.4996, 126.5312) with zoom level 11, showing the entire island region by default
- **Fixed Z-Index Hierarchy:**
  - Bottom Navigation: z-[1000] (always on top)
  - Map Controls (zoom, location): z-[950]
  - Bottom Sheet: z-[900]
  - Map Container: z-[800]
- **Layout and Safe-Area Support:**
  - Map container uses 100vh with padding-bottom: calc(64px + env(safe-area-inset-bottom))
  - Bottom sheet positioned at calc(64px + env(safe-area-inset-bottom)) from bottom
  - Both bottom sheet and navigation use max-w-md mx-auto for responsive centering
  - Proper safe-area handling for devices with notches (iPhone, etc.)
- **Map Drag Functionality:** Verified map dragging works properly without interference from bottom sheet
- **Bottom Navigation Visibility:** Bottom tab bar always visible and accessible, never covered by map or bottom sheet
- **Distance Calculation Fix:** Changed DEFAULT_LOCATION from Seoul to Jeju Island (33.4996, 126.5312), ensuring accurate distance calculations when user location is unavailable. Distance now correctly shows 0-50km range for Jeju Island merchants instead of incorrect 462.9km values.
## Database & Backend Infrastructure Updates (October 6, 2025)

**New Database Tables:**
- `home_banners`: Admin-editable carousel banners with ordering and active status
- `benefit_versions`: Version history for benefit rollback and A/B testing
- `event_logs`: Comprehensive analytics event tracking for all user actions
- `daily_merchant_kpis`: Pre-aggregated daily analytics for merchant dashboards
- Updated `categories`: Simplified to 5 main categories (뷰티, 쇼핑, 음식, 카페, 헬스)
- Added `category_id` foreign keys to both `merchants` and `benefits` tables

**Storage Layer Extensions:**
- Home Banner CRUD: getHomeBanners, createHomeBanner, updateHomeBanner, deleteHomeBanner
- Event Logging: logEvent (with full metadata), getEventLogs (with comprehensive filtering)
- Analytics: getMerchantKpis (date range queries), getAnalyticsSummary (period aggregation with CTR/conversion)

**New Backend API Endpoints:**
- `GET /api/categories` - Returns active categories for home page quick access
- `GET /api/banners` - Returns ordered banners for home carousel
- `POST /api/banners` - Admin-only banner creation
- `PATCH /api/banners/:id` - Admin-only banner updates
- `DELETE /api/banners/:id` - Admin-only banner deletion
- `POST /api/events` - Universal event logging endpoint (supports anonymous & authenticated users)
- `GET /api/analytics/merchant/:merchantId` - Merchant analytics with period/date range support

**Data Migration Completed:**
- All 113 existing merchants assigned to appropriate categories
- All 100 existing benefits inherited categories from their merchants
- 3 sample banners seeded with Unsplash imagery

**Status:** Backend infrastructure complete for consumer app Phase 3. Merchant Center (Phase 4) and Admin Backoffice (Phase 5) require additional frontend implementation.
