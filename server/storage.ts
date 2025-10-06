import {
  users,
  merchants,
  benefits,
  coupons,
  userBookmarks,
  userActivity,
  regions,
  categories,
  merchantApplications,
  userRoles,
  couponRedemptions,
  homeBanners,
  eventLogs,
  dailyMerchantKpis,
  benefitVersions,
  merchantHours,
  type User,
  type InsertUser,
  type Merchant,
  type Benefit,
  type Coupon,
  type Region,
  type Category,
  type MerchantApplication,
  type InsertMerchantApplication,
  type HomeBanner,
  type InsertHomeBanner,
  type EventLog,
  type InsertEventLog,
  type DailyMerchantKpi,
  type BenefitVersion,
  type MerchantHours
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, or, desc, asc, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  assignUserRole(userId: string, roleId: string, merchantId?: string): Promise<void>;
  getUserRoles(userId: string): Promise<string[]>;
  getUserPermissions(userId: string): Promise<string[]>;
  
  // Benefit operations
  getBenefit(id: string): Promise<Benefit | undefined>;
  getBenefitsNearby(lat: number, lng: number, radiusKm: number, filters?: any): Promise<Benefit[]>;
  getPopularBenefits(limit?: number): Promise<Benefit[]>;
  getRecommendedBenefits(userId: string, lat?: number, lng?: number): Promise<Benefit[]>;
  getBenefitStats(benefitId: string): Promise<any>;
  getBenefitsByMerchant(merchantId: string): Promise<Benefit[]>;
  searchBenefits(query: string, options?: any): Promise<Benefit[]>;
  createBenefit(data: any): Promise<Benefit>;
  updateBenefit(id: string, updates: Partial<Benefit>): Promise<Benefit | undefined>;
  deleteBenefit(id: string): Promise<void>;
  publishBenefit(benefitId: string, userId: string): Promise<BenefitVersion>;
  getBenefitVersions(benefitId: string): Promise<BenefitVersion[]>;
  
  // Merchant operations
  getMerchant(id: string): Promise<Merchant | undefined>;
  getMerchantsNearby(lat: number, lng: number, radiusKm: number, filters?: any): Promise<Merchant[]>;
  searchMerchants(query: string): Promise<Merchant[]>;
  updateMerchant(id: string, updates: Partial<Merchant>): Promise<Merchant | undefined>;
  getMerchantHours(merchantId: string): Promise<any[]>;
  updateMerchantHours(merchantId: string, hours: any[]): Promise<void>;
  
  // Bookmark operations
  bookmarkBenefit(userId: string, benefitId: string): Promise<void>;
  unbookmarkBenefit(userId: string, benefitId: string): Promise<void>;
  getUserBookmarks(userId: string): Promise<Benefit[]>;
  
  // Coupon operations
  issueCoupon(userId: string, benefitId: string, metadata?: any): Promise<Coupon>;
  validateCoupon(token: string, merchantId: string, location?: { lat: number; lng: number }): Promise<{ valid: boolean; reason?: string; coupon?: Coupon }>;
  redeemCoupon(token: string, merchantId: string, location?: { lat: number; lng: number }): Promise<Coupon>;
  getUserCoupons(userId: string, status?: 'active' | 'used' | 'expired'): Promise<Coupon[]>;
  getCoupon(token: string): Promise<Coupon | undefined>;
  createCoupon(data: any): Promise<Coupon>;
  
  // Activity tracking
  trackActivity(userId: string, type: string, resourceId: string, resourceType: string, metadata?: any): Promise<void>;
  
  // Region and Category operations
  getRegions(level?: number): Promise<Region[]>;
  getCategories(): Promise<Category[]>;
  getRegionByLocation(lat: number, lng: number): Promise<Region | undefined>;
  reverseGeocode(lat: number, lng: number): Promise<string>;
  
  // Home Banner operations
  getHomeBanners(activeOnly?: boolean): Promise<HomeBanner[]>;
  createHomeBanner(data: InsertHomeBanner): Promise<HomeBanner>;
  updateHomeBanner(id: string, updates: Partial<InsertHomeBanner>): Promise<HomeBanner>;
  deleteHomeBanner(id: string): Promise<void>;
  
  // Event Logging operations
  logEvent(data: InsertEventLog): Promise<EventLog>;
  getEventLogs(filters?: { merchantId?: string; benefitId?: string; event?: string; fromDate?: Date; toDate?: Date }): Promise<EventLog[]>;
  
  // Analytics operations
  getMerchantKpis(merchantId: string, fromDate?: string, toDate?: string): Promise<DailyMerchantKpi[]>;
  getAnalyticsSummary(merchantId: string, period: 'today' | '7days' | '30days'): Promise<any>;
  
  // Merchant Application operations
  createMerchantApplication(data: InsertMerchantApplication): Promise<MerchantApplication>;
  updateMerchantApplication(id: string, updates: Partial<MerchantApplication>): Promise<MerchantApplication>;
  getMerchantApplicationsByStatus(status: string): Promise<MerchantApplication[]>;
  approveMerchantApplication(applicationId: string, reviewerId: string): Promise<void>;
  rejectMerchantApplication(applicationId: string, reviewerId: string, notes: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Select all columns including password for authentication purposes
    // Note: password should be removed before sending to client
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async assignUserRole(userId: string, roleId: string, merchantId?: string): Promise<void> {
    await db.insert(userRoles).values({
      userId,
      roleId,
      merchantId: merchantId || null
    }).onConflictDoNothing();
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const roles = await db
      .select({ roleId: userRoles.roleId })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));
    return roles.map(r => r.roleId).filter((id): id is string => id !== null);
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    // For now, return empty array
    // TODO: Implement permission system based on roles
    const roles = await this.getUserRoles(userId);
    
    // Map roles to permissions
    const permissionMap: Record<string, string[]> = {
      'USER': ['benefit:view', 'benefit:bookmark', 'coupon:issue', 'coupon:redeem'],
      'MERCHANT_OWNER': ['benefit:view', 'benefit:create', 'benefit:update', 'merchant:manage'],
      'OPERATOR': ['benefit:view', 'merchant:invite', 'merchant:search'],
      'ADMIN': ['*'] // All permissions
    };
    
    const permissions = new Set<string>();
    for (const role of roles) {
      const rolePermissions = permissionMap[role] || [];
      rolePermissions.forEach(p => permissions.add(p));
    }
    
    return Array.from(permissions);
  }

  // Benefit operations
  async getBenefit(id: string): Promise<Benefit | undefined> {
    const [benefit] = await db.select().from(benefits).where(eq(benefits.id, id));
    return benefit || undefined;
  }

  async getBenefitsNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    filters?: {
      categories?: string[];
      regionId?: string;
      types?: string[];
      nowOpen?: boolean;
      sort?: 'distance' | 'popular' | 'newest';
    }
  ): Promise<Benefit[]> {
    const conditions = [
      eq(benefits.status, 'ACTIVE'),
      eq(merchants.status, 'ACTIVE')
    ];
    
    if (filters?.types && filters.types.length > 0) {
      conditions.push(sql`${benefits.type} = ANY(${filters.types})`);
    }
    
    // Distance filter using PostGIS
    // Convert JSONB location to geography and calculate distance
    const radiusMeters = radiusKm * 1000;
    conditions.push(sql`
      ST_DWithin(
        ST_MakePoint(
          CAST(${merchants.location}->>'lng' AS FLOAT),
          CAST(${merchants.location}->>'lat' AS FLOAT)
        )::geography,
        ST_MakePoint(${lng}, ${lat})::geography,
        ${radiusMeters}
      )
    `);
    
    const results = await db
      .select({
        benefit: benefits,
        merchant: {
          id: merchants.id,
          name: merchants.name,
          address: merchants.address,
          location: merchants.location,
          categoryPath: merchants.categoryPath
        },
        distance: sql<number>`
          ST_Distance(
            ST_MakePoint(
              CAST(${merchants.location}->>'lng' AS FLOAT),
              CAST(${merchants.location}->>'lat' AS FLOAT)
            )::geography,
            ST_MakePoint(${lng}, ${lat})::geography
          )
        `
      })
      .from(benefits)
      .innerJoin(merchants, eq(benefits.merchantId, merchants.id))
      .where(and(...conditions))
      .orderBy(sql`
        ST_Distance(
          ST_MakePoint(
            CAST(${merchants.location}->>'lng' AS FLOAT),
            CAST(${merchants.location}->>'lat' AS FLOAT)
          )::geography,
          ST_MakePoint(${lng}, ${lat})::geography
        ) ASC
      `)
      .limit(50);
    
    // Flatten the results and add distance info
    return results.map(row => ({
      ...row.benefit,
      merchant: {
        ...row.merchant,
        distance: row.distance
      } as any
    }));
  }

  async getPopularBenefits(limit: number = 20): Promise<Benefit[]> {
    // Return active benefits with merchant info ordered by creation date for now
    // TODO: Implement popularity scoring
    const results = await db
      .select({
        benefit: benefits,
        merchant: merchants
      })
      .from(benefits)
      .innerJoin(merchants, eq(benefits.merchantId, merchants.id))
      .where(and(
        eq(benefits.status, 'ACTIVE'),
        eq(merchants.status, 'ACTIVE')
      ))
      .orderBy(desc(benefits.createdAt))
      .limit(limit);
    
    // Flatten the results
    return results.map(row => ({
      ...row.benefit,
      merchant: row.merchant
    }));
  }

  async getRecommendedBenefits(userId: string, lat?: number, lng?: number): Promise<Benefit[]> {
    // For now, return popular benefits
    // TODO: Implement HP_SCORE algorithm
    return this.getPopularBenefits(20);
  }

  async getBenefitStats(benefitId: string): Promise<any> {
    // Get coupon counts
    const [stats] = await db
      .select({
        issued: sql<number>`COUNT(CASE WHEN ${coupons.redeemedAt} IS NULL THEN 1 END)`,
        used: sql<number>`COUNT(CASE WHEN ${coupons.redeemedAt} IS NOT NULL THEN 1 END)`,
        total: sql<number>`COUNT(*)`
      })
      .from(coupons)
      .where(eq(coupons.benefitId, benefitId));
    
    return stats || { issued: 0, used: 0, total: 0 };
  }

  async getBenefitsByMerchant(merchantId: string): Promise<Benefit[]> {
    const results = await db
      .select()
      .from(benefits)
      .where(eq(benefits.merchantId, merchantId))
      .orderBy(desc(benefits.createdAt));
    return results;
  }

  async createBenefit(data: any): Promise<Benefit> {
    const [benefit] = await db
      .insert(benefits)
      .values({
        ...data,
        status: data.status || 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return benefit;
  }

  async updateBenefit(id: string, updates: Partial<Benefit>): Promise<Benefit | undefined> {
    const [benefit] = await db
      .update(benefits)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(benefits.id, id))
      .returning();
    return benefit || undefined;
  }

  async deleteBenefit(id: string): Promise<void> {
    await db.delete(benefits).where(eq(benefits.id, id));
  }

  async publishBenefit(benefitId: string, userId: string): Promise<BenefitVersion> {
    const [benefit] = await db.select().from(benefits).where(eq(benefits.id, benefitId));
    
    if (!benefit) {
      throw new Error('Benefit not found');
    }

    const [lastVersion] = await db
      .select()
      .from(benefitVersions)
      .where(eq(benefitVersions.benefitId, benefitId))
      .orderBy(desc(benefitVersions.version))
      .limit(1);

    const newVersion = (lastVersion?.version || 0) + 1;

    const [benefitVersion] = await db
      .insert(benefitVersions)
      .values({
        benefitId,
        version: newVersion,
        snapshot: benefit as any,
        publishedBy: userId,
        publishedAt: new Date()
      })
      .returning();

    await db
      .update(benefits)
      .set({ 
        status: 'ACTIVE', 
        publishedAt: new Date(),
        updatedBy: userId 
      })
      .where(eq(benefits.id, benefitId));

    return benefitVersion;
  }

  async getBenefitVersions(benefitId: string): Promise<BenefitVersion[]> {
    const results = await db
      .select()
      .from(benefitVersions)
      .where(eq(benefitVersions.benefitId, benefitId))
      .orderBy(desc(benefitVersions.version));
    return results;
  }

  // Merchant operations
  async getMerchant(id: string): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants).where(eq(merchants.id, id));
    return merchant || undefined;
  }

  async getMerchantsNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    filters?: any
  ): Promise<Merchant[]> {
    // For now, return active merchants
    // TODO: Implement PostGIS spatial queries
    const results = await db
      .select()
      .from(merchants)
      .where(eq(merchants.status, 'ACTIVE'))
      .limit(50);
    return results;
  }

  async searchMerchants(query: string): Promise<Merchant[]> {
    // Simple text search for now
    // TODO: Implement BM25-like search
    const results = await db
      .select()
      .from(merchants)
      .where(
        and(
          eq(merchants.status, 'ACTIVE'),
          sql`${merchants.name} ILIKE ${`%${query}%`}`
        )
      )
      .limit(20);
    return results;
  }

  async updateMerchant(id: string, updates: Partial<Merchant>): Promise<Merchant | undefined> {
    const [merchant] = await db
      .update(merchants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(merchants.id, id))
      .returning();
    return merchant || undefined;
  }

  async getMerchantHours(merchantId: string): Promise<MerchantHours[]> {
    const results = await db
      .select()
      .from(merchantHours)
      .where(eq(merchantHours.merchantId, merchantId))
      .orderBy(asc(merchantHours.dayOfWeek));
    return results;
  }

  async updateMerchantHours(merchantId: string, hours: any[]): Promise<void> {
    await db.delete(merchantHours).where(eq(merchantHours.merchantId, merchantId));
    
    if (hours.length > 0) {
      await db.insert(merchantHours).values(
        hours.map(h => ({
          merchantId,
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isOpen: h.isOpen,
          breakStart: h.breakStart,
          breakEnd: h.breakEnd
        }))
      );
    }
  }

  // Bookmark operations
  async bookmarkBenefit(userId: string, benefitId: string): Promise<void> {
    await db.insert(userBookmarks).values({
      userId,
      benefitId
    }).onConflictDoNothing();
  }

  async unbookmarkBenefit(userId: string, benefitId: string): Promise<void> {
    await db
      .delete(userBookmarks)
      .where(
        and(
          eq(userBookmarks.userId, userId),
          eq(userBookmarks.benefitId, benefitId)
        )
      );
  }

  async getUserBookmarks(userId: string): Promise<Benefit[]> {
    const results = await db
      .select({
        id: benefits.id,
        merchantId: benefits.merchantId,
        categoryId: benefits.categoryId,
        title: benefits.title,
        description: benefits.description,
        type: benefits.type,
        percent: benefits.percent,
        amount: benefits.amount,
        gift: benefits.gift,
        membershipTier: benefits.membershipTier,
        terms: benefits.terms,
        studentOnly: benefits.studentOnly,
        minOrder: benefits.minOrder,
        validFrom: benefits.validFrom,
        validTo: benefits.validTo,
        geoRadiusM: benefits.geoRadiusM,
        status: benefits.status,
        rule: benefits.rule,
        createdBy: benefits.createdBy,
        updatedBy: benefits.updatedBy,
        publishedAt: benefits.publishedAt,
        createdAt: benefits.createdAt,
        updatedAt: benefits.updatedAt
      })
      .from(userBookmarks)
      .innerJoin(benefits, eq(userBookmarks.benefitId, benefits.id))
      .where(eq(userBookmarks.userId, userId))
      .orderBy(desc(userBookmarks.createdAt));
    return results;
  }

  // Coupon operations
  async issueCoupon(userId: string, benefitId: string, metadata?: any): Promise<Coupon> {
    const token = crypto.randomUUID();
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const expireAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const [coupon] = await db
      .insert(coupons)
      .values({
        userId,
        benefitId,
        token,
        pin,
        expireAt,
        deviceId: metadata?.deviceId,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress
      })
      .returning();
    return coupon;
  }

  async validateCoupon(
    token: string,
    merchantId: string,
    location?: { lat: number; lng: number }
  ): Promise<{ valid: boolean; reason?: string; coupon?: Coupon }> {
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.token, token));

    if (!coupon) {
      return { valid: false, reason: 'Coupon not found' };
    }

    if (coupon.redeemedAt) {
      return { valid: false, reason: 'Coupon already redeemed' };
    }

    if (new Date() > coupon.expireAt) {
      return { valid: false, reason: 'Coupon expired' };
    }

    // TODO: Implement geofencing validation
    // Check if location is within benefit's geoRadiusM

    return { valid: true, coupon };
  }

  async redeemCoupon(
    token: string,
    merchantId: string,
    location?: { lat: number; lng: number }
  ): Promise<Coupon> {
    const validation = await this.validateCoupon(token, merchantId, location);
    
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid coupon');
    }

    const coupon = validation.coupon!;

    // Update coupon
    const [updatedCoupon] = await db
      .update(coupons)
      .set({ redeemedAt: new Date() })
      .where(eq(coupons.id, coupon.id))
      .returning();

    // Create redemption record
    await db.insert(couponRedemptions).values({
      couponId: coupon.id,
      merchantId,
      location: location ? `POINT(${location.lng} ${location.lat})` : null
    });

    return updatedCoupon;
  }

  async getUserCoupons(userId: string, status?: 'active' | 'used' | 'expired'): Promise<Coupon[]> {
    let conditions = [eq(coupons.userId, userId)];

    if (status === 'active') {
      conditions.push(sql`${coupons.redeemedAt} IS NULL`);
      conditions.push(gte(coupons.expireAt, new Date()));
    } else if (status === 'used') {
      conditions.push(sql`${coupons.redeemedAt} IS NOT NULL`);
    } else if (status === 'expired') {
      conditions.push(sql`${coupons.redeemedAt} IS NULL`);
      conditions.push(lte(coupons.expireAt, new Date()));
    }

    const results = await db
      .select()
      .from(coupons)
      .where(and(...conditions))
      .orderBy(desc(coupons.issuedAt));
    
    return results;
  }

  // Activity tracking
  async trackActivity(
    userId: string,
    type: string,
    resourceId: string,
    resourceType: string,
    metadata?: any
  ): Promise<void> {
    await db.insert(userActivity).values({
      userId,
      type,
      resourceId,
      resourceType,
      metadata: metadata || null
    });
  }

  // Region and Category operations
  async getRegions(level?: number): Promise<Region[]> {
    const conditions = level !== undefined ? [eq(regions.level, level)] : [];
    
    const query = conditions.length > 0
      ? db.select().from(regions).where(and(...conditions))
      : db.select().from(regions);
    
    const results = await query.orderBy(asc(regions.name));
    return results;
  }

  async getCategories(): Promise<Category[]> {
    const results = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.name));
    return results;
  }

  async searchBenefits(query: string, options?: any): Promise<Benefit[]> {
    // Simple text search with merchant info
    const results = await db
      .select({
        benefit: benefits,
        merchant: merchants
      })
      .from(benefits)
      .innerJoin(merchants, eq(benefits.merchantId, merchants.id))
      .where(
        and(
          eq(benefits.status, 'ACTIVE'),
          eq(merchants.status, 'ACTIVE'),
          sql`${benefits.title} ILIKE ${`%${query}%`}`
        )
      )
      .limit(100);
    
    // Flatten the results
    return results.map(row => ({
      ...row.benefit,
      merchant: row.merchant
    }));
  }

  async getCoupon(token: string): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.token, token));
    return coupon || undefined;
  }

  async createCoupon(data: any): Promise<Coupon> {
    const [coupon] = await db.insert(coupons).values(data).returning();
    return coupon;
  }

  async getRegionByLocation(lat: number, lng: number): Promise<Region | undefined> {
    // Get all level 3 regions (zones) from database
    const allRegions = await db.select().from(regions).where(eq(regions.level, 3));
    
    if (allRegions.length === 0) return undefined;
    
    // Haversine distance calculation
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lng2 - lng1) * Math.PI / 180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      return R * c; // Distance in meters
    };
    
    // Define radius for each region type (in meters)
    const radiusMap: Record<string, number> = {
      'ZONE_ARA': 3000,
      'ZONE_SAMHWA': 3500,
      'ZONE_CITY_HALL': 2000,
      'ZONE_AIRPORT_COAST': 2500,
      'ZONE_NOHYEONG': 3000,
      'ZONE_EAST': 8000,
      'ZONE_WEST': 10000,
      'ZONE_SEOGWIPO': 8000
    };
    
    // Find closest region within its radius
    let closestRegion: Region | undefined = undefined;
    let closestDistance = Infinity;
    
    for (const region of allRegions) {
      if (!region.center) continue;
      
      // Parse center coordinates from "lat,lng" format
      const [centerLat, centerLng] = region.center.split(',').map(Number);
      if (isNaN(centerLat) || isNaN(centerLng)) continue;
      
      const distance = calculateDistance(lat, lng, centerLat, centerLng);
      const regionRadius = radiusMap[region.code] || 5000; // Default 5km
      
      // Check if within region radius and closer than previous match
      if (distance <= regionRadius && distance < closestDistance) {
        closestRegion = region;
        closestDistance = distance;
      }
    }
    
    return closestRegion;
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    // TODO: Implement reverse geocoding
    // For now, return default
    return "서울특별시";
  }

  // Merchant Application operations
  async createMerchantApplication(data: InsertMerchantApplication): Promise<MerchantApplication> {
    const [application] = await db
      .insert(merchantApplications)
      .values(data)
      .returning();
    return application;
  }

  async updateMerchantApplication(
    id: string,
    updates: Partial<MerchantApplication>
  ): Promise<MerchantApplication> {
    const [application] = await db
      .update(merchantApplications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(merchantApplications.id, id))
      .returning();
    return application;
  }

  async getMerchantApplicationsByStatus(status: string): Promise<MerchantApplication[]> {
    const results = await db
      .select()
      .from(merchantApplications)
      .where(eq(merchantApplications.status, status))
      .orderBy(desc(merchantApplications.createdAt));
    return results;
  }

  async approveMerchantApplication(applicationId: string, reviewerId: string): Promise<void> {
    await db
      .update(merchantApplications)
      .set({
        status: 'APPROVED',
        reviewerId,
        reviewedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(merchantApplications.id, applicationId));
    
    // TODO: Create merchant from application and assign MERCHANT_OWNER role
  }

  async rejectMerchantApplication(
    applicationId: string,
    reviewerId: string,
    notes: string
  ): Promise<void> {
    await db
      .update(merchantApplications)
      .set({
        status: 'REJECTED',
        reviewerId,
        reviewNotes: notes,
        reviewedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(merchantApplications.id, applicationId));
  }

  // Home Banner operations
  async getHomeBanners(activeOnly: boolean = true): Promise<HomeBanner[]> {
    const conditions = activeOnly ? [eq(homeBanners.isActive, true)] : [];
    
    const query = conditions.length > 0
      ? db.select().from(homeBanners).where(and(...conditions))
      : db.select().from(homeBanners);
    
    const results = await query.orderBy(asc(homeBanners.orderIndex));
    return results;
  }

  async createHomeBanner(data: InsertHomeBanner): Promise<HomeBanner> {
    const [banner] = await db
      .insert(homeBanners)
      .values(data)
      .returning();
    return banner;
  }

  async updateHomeBanner(id: string, updates: Partial<InsertHomeBanner>): Promise<HomeBanner> {
    const [banner] = await db
      .update(homeBanners)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(homeBanners.id, id))
      .returning();
    return banner;
  }

  async deleteHomeBanner(id: string): Promise<void> {
    await db.delete(homeBanners).where(eq(homeBanners.id, id));
  }

  // Event Logging operations
  async logEvent(data: InsertEventLog): Promise<EventLog> {
    const [event] = await db
      .insert(eventLogs)
      .values(data)
      .returning();
    return event;
  }

  async getEventLogs(filters?: {
    merchantId?: string;
    benefitId?: string;
    event?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<EventLog[]> {
    const conditions: any[] = [];
    
    if (filters?.merchantId) {
      conditions.push(eq(eventLogs.merchantId, filters.merchantId));
    }
    if (filters?.benefitId) {
      conditions.push(eq(eventLogs.benefitId, filters.benefitId));
    }
    if (filters?.event) {
      conditions.push(eq(eventLogs.event, filters.event));
    }
    if (filters?.fromDate) {
      conditions.push(gte(eventLogs.createdAt, filters.fromDate));
    }
    if (filters?.toDate) {
      conditions.push(lte(eventLogs.createdAt, filters.toDate));
    }
    
    const query = conditions.length > 0
      ? db.select().from(eventLogs).where(and(...conditions))
      : db.select().from(eventLogs);
    
    const results = await query.orderBy(desc(eventLogs.createdAt)).limit(1000);
    return results;
  }

  // Analytics operations
  async getMerchantKpis(merchantId: string, fromDate?: string, toDate?: string): Promise<DailyMerchantKpi[]> {
    const conditions = [eq(dailyMerchantKpis.merchantId, merchantId)];
    
    if (fromDate) {
      conditions.push(gte(dailyMerchantKpis.date, fromDate));
    }
    if (toDate) {
      conditions.push(lte(dailyMerchantKpis.date, toDate));
    }
    
    const results = await db
      .select()
      .from(dailyMerchantKpis)
      .where(and(...conditions))
      .orderBy(asc(dailyMerchantKpis.date));
    
    return results;
  }

  async getAnalyticsSummary(merchantId: string, period: 'today' | '7days' | '30days'): Promise<any> {
    const today = new Date();
    const fromDate = new Date(today);
    
    if (period === 'today') {
      fromDate.setHours(0, 0, 0, 0);
    } else if (period === '7days') {
      fromDate.setDate(today.getDate() - 7);
    } else if (period === '30days') {
      fromDate.setDate(today.getDate() - 30);
    }
    
    const fromDateStr = fromDate.toISOString().split('T')[0];
    
    const kpis = await this.getMerchantKpis(merchantId, fromDateStr);
    
    // Aggregate the KPIs
    const totals = kpis.reduce((acc, kpi) => ({
      impressions: acc.impressions + (kpi.impressions || 0),
      clicks: acc.clicks + (kpi.clicks || 0),
      issues: acc.issues + (kpi.issues || 0),
      redeems: acc.redeems + (kpi.redeems || 0),
      revenueEst: acc.revenueEst + parseFloat(kpi.revenueEst?.toString() || '0')
    }), { impressions: 0, clicks: 0, issues: 0, redeems: 0, revenueEst: 0 });
    
    // Calculate rates
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const conversionRate = totals.issues > 0 ? (totals.redeems / totals.issues) * 100 : 0;
    
    return {
      ...totals,
      ctr,
      conversionRate
    };
  }
}

export const storage = new DatabaseStorage();
