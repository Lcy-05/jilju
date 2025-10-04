# 질주 (Jilju) - Korean Location-Based Benefits Discovery Platform

## Project Overview

**질주 (Jilju)** is a Korean location-based benefits discovery and coupon platform that helps users find nearby merchant benefits, issue coupons, and redeem them at participating merchants. The platform supports multiple user roles and includes merchant registration, admin console, and RBAC (Role-Based Access Control) system.

## Service URLs

The application is configured to work across different environments:

- **Production**: https://jilju.co.kr
- **Development/Staging**: https://dev.jilju.co.kr  
- **Local Development**: http://localhost:5000
- **Replit Preview**: Uses `window.location.origin` (auto-detected)

URLs are configured in `client/src/lib/constants.ts` with automatic environment detection.

## Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Routing**: wouter (lightweight React router)
- **State Management**: @tanstack/react-query v5 for server state
- **Styling**: Tailwind CSS + shadcn/ui components
- **UI Components**: Radix UI primitives, Lucide React icons
- **Forms**: react-hook-form + zod validation

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon-backed) with Drizzle ORM
- **Authentication**: Stateless JWT + bcrypt (12 salt rounds)
- **Session**: None - uses JWT tokens only (no server-side sessions)

### Development
- **Build Tool**: Vite
- **Language**: TypeScript
- **Package Manager**: npm

## Architecture

### Application Structure (Implemented)

```
질주 (Jilju)
├── 5-Tab Navigation (Bottom Bar) ✅
│   ├── 홈 (Home) - Landing page with banner ✅
│   ├── 탐색 (Discover) - Empty state (TODO: search & filter) 🚧
│   ├── 지도 (Map) - Empty state (TODO: Naver Maps integration) 🚧
│   ├── 저장함 (Saved) - Login prompt (TODO: bookmarks & coupons) 🚧
│   └── 내 정보 (Profile) - User profile with roles & stats ✅
├── Authentication - Register, login, JWT tokens ✅
├── Merchant Wizard (S0-S8) - Placeholder route (TODO: implement) 🚧
└── Admin Console - Placeholder route (TODO: implement) 🚧
```

### User Roles (RBAC)

1. **USER** (Default)
   - View benefits and merchants
   - Bookmark benefits
   - Issue and redeem coupons
   - Permissions: `benefit:view`, `benefit:bookmark`, `coupon:issue`, `coupon:redeem`

2. **MERCHANT_OWNER**
   - Manage own merchant(s) and benefits
   - Create and update benefits
   - Permissions: `benefit:view`, `benefit:create`, `benefit:update`, `merchant:manage`

3. **OPERATOR**
   - Invite and onboard merchants
   - Search merchant applications
   - Permissions: `benefit:view`, `merchant:invite`, `merchant:search`

4. **ADMIN**
   - Full platform access
   - Review merchant applications
   - Manage all users and roles
   - Permissions: `*` (all)

## Database Schema

### Key Tables

- **users** - User accounts (id: uuid, email, password hash, name)
- **roles** - Role definitions (USER, MERCHANT_OWNER, OPERATOR, ADMIN)
- **user_roles** - User-role assignments (many-to-many)
- **merchants** - Merchant businesses
- **benefits** - Benefits/offers from merchants
- **categories** - Benefit categories (음식, 카페, 쇼핑, 뷰티, 헬스)
- **regions** - Geographic regions (서울, 부산, 대구)
- **coupons** - Issued coupons with QR codes
- **coupon_redemptions** - Redemption history
- **user_bookmarks** - User-saved benefits
- **merchant_applications** - Merchant onboarding applications

### Seeded Data

The database is pre-populated with:

- **4 Roles**: USER, MERCHANT_OWNER, OPERATOR, ADMIN
- **5 Categories**: 음식, 카페, 쇼핑, 뷰티, 헬스
- **3 Regions**: 서울특별시, 부산광역시, 대구광역시

## Authentication System

