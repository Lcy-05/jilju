# 질주 (Jilju) - Local Benefits Discovery Platform

## Overview

질주 is a location-based benefits discovery platform that connects users with nearby merchant offers, discounts, and coupons. The application uses real-time geolocation to surface relevant benefits within a configurable radius, featuring a sophisticated search system, interactive map interface, and time-sensitive coupon mechanics.

**Core Purpose**: Enable users to discover and redeem local merchant benefits through location-aware search and mapping, while providing merchants with tools to manage their offers and reach nearby customers.

**Tech Stack**:
- Frontend: React 18 + TypeScript, Vite, Wouter (routing), TanStack Query
- UI: shadcn/ui (Radix UI + Tailwind CSS)
- Backend: Express.js + TypeScript
- Database: PostgreSQL with Drizzle ORM
- Maps: Naver Maps API
- Authentication: JWT with bcrypt

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Component-Based UI with Route-Based Code Splitting**
- Uses Wouter for lightweight client-side routing instead of React Router
- Pages organized by feature: home, discover, map, saved, profile, merchant/admin consoles
- Shared layout components (Header, BottomNavigation) provide consistent navigation
- Modal-based detail views (BenefitModal, CouponModal) for overlay interactions
- Custom hooks centralize business logic (useLocation, useNaverMaps, useAuth)

**State Management Strategy**
- TanStack Query for server state with aggressive caching (5-30 minute stale times)
- React Context for authentication state (AuthProvider)
- Local component state for UI interactions
- URL search params for shareable filter/search state

**Design System Implementation**
- shadcn/ui components with "new-york" style preset
- Tailwind CSS with custom HSL color variables for theming
- CSS custom properties for responsive spacing/shadows
- Poppins font family throughout

### Backend Architecture

**RESTful Express Server with Service Layer Pattern**
- Routes layer (routes.ts) handles HTTP concerns and validation
- Service layer (services/*) encapsulates business logic:
  - `searchService`: BM25-like full-text search with geospatial filtering
  - `couponService`: Time-sensitive coupon issuance with quota management
  - `geolocationService`: IP-based location and reverse geocoding
  - `naverMapsService`: Integration with Naver Maps geocoding APIs
- Storage layer (storage.ts) abstracts database operations
- Middleware for authentication (authenticateToken) and role-based access control

**Authentication & Authorization**
- JWT-based stateless authentication (7-day expiry)
- Role-based access control (RBAC) with user/merchant/operator/admin roles
- Password hashing with bcrypt (12 rounds)
- Scoped permissions via `userRoles` table linking roles to specific merchants

**Database Design Philosophy**
- PostgreSQL with PostGIS for geospatial queries (geography points)
- Drizzle ORM for type-safe database access
- Normalized schema with relational integrity
- Denormalized categoryPath arrays for hierarchical categories
- JSONB fields for flexible merchant hours and benefit rules

### Key Data Models

**Benefits System**
- Benefits belong to merchants with types: PERCENT, AMOUNT, GIFT, MEMBERSHIP
- Geofencing via `geoRadiusM` field (default 150m radius)
- Temporal validity with `validFrom`/`validTo` timestamps
- Student-only restrictions and minimum order requirements
- Flexible rule system via JSONB for complex conditions

**Coupon Mechanics**
- Time-sensitive coupons issued from benefits (10-minute default expiry)
- Status tracking: ACTIVE, USED, EXPIRED, CANCELLED
- Single redemption per coupon with merchant-verified tokens
- Quota enforcement at daily/hourly/per-user levels

**Geospatial Architecture**
- PostGIS geography points for accurate distance calculations
- Bounding box (BBOX) queries for map viewport filtering
- Nearby search with configurable radius (stored in meters)
- Korean administrative regions (시/군/구) for location context

### Search & Discovery Features

**Multi-Strategy Search**
- Full-text search across benefit titles/descriptions and merchant names
- Category-based filtering with hierarchical paths
- Geospatial proximity search (distance-based ranking)
- HP_SCORE algorithm for popularity ranking (weighted by views, bookmarks, redemptions)
- Collaborative filtering for personalized recommendations

**Map Integration**
- Naver Maps SDK for Korean market coverage
- Marker clustering for dense benefit areas
- Real-time viewport-based benefit loading
- Custom marker icons by benefit type
- Drawing tools for geofence visualization

### External Dependencies

**Naver Cloud Platform**
- Naver Maps JavaScript API v3 for map rendering and geocoding
- Client ID/Secret authentication via headers
- Geocoding API for address → coordinates conversion
- Reverse geocoding API for coordinates → address conversion

**Database: Neon Serverless PostgreSQL**
- WebSocket-based connection pooling via `@neondatabase/serverless`
- PostGIS extension enabled for geography data types
- Connection string via `DATABASE_URL` environment variable

**Third-Party UI Libraries**
- Radix UI primitives for accessible components
- Emotion for Material UI icon styling
- embla-carousel for touch-friendly carousels
- date-fns with Korean locale for date formatting
- react-day-picker for calendar interactions

**Development Tools**
- Replit-specific plugins (cartographer, dev-banner) for development environment
- Vite runtime error overlay for debugging
- drizzle-kit for database migrations

**Authentication Requirements**
- `JWT_SECRET` environment variable for token signing
- Fallback to "fallback_secret" in development (insecure)

**API Endpoints Pattern**
- RESTful conventions: `/api/auth/*`, `/api/benefits/*`, `/api/merchants/*`, `/api/coupons/*`
- Consistent JSON responses with error handling
- Query parameter filtering for GET requests
- Request body validation with Zod schemas