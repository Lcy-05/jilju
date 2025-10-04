import { storage } from "../storage";
import { randomUUID } from "crypto";
import { geolocationService } from "./geolocation";

interface CouponIssuanceResult {
  success: boolean;
  coupon?: any;
  error?: string;
}

interface CouponValidationResult {
  valid: boolean;
  reason?: string;
  coupon?: any;
}

class CouponService {
  private readonly DEFAULT_EXPIRY_MINUTES = 10;
  private readonly REDIS_PREFIX = "coupon_quota:";

  async issueCoupon(userId: string, benefitId: string): Promise<CouponIssuanceResult> {
    try {
      // Get benefit details
      const benefit = await storage.getBenefit(benefitId);
      if (!benefit) {
        return { success: false, error: "Benefit not found" };
      }

      // Check if benefit is active and valid
      if (benefit.status !== 'ACTIVE') {
        return { success: false, error: "Benefit is not active" };
      }

      const now = new Date();
      if (now < benefit.validFrom || now > benefit.validTo) {
        return { success: false, error: "Benefit is not valid at this time" };
      }

      // Check user eligibility
      if (benefit.studentOnly) {
        // In a real implementation, check user's student status
        // For now, assume all users are eligible
      }

      // Check quota limits
      const quotaCheck = await this.checkQuotaLimits(benefitId, userId);
      if (!quotaCheck.allowed) {
        return { success: false, error: quotaCheck.reason };
      }

      // Check if user already has an active coupon for this benefit
      const existingCoupons = await storage.getUserCoupons(userId, 'active');
      const hasDuplicate = existingCoupons.some(coupon => coupon.benefitId === benefitId);
      
      if (hasDuplicate && (benefit.rule as any)?.userLimit === 1) {
        return { success: false, error: "You already have an active coupon for this benefit" };
      }

      // Calculate expiration time
      const expireAt = new Date(now.getTime() + this.DEFAULT_EXPIRY_MINUTES * 60 * 1000);

      // Create coupon
      const coupon = await storage.createCoupon({
        benefitId,
        userId,
        expireAt
      });

      // Update quota counters (in a real implementation, use Redis for atomic operations)
      await this.incrementQuotaCounter(benefitId);

      return { success: true, coupon };
    } catch (error) {
      console.error('Coupon issuance failed:', error);
      return { success: false, error: "Failed to issue coupon" };
    }
  }