### Implementation

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Tokens**: 7-day expiry, includes user id, email, name, and roles
- **Default Role**: New users automatically assigned USER role
- **Security**: Password field explicitly stripped from all API responses

### API Endpoints

#### POST /api/auth/register
- Request: `{ email, password, name }`
- Response: `{ user: { id, email, name }, token }`
- Status: 201 (success), 400 (validation/duplicate)

#### POST /api/auth/login
- Request: `{ email, password }`
- Response: `{ user: { id, email, name, roles }, token }`
- Status: 200 (success), 401 (invalid credentials)

#### GET /api/auth/me (Protected)
- Headers: `Authorization: Bearer <token>`
- Response: `{ id, email, name, roles }`
- Status: 200 (success), 401 (no auth), 403 (invalid token)

### Frontend Integration

- **AuthProvider**: React context providing `{ user, token, login, register, logout, isAuthenticated, hasRole }`
- **Token Storage**: localStorage under `STORAGE_KEYS.AUTH_TOKEN`
- **Protected Routes**: Use `withAuth()` HOC for role-based access control

## Storage Layer

### IStorage Interface

Located in `server/storage.ts`, the storage interface defines all data access methods:

- **User Operations**: getUser, getUserByEmail, createUser, assignUserRole, getUserRoles, getUserPermissions
- **Benefit Operations**: getBenefit, getBenefitsNearby, getPopularBenefits, getRecommendedBenefits, searchBenefits
- **Merchant Operations**: getMerchant, getMerchantsNearby, searchMerchants
- **Coupon Operations**: issueCoupon, validateCoupon, redeemCoupon, getUserCoupons
- **Bookmark Operations**: bookmarkBenefit, unbookmarkBenefit, getUserBookmarks
- **Geography**: getRegions, getCategories, reverseGeocode

### DatabaseStorage Implementation

The `DatabaseStorage` class implements the `IStorage` interface using Drizzle ORM with PostgreSQL.

**Important Note**: All storage methods that query users must NOT include the password field in responses. The password should only be retrieved for authentication purposes and immediately stripped before returning to clients.

## Key Features

### Key Features (Implementation Status)

#### 1. HP_SCORE Algorithm 🚧 (PLANNED)

Home page recommendations will use a weighted scoring algorithm:

```
HP_SCORE = (distance × 0.35) + (CTR × 0.2) + (issue_count × 0.2) + (benefit_strength × 0.2) + (freshness × 0.05)
```

**Status**: Algorithm defined but not yet implemented. Storage methods exist but need benefit data and scoring logic.

#### 2. Geospatial Queries 🚧 (PARTIAL)

- **Storage Methods**: `getBenefitsNearby()`, `getMerchantsNearby()` defined but return all results (no filtering)
- **Location Data**: Using text columns temporarily (not PostGIS)
- **TODO**: Implement PostGIS spatial indexing, BBOX search, radius filtering

#### 3. Coupon System 🚧 (DEFINED)

Storage interface methods defined:
- `issueCoupon()` - Issue coupon to user
- `validateCoupon()` - Validate with geofencing
- `redeemCoupon()` - Redeem at merchant
- `getUserCoupons()` - Get user's coupons by status

**Status**: Database schema and methods exist, but no benefits data or QR code generation yet.

#### 4. Merchant Wizard (S0-S8) 🚧 (PLACEHOLDER)

Multi-step merchant application flow planned:
- S0: Welcome
- S1-S2: Business info
- S3-S4: Location & hours
- S5-S6: Benefits & media
- S7: Review
- S8: Submission

**Status**: Route exists at `/merchant/wizard` but UI not implemented.

## Development Workflow

### Starting the App

```bash
npm run dev
```

This starts both Express backend and Vite frontend on port 5000.

### Database Operations

The app uses Drizzle ORM with schema-first development:

1. Update schema in `shared/schema.ts`
2. For each model, create:
   - Insert schema using `createInsertSchema` from `drizzle-zod`
   - Insert type using `z.infer<typeof insertSchema>`
   - Select type using `typeof table.$inferSelect`
