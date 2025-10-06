import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertBenefitSchema, insertCouponSchema, insertMerchantSchema } from "@shared/schema";
import { authenticateToken, requireRole, hashPassword, comparePassword, generateToken } from "./auth";
import { searchService } from "./services/search";
import { couponService } from "./services/coupon";
import { naverMapsService } from "./services/naver-maps";
import { validateCouponRedemption } from "./services/coupon";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(userData.email);
      
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Assign role based on isMerchantOwner flag or default to USER
      const role = req.body.isMerchantOwner ? "MERCHANT_OWNER" : "USER";
      await storage.assignUserRole(user.id, role);
      
      // Get user roles
      const roles = await storage.getUserRoles(user.id);
      
      // Generate JWT token
      const token = generateToken({ id: user.id, email: user.email, name: user.name }, roles);
      
      // SECURITY: Never send password field to client
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(201).json({ 
        user: { id: userWithoutPassword.id, email: userWithoutPassword.email, name: userWithoutPassword.name },
        token
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ error: "Invalid user data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Get user roles
      const roles = await storage.getUserRoles(user.id);
      
      // Generate JWT token
      const token = generateToken({ id: user.id, email: user.email, name: user.name }, roles);
      
      // SECURITY: Never send password field to client
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({ 
        user: { id: userWithoutPassword.id, email: userWithoutPassword.email, name: userWithoutPassword.name, roles },
        token 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      // req.user is set by authenticateToken middleware
      const user = await storage.getUserById(req.user!.id);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get fresh roles
      const roles = await storage.getUserRoles(user.id);
      
      // SECURITY: Never send password field to client
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        id: userWithoutPassword.id,
        email: userWithoutPassword.email,
        name: userWithoutPassword.name,
        roles
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user info" });
    }
  });

  // Benefits routes
  app.get("/api/benefits/search", async (req, res) => {
    try {
      const {
        bbox, // "lat1,lng1,lat2,lng2"
        lat,
        lng,
        radius = 5,
        cats = [],
        regionId,
        types = [],
        nowOpen = false,
        sort = 'distance',
        limit = 50,
        offset = 0,
        q // Search query
      } = req.query;

      let results = [];

      const catArray = Array.isArray(cats) ? cats.filter((c): c is string => typeof c === 'string') : (cats ? [cats as string] : []);
      const typeArray = Array.isArray(types) ? types.filter((t): t is string => typeof t === 'string') : (types ? [types as string] : []);

      if (q && typeof q === 'string') {
        // Text search
        results = await searchService.searchBenefits(q, {
          categories: catArray,
          regionId: regionId as string,
          types: typeArray,
          nowOpen: nowOpen === 'true',
          sort: sort as any,
        });
      } else if (lat && lng) {
        // Geographic search with lat/lng/radius
        results = await storage.getBenefitsNearby(Number(lat), Number(lng), Number(radius), {
          categories: catArray,
          regionId: regionId as string,
          types: typeArray,
          nowOpen: nowOpen === 'true',
          sort: sort as any,
        });
      } else if (bbox && typeof bbox === 'string') {
        // Geographic search with bbox
        const [lat1, lng1, lat2, lng2] = bbox.split(',').map(Number);
        const centerLat = (lat1 + lat2) / 2;
        const centerLng = (lng1 + lng2) / 2;
        const radiusKm = Math.max(
          Math.abs(lat2 - lat1) * 111, // Rough km per degree latitude
          Math.abs(lng2 - lng1) * 111
        ) / 2;

        results = await storage.getBenefitsNearby(centerLat, centerLng, radiusKm, {
          categories: catArray,
          regionId: regionId as string,
          types: typeArray,
          nowOpen: nowOpen === 'true',
          sort: sort as any,
        });
      } else {
        // No search parameters - return popular benefits
        results = await storage.getPopularBenefits(Number(limit));
      }

      const paginatedResults = results.slice(Number(offset), Number(offset) + Number(limit));
      
      res.json({
        benefits: paginatedResults,
        total: results.length,
        hasMore: Number(offset) + Number(limit) < results.length
      });
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
    }
  });

  app.get("/api/benefits/popular", async (req, res) => {
    try {
      const { limit = 20 } = req.query;

      const benefits = await storage.getPopularBenefits(Number(limit));
      
      res.json({ benefits });
    } catch (error) {
      res.status(500).json({ error: "Failed to get popular benefits" });
    }
  });

  app.get("/api/benefits/recommended", authenticateToken, async (req, res) => {
    try {
      const { lat, lng, limit = 10 } = req.query;
      const userId = req.user.id;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: "Location required" });
      }

      const benefits = await storage.getRecommendedBenefits(
        userId,
        Number(lat), 
        Number(lng), 
        Number(limit)
      );
      
      res.json({ benefits });
    } catch (error) {
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });

  app.get("/api/benefits/:id", async (req, res) => {
    try {
      const benefit = await storage.getBenefit(req.params.id);
      
      if (!benefit) {
        return res.status(404).json({ error: "Benefit not found" });
      }

      // Track view activity if user is authenticated
      if (req.user?.id) {
        await storage.trackActivity(
          req.user.id,
          'VIEW',
          benefit.id,
          'BENEFIT'
        );
      }

      res.json({ benefit });
    } catch (error) {
      res.status(500).json({ error: "Failed to get benefit" });
    }
  });

  app.get("/api/benefits/:id/stats", requireRole(['OPERATOR', 'ADMIN']), async (req, res) => {
    try {
      const stats = await storage.getBenefitStats(req.params.id);
      res.json({ stats });
    } catch (error) {
      res.status(500).json({ error: "Failed to get benefit stats" });
    }
  });

  // Coupon routes
  app.post("/api/coupons", authenticateToken, async (req, res) => {
    try {
      const { benefitId } = req.body;
      const userId = req.user.id;

      if (!benefitId) {
        return res.status(400).json({ error: "Benefit ID required" });
      }

      const result = await couponService.issueCoupon(userId, benefitId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Track coupon issuance activity
      await storage.trackActivity(
        userId,
        'COUPON_ISSUED',
        benefitId,
        'BENEFIT'
      );

      res.json({ coupon: result.coupon });
    } catch (error) {
      res.status(500).json({ error: "Failed to issue coupon" });
    }
  });

  app.post("/api/coupons/redeem", async (req, res) => {
    try {
      const { token, merchantId, location, pin } = req.body;

      if (!token || !merchantId) {
        return res.status(400).json({ error: "Token and merchant ID required" });
      }

      const result = await validateCouponRedemption(token, merchantId, location, pin);
      
      if (!result.valid) {
        return res.status(400).json({ error: result.reason });
      }

      const success = await storage.redeemCoupon(token, merchantId, location);
      
      if (!success) {
        return res.status(400).json({ error: "Failed to redeem coupon" });
      }

      res.json({ success: true, message: "Coupon redeemed successfully" });
    } catch (error) {
      res.status(500).json({ error: "Coupon redemption failed" });
    }
  });

  app.get("/api/coupons/validate/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { merchantId, location } = req.query;

      if (!merchantId) {
        return res.status(400).json({ error: "Merchant ID required" });
      }

      const isValid = await storage.validateCoupon(
        token, 
        merchantId as string, 
        location as string
      );

      res.json({ valid: isValid });
    } catch (error) {
      res.status(500).json({ error: "Validation failed" });
    }
  });

  app.get("/api/users/:userId/coupons", authenticateToken, async (req, res) => {
    try {
      const userId = req.params.userId;
      const { status } = req.query;

      // Check if user can access these coupons
      if (req.user.id !== userId && !req.user.roles?.includes('ADMIN')) {
        return res.status(403).json({ error: "Access denied" });
      }

      const coupons = await storage.getUserCoupons(userId, status as any);
      res.json({ coupons });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user coupons" });
    }
  });

  // Merchants routes
  app.get("/api/merchants/search", async (req, res) => {
    try {
      const { q, lat, lng, radius = 5 } = req.query;
      let results = [];

      if (q && typeof q === 'string') {
        results = await storage.searchMerchants(q);
      } else if (lat && lng) {
        results = await storage.getMerchantsNearby(
          Number(lat), 
          Number(lng), 
          Number(radius)
        );
      }

      res.json({ merchants: results });
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
    }
  });

  app.get("/api/merchants/:id", async (req, res) => {
    try {
      const merchant = await storage.getMerchant(req.params.id);
      
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      res.json({ merchant });
    } catch (error) {
      res.status(500).json({ error: "Failed to get merchant" });
    }
  });

  app.get("/api/merchants/:id/benefits", async (req, res) => {
    try {
      const benefits = await storage.getBenefitsByMerchant(req.params.id);
      res.json({ benefits });
    } catch (error) {
      res.status(500).json({ error: "Failed to get merchant benefits" });
    }
  });

  app.get("/api/merchants/:merchantId/benefits", async (req, res) => {
    try {
      const benefits = await storage.getBenefitsByMerchant(req.params.merchantId);
      res.json({ benefits });
    } catch (error) {
      res.status(500).json({ error: "Failed to get merchant benefits" });
    }
  });

  // User bookmarks
  app.post("/api/bookmarks", authenticateToken, async (req, res) => {
    try {
      const { benefitId } = req.body;
      const userId = req.user.id;

      await storage.bookmarkBenefit(userId, benefitId);
      
      // Track bookmark activity
      await storage.trackActivity(userId, 'BOOKMARK', benefitId, 'BENEFIT');
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to bookmark benefit" });
    }
  });

  app.delete("/api/bookmarks/:benefitId", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const benefitId = req.params.benefitId;

      await storage.unbookmarkBenefit(userId, benefitId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove bookmark" });
    }
  });

  app.get("/api/users/:userId/bookmarks", authenticateToken, async (req, res) => {
    try {
      const userId = req.params.userId;

      // Check if user can access these bookmarks
      if (req.user.id !== userId && !req.user.roles?.includes('ADMIN')) {
        return res.status(403).json({ error: "Access denied" });
      }

      const bookmarks = await storage.getUserBookmarks(userId);
      res.json({ bookmarks });
    } catch (error) {
      res.status(500).json({ error: "Failed to get bookmarks" });
    }
  });

  // Geographic routes
  app.get("/api/regions", async (req, res) => {
    try {
      const { level } = req.query;
      const regions = await storage.getRegions(level ? Number(level) : undefined);
      res.json({ regions });
    } catch (error) {
      res.status(500).json({ error: "Failed to get regions" });
    }
  });

  app.get("/api/geocode/reverse", async (req, res) => {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: "Latitude and longitude required" });
      }

      const address = await naverMapsService.reverseGeocode(Number(lat), Number(lng));
      res.json({ address });
    } catch (error) {
      res.status(500).json({ error: "Reverse geocoding failed" });
    }
  });

  app.get("/api/geocode", async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Search query required" });
      }

      const results = await naverMapsService.geocode(query);
      res.json({ results });
    } catch (error) {
      res.status(500).json({ error: "Geocoding failed" });
    }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json({ categories });
    } catch (error) {
      res.status(500).json({ error: "Failed to get categories" });
    }
  });

  // Merchant application routes
  app.post("/api/merchant-applications", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const applicationData = {
        userId,
        status: "DRAFT",
        currentStep: 0,
        snapshot: req.body
      };

      const application = await storage.createMerchantApplication(applicationData);
      res.status(201).json({ application });
    } catch (error) {
      res.status(500).json({ error: "Failed to create application" });
    }
  });

  app.patch("/api/merchant-applications/:id", authenticateToken, async (req, res) => {
    try {
      const applicationId = req.params.id;
      const updates = req.body;

      const application = await storage.updateMerchantApplication(applicationId, updates);
      
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      res.json({ application });
    } catch (error) {
      res.status(500).json({ error: "Failed to update application" });
    }
  });

  app.get("/api/merchant-applications", requireRole(['OPERATOR', 'ADMIN']), async (req, res) => {
    try {
      const { status = 'IN_REVIEW' } = req.query;
      const applications = await storage.getMerchantApplicationsByStatus(status as string);
      res.json({ applications });
    } catch (error) {
      res.status(500).json({ error: "Failed to get applications" });
    }
  });

  app.post("/api/merchant-applications/:id/approve", requireRole(['OPERATOR', 'ADMIN']), async (req, res) => {
    try {
      const applicationId = req.params.id;
      const reviewerId = req.user.id;

      const success = await storage.approveMerchantApplication(applicationId, reviewerId);
      
      if (!success) {
        return res.status(400).json({ error: "Failed to approve application" });
      }

      res.json({ success: true, message: "Application approved" });
    } catch (error) {
      res.status(500).json({ error: "Approval failed" });
    }
  });

  app.post("/api/merchant-applications/:id/reject", requireRole(['OPERATOR', 'ADMIN']), async (req, res) => {
    try {
      const applicationId = req.params.id;
      const reviewerId = req.user.id;
      const { notes } = req.body;

      const success = await storage.rejectMerchantApplication(applicationId, reviewerId, notes);
      
      if (!success) {
        return res.status(400).json({ error: "Failed to reject application" });
      }

      res.json({ success: true, message: "Application rejected" });
    } catch (error) {
      res.status(500).json({ error: "Rejection failed" });
    }
  });

  // Merchant management routes
  app.patch("/api/merchants/:id", requireRole(['MERCHANT_OWNER', 'ADMIN']), async (req, res) => {
    try {
      const merchantId = req.params.id;
      
      // TODO: Add merchant ownership verification - check if req.user owns this merchant
      
      const merchantUpdateSchema = z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        addressDetail: z.string().optional(),
        website: z.string().optional(),
        images: z.array(z.string()).optional(),
        socialLinks: z.any().optional()
      });
      
      const updates = merchantUpdateSchema.parse(req.body);
      
      const merchant = await storage.updateMerchant(merchantId, updates);
      
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      res.json({ merchant });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid merchant data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update merchant" });
    }
  });

  app.get("/api/merchants/:id/hours", async (req, res) => {
    try {
      const hours = await storage.getMerchantHours(req.params.id);
      res.json({ hours });
    } catch (error) {
      res.status(500).json({ error: "Failed to get merchant hours" });
    }
  });

  app.put("/api/merchants/:id/hours", requireRole(['MERCHANT_OWNER', 'ADMIN']), async (req, res) => {
    try {
      const merchantId = req.params.id;
      const { hours } = req.body;
      
      // TODO: Add merchant ownership verification
      
      if (!Array.isArray(hours)) {
        return res.status(400).json({ error: "Hours must be an array" });
      }
      
      await storage.updateMerchantHours(merchantId, hours);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update merchant hours" });
    }
  });

  // Benefit management routes
  app.post("/api/merchants/:merchantId/benefits", requireRole(['MERCHANT_OWNER', 'ADMIN']), async (req, res) => {
    try {
      const { merchantId } = req.params;
      
      const benefitSchema = insertBenefitSchema.omit({ merchantId: true, createdBy: true });
      const validatedData = benefitSchema.parse(req.body);
      
      const benefitData = {
        ...validatedData,
        merchantId,
        createdBy: req.user.id
      };
      
      const benefit = await storage.createBenefit(benefitData);
      res.status(201).json({ benefit });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid benefit data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create benefit" });
    }
  });

  app.patch("/api/benefits/:id", requireRole(['MERCHANT_OWNER', 'ADMIN']), async (req, res) => {
    try {
      const benefitId = req.params.id;
      
      const updates = {
        ...req.body,
        updatedBy: req.user.id
      };
      
      const benefit = await storage.updateBenefit(benefitId, updates);
      
      if (!benefit) {
        return res.status(404).json({ error: "Benefit not found" });
      }
      
      res.json({ benefit });
    } catch (error) {
      res.status(500).json({ error: "Failed to update benefit" });
    }
  });

  app.delete("/api/benefits/:id", requireRole(['MERCHANT_OWNER', 'ADMIN']), async (req, res) => {
    try {
      await storage.deleteBenefit(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete benefit" });
    }
  });

  app.post("/api/benefits/:id/publish", requireRole(['MERCHANT_OWNER', 'ADMIN']), async (req, res) => {
    try {
      const benefitId = req.params.id;
      const userId = req.user.id;
      
      const version = await storage.publishBenefit(benefitId, userId);
      res.json({ version, success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to publish benefit" });
    }
  });

  app.get("/api/benefits/:id/versions", requireRole(['MERCHANT_OWNER', 'ADMIN']), async (req, res) => {
    try {
      const versions = await storage.getBenefitVersions(req.params.id);
      res.json({ versions });
    } catch (error) {
      res.status(500).json({ error: "Failed to get benefit versions" });
    }
  });

  // Categories routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json({ categories });
    } catch (error) {
      res.status(500).json({ error: "Failed to get categories" });
    }
  });

  // Home Banners routes
  app.get("/api/banners", async (req, res) => {
    try {
      const { activeOnly = 'true' } = req.query;
      const banners = await storage.getHomeBanners(activeOnly === 'true');
      res.json({ banners });
    } catch (error) {
      res.status(500).json({ error: "Failed to get banners" });
    }
  });

  app.post("/api/banners", requireRole(['ADMIN']), async (req, res) => {
    try {
      const banner = await storage.createHomeBanner({
        ...req.body,
        createdBy: req.user.id
      });
      res.json({ banner });
    } catch (error) {
      res.status(500).json({ error: "Failed to create banner" });
    }
  });

  app.patch("/api/banners/:id", requireRole(['ADMIN']), async (req, res) => {
    try {
      const banner = await storage.updateHomeBanner(req.params.id, req.body);
      res.json({ banner });
    } catch (error) {
      res.status(500).json({ error: "Failed to update banner" });
    }
  });

  app.delete("/api/banners/:id", requireRole(['ADMIN']), async (req, res) => {
    try {
      await storage.deleteHomeBanner(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete banner" });
    }
  });

  // Region detection routes
  app.get("/api/regions/detect", async (req, res) => {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: "Missing lat or lng parameters" });
      }
      
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: "Invalid lat or lng values" });
      }
      
      const region = await storage.getRegionByLocation(latitude, longitude);
      res.json({ region });
    } catch (error) {
      res.status(500).json({ error: "Failed to detect region" });
    }
  });

  // Event Logging routes
  app.post("/api/events", async (req, res) => {
    try {
      const { event, benefitId, merchantId, regionId, params } = req.body;
      
      const eventLog = await storage.logEvent({
        userId: req.user?.id || null,
        event,
        benefitId: benefitId || null,
        merchantId: merchantId || null,
        regionId: regionId || null,
        params: params || null
      });
      
      res.json({ event: eventLog });
    } catch (error) {
      res.status(500).json({ error: "Failed to log event" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/merchant/:merchantId", requireRole(['MERCHANT_OWNER', 'ADMIN']), async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { period, fromDate, toDate } = req.query;
      
      // If both date bounds provided, return time-series KPI data
      if (fromDate && toDate && typeof fromDate === 'string' && typeof toDate === 'string') {
        const kpis = await storage.getMerchantKpis(merchantId, fromDate, toDate);
        res.json({ kpis });
      } else {
        // Otherwise return aggregated summary for period
        const periodValue = (period as string) || '7days';
        const summary = await storage.getAnalyticsSummary(merchantId, periodValue as 'today' | '7days' | '30days');
        res.json({ summary });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