  private async checkQuotaLimits(benefitId: string, userId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // This would typically use Redis for real-time quota tracking
      // For now, use database queries (less performant but functional)
      
      // Check total limit
      const totalIssued = await this.getTotalIssuedCount(benefitId);
      const benefit = await storage.getBenefit(benefitId);
      
      if (benefit?.rule && (benefit.rule as any).totalLimit) {
        if (totalIssued >= (benefit.rule as any).totalLimit) {
          return { allowed: false, reason: "Total quota exceeded" };
        }
      }

      // Check daily limit
      const todayIssued = await this.getTodayIssuedCount(benefitId);
      if (benefit?.rule && (benefit.rule as any).dailyLimit) {
        if (todayIssued >= (benefit.rule as any).dailyLimit) {
          return { allowed: false, reason: "Daily quota exceeded" };
        }
      }

      // Check per-user limit
      const userIssued = await this.getUserIssuedCount(benefitId, userId);
      if (benefit?.rule && (benefit.rule as any).userLimit) {
        if (userIssued >= (benefit.rule as any).userLimit) {
          return { allowed: false, reason: "User quota exceeded" };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Quota check failed:', error);
      return { allowed: false, reason: "Quota check failed" };
    }
  }

  private async getTotalIssuedCount(benefitId: string): Promise<number> {
    // In a real implementation, this would query a counter in Redis
    // For now, count from database (slower)
    const coupons = await storage.getUserCoupons("dummy", undefined); // Need to implement benefit-specific query
    return coupons.filter(c => c.benefitId === benefitId).length;
  }

  private async getTodayIssuedCount(benefitId: string): Promise<number> {
    // Similar to above, but with date filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Would need to implement date-filtered query
    return 0; // Placeholder
  }

  private async getUserIssuedCount(benefitId: string, userId: string): Promise<number> {
    const userCoupons = await storage.getUserCoupons(userId);
    return userCoupons.filter(c => c.benefitId === benefitId).length;
  }

  private async incrementQuotaCounter(benefitId: string): Promise<void> {
    // In a real implementation, increment Redis counters
    // For now, this is a placeholder
  }

  async validateCoupon(token: string, merchantId: string, location?: string): Promise<CouponValidationResult> {
    try {
      const coupon = await storage.getCoupon(token);
      if (!coupon) {
        return { valid: false, reason: "Coupon not found" };
      }

      // Check if already redeemed
      if (coupon.redeemedAt) {
        return { valid: false, reason: "Coupon already used" };
      }

      // Check expiration
      if (new Date() > coupon.expireAt) {
        return { valid: false, reason: "Coupon expired" };
      }

      // Get benefit details
      const benefit = await storage.getBenefit(coupon.benefitId);
      if (!benefit) {
        return { valid: false, reason: "Associated benefit not found" };
      }

      // Check if benefit belongs to the merchant
      if (benefit.merchantId !== merchantId) {
        return { valid: false, reason: "Coupon not valid for this merchant" };
      }

      // Check geofencing if location provided
      if (location && benefit.geoRadiusM > 0) {
        const merchant = await storage.getMerchant(merchantId);
        if (merchant) {
          const userCoords = geolocationService.parseCoordinates(location);
          const merchantCoords = geolocationService.parseCoordinates(merchant.location);
          
          if (userCoords && merchantCoords) {
            const geofence = geolocationService.checkGeofence(
              userCoords.lat,
              userCoords.lng,
              merchantCoords.lat,
              merchantCoords.lng,
              benefit.geoRadiusM
            );

            if (!geofence.withinRadius) {
              return { 
                valid: false, 
                reason: `Must be within ${benefit.geoRadiusM}m of the store (currently ${geofence.distanceFormatted} away)` 
              };
            }
          }
        }
      }

      // Check time windows
      const timeCheck = await this.checkTimeWindow(benefit);
      if (!timeCheck.valid) {
        return { valid: false, reason: timeCheck.reason };
      }

      // Check blackout dates
      const blackoutCheck = await this.checkBlackoutDate(benefit.id);
      if (!blackoutCheck.valid) {
        return { valid: false, reason: blackoutCheck.reason };
      }

      return { valid: true, coupon };
    } catch (error) {
      console.error('Coupon validation failed:', error);
      return { valid: false, reason: "Validation failed" };
    }
  }

  private async checkTimeWindow(benefit: any): Promise<{ valid: boolean; reason?: string }> {
    // This would check benefit_time_windows table
    // For now, simplified check
    const now = geolocationService.getCurrentKoreanTime();
    const currentDay = now.getDay(); // 0 = Sunday
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    // In a real implementation, query benefit_time_windows table
    // For now, return valid
    return { valid: true };
  }

  private async checkBlackoutDate(benefitId: string): Promise<{ valid: boolean; reason?: string }> {
    // This would check benefit_blackouts table
    // For now, simplified check
    const today = geolocationService.getCurrentKoreanTime().toISOString().slice(0, 10); // YYYY-MM-DD

    // In a real implementation, query benefit_blackouts table
    // For now, return valid
    return { valid: true };
  }

  generatePin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async redeemWithPin(pin: string, merchantId: string): Promise<CouponValidationResult> {
    try {
      // In a real implementation, we'd need to query coupons by PIN
      // This requires adding a database query method
      // For now, this is a placeholder
      return { valid: false, reason: "PIN redemption not implemented" };
    } catch (error) {
      return { valid: false, reason: "PIN redemption failed" };
    }
  }

  // Admin/analytics methods
  async getCouponStats(benefitId?: string): Promise<{
    totalIssued: number;
    totalRedeemed: number;
    redemptionRate: number;
    activeCount: number;
    expiredCount: number;
  }> {
    // Implementation would query coupon statistics
    return {
      totalIssued: 0,
      totalRedeemed: 0,
      redemptionRate: 0,
      activeCount: 0,
      expiredCount: 0
    };
  }

  async getPopularBenefitsByRedemption(limit = 10): Promise<any[]> {
    // Implementation would query most redeemed benefits
    return [];
  }
}

export const couponService = new CouponService();

export async function validateCouponRedemption(
  token: string, 
  merchantId: string, 
  location?: string, 
  pin?: string
): Promise<CouponValidationResult> {
  if (pin) {
    return await couponService.redeemWithPin(pin, merchantId);
  } else {
    return await couponService.validateCoupon(token, merchantId, location);
  }
}