3. Run `npm run db:push` to sync schema to database

**CRITICAL**: Never change primary key ID column types in existing tables. Use `npm run db:push --force` only when necessary.

### Adding New Features

1. **Define Types**: Add to `shared/schema.ts`
2. **Update Storage**: Add methods to `IStorage` interface and `DatabaseStorage` class
3. **Create Routes**: Add API endpoints in `server/routes.ts`
4. **Build Frontend**: Create pages in `client/src/pages/`, register in `App.tsx`
5. **Use React Query**: Fetch data with `useQuery`, mutate with `useMutation`

## Current Implementation Status

### ✅ Fully Implemented

1. **Database Schema**
   - PostgreSQL with Drizzle ORM
   - Tables: users, roles, user_roles, categories, regions, benefits, merchants, coupons, bookmarks, applications
   - Seeded data: 4 roles, 5 categories, 3 regions

2. **Authentication System**
   - User registration with bcrypt password hashing (12 salt rounds)
   - JWT token generation (7-day expiry)
   - Login with password verification
   - Protected /api/auth/me endpoint
   - Automatic USER role assignment on registration
   - Password security: no password fields in API responses

3. **Storage Layer (IStorage Interface)**
   - User operations: create, get by email, get by ID, assign roles, get roles, get permissions
   - Benefit operations: get, search, nearby, popular, recommended (methods defined, need data)
   - Merchant operations: get, search, nearby (methods defined, need data)
   - Coupon operations: issue, validate, redeem, get user coupons (methods defined, need data)
   - Bookmark operations: add, remove, list (methods defined, need data)
   - Geography: regions, categories, geocoding (partial implementation)

4. **Frontend Navigation**
   - 5-tab bottom navigation bar (Home, Discover, Map, Saved, Profile)
   - Routing with wouter
   - Header component with search
   - Profile page with user info, roles display, and stats

5. **Service URL Configuration**
   - Multi-environment support (production, dev, local, Replit preview)
   - Auto-detection using window.location.origin

6. **API Endpoints**
   - POST /api/auth/register - User registration
   - POST /api/auth/login - User login
   - GET /api/auth/me - Get current user (protected)
   - GET /api/categories - List categories
   - GET /api/regions/:id - Get region by ID

### 🚧 Defined But Not Yet Implemented

1. **Benefit Discovery**
   - Storage methods exist but no benefits data in database
   - Need to seed test benefits, merchants, and locations
   - Search and filtering UI not implemented

2. **Map Functionality**
   - Naver Maps API not configured (credentials needed)
   - BBOX search method defined but not tested
   - Marker clustering and bottom sheet UI not implemented

3. **Coupon System**
   - Database schema and storage methods exist
   - QR code generation and scanning not implemented
   - Geofencing validation logic not implemented

4. **Merchant Wizard**
   - Route exists at /merchant/wizard
   - S0-S8 multi-step form UI not implemented
   - Application submission and review flow not implemented

5. **Admin Console**
   - Route exists at /admin
   - Application review and approval UI not implemented
   - User role management UI not implemented

6. **Geospatial Features**
   - Using text columns for location data (not PostGIS)
   - Spatial indexing and efficient queries not implemented
   - Distance calculations and radius filtering not implemented

7. **Recommendations & Personalization**
   - HP_SCORE algorithm defined but not implemented
   - User activity tracking methods exist but no data
   - Personalized recommendations based on history not implemented

### ❌ Not Implemented / Removed

- Server-side sessions (using stateless JWT only)
- PostGIS extension (using basic text columns for now)
- Full-text search indexing
- Push notifications
- Email verification

## Testing

The app uses Playwright for end-to-end testing via the `run_test` tool.

### Tested Features

- ✅ Basic navigation (all 5 tabs)
- ✅ Authentication flow (register, login, /me endpoint)
- ✅ Role assignment (USER role on registration)
- ✅ Password security (no password field in API responses)

