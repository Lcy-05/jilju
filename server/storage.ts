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
  type User,
  type InsertUser,
  type Merchant,
  type Benefit,
  type Coupon,
  type Region,
  type Category,
  type MerchantApplication,
  type InsertMerchantApplication
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
  
  // Merchant operations
  getMerchant(id: string): Promise<Merchant | undefined>;
  getMerchantsNearby(lat: number, lng: number, radiusKm: number, filters?: any): Promise<Merchant[]>;
  searchMerchants(query: string): Promise<Merchant[]>;
  
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
    // For now, return all active benefits with merchant info
    // TODO: Implement PostGIS spatial queries for actual nearby filtering
    const conditions = [
      eq(benefits.status, 'ACTIVE'),
      eq(merchants.status, 'ACTIVE')
    ];
    
    if (filters?.types && filters.types.length > 0) {
      conditions.push(sql`${benefits.type} = ANY(${filters.types})`);
    }
    
    const results = await db
      .select({
        benefit: benefits,
        merchant: {
          id: merchants.id,
          name: merchants.name,
          address: merchants.address,
          location: merchants.location,
          categoryPath: merchants.categoryPath
        }
      })
      .from(benefits)
      .innerJoin(merchants, eq(benefits.merchantId, merchants.id))
      .where(and(...conditions))
      .limit(50);
    
    // Flatten the results
    return results.map(row => ({
      ...row.benefit,
      merchant: row.merchant as any
    }));
  }

  async getPopularBenefits(limit: number = 20): Promise<Benefit[]> {
    // Return active benefits ordered by creation date for now
    // TODO: Implement popularity scoring
    const results = await db
      .select()
      .from(benefits)
      .where(eq(benefits.status, 'ACTIVE'))
      .orderBy(desc(benefits.createdAt))
      .limit(limit);
    return results;
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
    let query = db.select().from(regions);
    
    if (level !== undefined) {
      query = query.where(eq(regions.level, level));
    }
    
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
    // Simple text search for now
    const results = await db
      .select()
      .from(benefits)
      .where(
        and(
          eq(benefits.status, 'ACTIVE'),
          sql`${benefits.title} ILIKE ${`%${query}%`}`
        )
      )
      .limit(20);
    return results;
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
    // TODO: Implement PostGIS spatial query
    // For now, return undefined
    return undefined;
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
}

export const storage = new DatabaseStorage();