### Test Data Generation

Tests use `nanoid()` for generating unique test data (emails, usernames, etc.) to avoid conflicts between test runs.

## Known Issues

1. **Naver Maps API Warning**: Credentials not configured - geographic services limited
2. **Dialog Accessibility Warning**: Missing DialogTitle in some components
3. **LSP Diagnostics**: 32 TypeScript errors remaining (non-critical, mostly type definitions)

## Environment Variables

The following secrets are configured:

- `DATABASE_URL` - PostgreSQL connection string
- `PGDATABASE`, `PGHOST`, `PGPASSWORD`, `PGPORT`, `PGUSER` - Database credentials
- `SESSION_SECRET` - Express session secret
- `JWT_SECRET` - JWT signing key (defaults to "fallback_secret" in development)

**TODO**: Configure Naver Maps API credentials:
- `NAVER_MAPS_CLIENT_ID`
- `NAVER_MAPS_CLIENT_SECRET`

## Recent Changes

### October 4, 2025

1. **Fixed SERVICE_URLS**: Now uses `window.location.origin` for Replit preview compatibility
2. **Fixed Drizzle Queries**: Changed from chained `.where()` to `and()` inside single `where()` call
3. **Added Storage Methods**: `getUserRoles()`, `getUserPermissions()`, `getUserById()`
4. **Fixed Authentication**: Removed dynamic imports, added proper bcrypt + JWT implementation
5. **Security Fix**: Password field explicitly stripped from all auth API responses
6. **Added Error Logging**: Detailed error messages in auth endpoints
7. **Database Seeding**: Added roles, categories, and regions
8. **E2E Testing**: Verified authentication flow and navigation

## Best Practices

### Frontend

- Always use `@tanstack/react-query` for data fetching
- Use object form for queries: `useQuery({ queryKey: [...] })` (v5 syntax)
- Use hierarchical query keys: `['/api/recipes', id]` not `['/api/recipes/${id}']`
- Invalidate cache after mutations via `queryClient.invalidateQueries()`
- Add `data-testid` attributes to all interactive and display elements

### Backend

- Keep routes thin - business logic goes in storage/services
- Validate request bodies with Zod schemas before passing to storage
- Never return password fields - always strip before sending to client
- Use `authenticateToken` middleware for protected routes
- Use `requireRole([...])` middleware for role-based access control

### Security

- Always hash passwords with bcrypt before storing
- Never log or expose JWT secrets
- Strip sensitive fields (password, secrets) from all API responses
- Verify JWT tokens on every protected request
- Use HTTPS in production (handled by Replit)

## Project Structure

```
├── client/                    # Frontend React app
│   ├── src/
│   │   ├── pages/            # Page components (home, discover, map, etc.)
│   │   ├── components/       # Reusable UI components
│   │   ├── hooks/           # Custom React hooks (useAuth, useLocation, etc.)
│   │   ├── lib/             # Utilities (auth, queryClient, constants)
│   │   └── App.tsx          # Main app with routing
│   └── index.html
├── server/                   # Backend Express app
│   ├── routes.ts            # API route definitions
│   ├── storage.ts           # Database storage layer (IStorage + DatabaseStorage)
│   ├── auth.ts              # Authentication utilities (JWT, bcrypt, middleware)
│   ├── db.ts                # Drizzle database connection
│   ├── services/            # Business logic services
│   │   ├── search.ts       # Search service
│   │   ├── coupon.ts       # Coupon validation & redemption
│   │   ├── geolocation.ts  # Geolocation services
│   │   └── naver-maps.ts   # Naver Maps API integration
│   └── index.ts            # Server entry point
├── shared/                  # Shared code between client & server
│   └── schema.ts           # Database schema + Zod validation schemas
├── drizzle.config.ts       # Drizzle configuration
├── package.json
└── replit.md              # This file

## Contact & Documentation

For questions or issues, refer to:
- This documentation (replit.md)
- Project goal and scratchpad in conversation history
- Code comments in implementation files
