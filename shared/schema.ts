import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, uuid, jsonb, index, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table with RBAC
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Roles and permissions for RBAC
export const roles = pgTable("roles", {
  id: varchar("id", { length: 50 }).primaryKey(), // USER, MERCHANT_OWNER, OPERATOR, ADMIN
  name: text("name").notNull(),
  description: text("description")
});

export const permissions = pgTable("permissions", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: text("name").notNull(),
  resource: text("resource").notNull(),
  action: text("action").notNull()
});

export const rolePermissions = pgTable("role_permissions", {
  roleId: varchar("role_id", { length: 50 }).references(() => roles.id),
  permissionId: varchar("permission_id", { length: 100 }).references(() => permissions.id)
}, (table) => ({
  pk: primaryKey({ columns: [table.roleId, table.permissionId] })
}));

export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id").references(() => users.id),
  roleId: varchar("role_id", { length: 50 }).references(() => roles.id),
  merchantId: uuid("merchant_id").references(() => merchants.id), // For scoped permissions
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.roleId] })
}));

// Regions (Korean administrative divisions)
export const regions = pgTable("regions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(), // Administrative code
  name: text("name").notNull(),
  level: integer("level").notNull(), // 1: 시도, 2: 시군구, 3: 읍면동
  parentId: uuid("parent_id").references(() => regions.id),
  geom: text("geom"), // PostGIS geometry for boundaries
  center: text("center"), // PostGIS point for center coordinates
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  nameIdx: index("regions_name_idx").on(table.name),
  levelIdx: index("regions_level_idx").on(table.level)
}));

// Categories for merchants and benefits
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  path: text("path").array().notNull(), // Hierarchical path like ["음식", "카페", "디저트"]
  icon: text("icon"),
  color: text("color"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Merchant applications (S0-S8 wizard)
export const merchantApplications = pgTable("merchant_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  status: text("status").notNull().default("DRAFT"), // DRAFT, SUBMITTED, IN_REVIEW, NEEDS_INFO, APPROVED, REJECTED
  currentStep: integer("current_step").default(0), // S0-S8
  snapshot: jsonb("snapshot"), // Complete application data snapshot
  reviewNotes: text("review_notes"),
  reviewerId: uuid("reviewer_id").references(() => users.id),
  submittedAt: timestamp("submitted_at"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  statusIdx: index("merchant_applications_status_idx").on(table.status),
  userIdx: index("merchant_applications_user_idx").on(table.userId)
}));

// Merchant documents for verification
export const merchantDocuments = pgTable("merchant_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").references(() => merchantApplications.id),
  type: text("type").notNull(), // BUSINESS_REGISTRATION, STORE_PHOTO, etc.
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  ocrData: jsonb("ocr_data"), // OCR extracted data
  isVerified: boolean("is_verified").default(false),
  verifiedBy: uuid("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Business registration information (encrypted sensitive data)
export const merchantBusiness = pgTable("merchant_business", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").references(() => merchantApplications.id),
  businessType: text("business_type").notNull(), // INDIVIDUAL, CORPORATION
  businessNumber: text("business_number").notNull(), // Encrypted BRN
  businessName: text("business_name").notNull(),
  ownerName: text("owner_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Merchants table
export const merchants = pgTable("merchants", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").references(() => merchantApplications.id),
  name: text("name").notNull(),
  description: text("description"),
  categoryPath: text("category_path").array().notNull(),
  address: text("address").notNull(),
  addressDetail: text("address_detail"),
  phone: text("phone").notNull(),
  regionId: uuid("region_id").references(() => regions.id),
  location: jsonb("location").notNull(), // {lat: number, lng: number}
  website: text("website"),
  socialLinks: jsonb("social_links"), // Instagram, Facebook, etc.
  images: text("images").array(),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, INACTIVE, SUSPENDED
  badges: text("badges").array(), // Special badges like "VERIFIED", "PREMIUM"
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  nameIdx: index("merchants_name_idx").on(table.name),
  regionIdx: index("merchants_region_idx").on(table.regionId),
  statusIdx: index("merchants_status_idx").on(table.status)
}));

// Merchant operating hours
export const merchantHours = pgTable("merchant_hours", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").references(() => merchants.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, ...
  openTime: text("open_time"), // "09:00"
  closeTime: text("close_time"), // "22:00"
  isOpen: boolean("is_open").default(true),
  breakStart: text("break_start"), // Optional break time
  breakEnd: text("break_end")
}, (table) => ({
  merchantDayIdx: index("merchant_hours_merchant_day_idx").on(table.merchantId, table.dayOfWeek)
}));

// Merchant operating hour exceptions (holidays, temporary closures)
export const merchantHourExceptions = pgTable("merchant_hour_exceptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").references(() => merchants.id).notNull(),
  date: text("date").notNull(), // "2024-12-25"
  isOpen: boolean("is_open").default(false),
  openTime: text("open_time"),
  closeTime: text("close_time"),
  reason: text("reason"), // "Christmas Day", "Temporary Closure"
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  merchantDateIdx: index("merchant_hour_exceptions_merchant_date_idx").on(table.merchantId, table.date)
}));

// Benefits table
export const benefits = pgTable("benefits", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").references(() => merchants.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // PERCENT, AMOUNT, GIFT, MEMBERSHIP
  // Benefit values (only one should be set based on type)
  percent: decimal("percent", { precision: 5, scale: 2 }), // For PERCENT type
  amount: integer("amount"), // For AMOUNT type (in KRW)
  gift: text("gift"), // For GIFT type description
  membershipTier: text("membership_tier"), // For MEMBERSHIP type
  
  terms: text("terms").array(), // Array of terms and conditions
  studentOnly: boolean("student_only").default(false),
  minOrder: integer("min_order"), // Minimum order amount in KRW
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to").notNull(),
  geoRadiusM: integer("geo_radius_m").default(150), // Geofencing radius in meters (0-1000)
  
  status: text("status").notNull().default("DRAFT"), // DRAFT, ACTIVE, PAUSED, EXPIRED
  rule: jsonb("rule"), // Additional rules in JSON format
  
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  merchantIdx: index("benefits_merchant_idx").on(table.merchantId),
  validPeriodIdx: index("benefits_valid_period_idx").on(table.validFrom, table.validTo),
  statusIdx: index("benefits_status_idx").on(table.status),
  typeIdx: index("benefits_type_idx").on(table.type)
}));

// Benefit time windows (specific hours when benefit is available)
export const benefitTimeWindows = pgTable("benefit_time_windows", {
  id: uuid("id").primaryKey().defaultRandom(),
  benefitId: uuid("benefit_id").references(() => benefits.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, ...
  startTime: text("start_time").notNull(), // "14:00"
  endTime: text("end_time").notNull() // "18:00"
});

// Benefit blackout dates
export const benefitBlackouts = pgTable("benefit_blackouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  benefitId: uuid("benefit_id").references(() => benefits.id).notNull(),
  date: text("date").notNull(), // "2024-12-25"
  reason: text("reason") // "Christmas Day"
});

// Benefit quota management
export const benefitQuota = pgTable("benefit_quota", {
  id: uuid("id").primaryKey().defaultRandom(),
  benefitId: uuid("benefit_id").references(() => benefits.id).notNull(),
  totalLimit: integer("total_limit"), // Total coupons available
  dailyLimit: integer("daily_limit"), // Daily limit
  userLimit: integer("user_limit").default(1), // Per user limit
  issued: integer("issued").default(0), // Current issued count
  used: integer("used").default(0) // Current used count
});

// Benefit assets (images, etc.)
export const benefitAssets = pgTable("benefit_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  benefitId: uuid("benefit_id").references(() => benefits.id).notNull(),
  type: text("type").notNull(), // IMAGE, VIDEO
  url: text("url").notNull(),
  alt: text("alt"),
  order: integer("order").default(0)
});

// Coupons table
export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  benefitId: uuid("benefit_id").references(() => benefits.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(), // UUID token for QR/barcode
  pin: text("pin").notNull(), // 4-digit PIN for offline verification
  expireAt: timestamp("expire_at").notNull(),
  issuedAt: timestamp("issued_at").defaultNow(),
  redeemedAt: timestamp("redeemed_at"),
  deviceId: text("device_id"), // Device that issued the coupon
  userAgent: text("user_agent"),
  ipAddress: text("ip_address")
}, (table) => ({
  tokenIdx: index("coupons_token_idx").on(table.token),
  userIdx: index("coupons_user_idx").on(table.userId),
  benefitIdx: index("coupons_benefit_idx").on(table.benefitId),
  expireIdx: index("coupons_expire_idx").on(table.expireAt)
}));

// Coupon redemptions (merchant scan/verification)
export const couponRedemptions = pgTable("coupon_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponId: uuid("coupon_id").references(() => coupons.id).notNull(),
  merchantId: uuid("merchant_id").references(() => merchants.id).notNull(),
  redeemedBy: uuid("redeemed_by").references(() => users.id), // Staff member who scanned
  location: text("location"), // PostGIS point where redeemed
  deviceId: text("device_id"),
  ipAddress: text("ip_address"),
  redeemedAt: timestamp("redeemed_at").defaultNow()
}, (table) => ({
  couponIdx: index("coupon_redemptions_coupon_idx").on(table.couponId),
  locationIdx: index("coupon_redemptions_location_gist_idx").using("gist", table.location),
  redeemedAtIdx: index("coupon_redemptions_redeemed_at_idx").on(table.redeemedAt)
}));

// User favorites/bookmarks
export const userBookmarks = pgTable("user_bookmarks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  benefitId: uuid("benefit_id").references(() => benefits.id).notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  userBenefitIdx: index("user_bookmarks_user_benefit_idx").on(table.userId, table.benefitId)
}));

// User activity tracking
export const userActivity = pgTable("user_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // VIEW, BOOKMARK, SHARE, SEARCH
  resourceId: uuid("resource_id"), // benefit_id, merchant_id, etc.
  resourceType: text("resource_type"), // BENEFIT, MERCHANT
  metadata: jsonb("metadata"), // Additional context
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  userIdx: index("user_activity_user_idx").on(table.userId),
  typeIdx: index("user_activity_type_idx").on(table.type),
  createdAtIdx: index("user_activity_created_at_idx").on(table.createdAt)
}));

// Leads (user suggestions for new partnerships)
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  businessName: text("business_name").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  category: text("category"),
  notes: text("notes"),
  status: text("status").default("NEW"), // NEW, CONTACTED, CONVERTED, REJECTED
  assignedTo: uuid("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Merchant invites (operator initiated)
export const merchantInvites = pgTable("merchant_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  phone: text("phone"),
  businessName: text("business_name"),
  token: text("token").notNull().unique(),
  invitedBy: uuid("invited_by").references(() => users.id).notNull(),
  acceptedBy: uuid("accepted_by").references(() => users.id),
  expireAt: timestamp("expire_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Admin audit logs
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE, APPROVE, REJECT
  resource: text("resource").notNull(), // MERCHANT, BENEFIT, USER, etc.
  resourceId: uuid("resource_id").notNull(),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  metadata: jsonb("metadata"), // IP, user agent, etc.
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  userIdx: index("admin_audit_logs_user_idx").on(table.userId),
  resourceIdx: index("admin_audit_logs_resource_idx").on(table.resource, table.resourceId),
  createdAtIdx: index("admin_audit_logs_created_at_idx").on(table.createdAt)
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
  coupons: many(coupons),
  bookmarks: many(userBookmarks),
  activities: many(userActivity),
  leads: many(leads),
  auditLogs: many(adminAuditLogs)
}));

export const merchantsRelations = relations(merchants, ({ one, many }) => ({
  region: one(regions, { fields: [merchants.regionId], references: [regions.id] }),
  application: one(merchantApplications, { fields: [merchants.applicationId], references: [merchantApplications.id] }),
  hours: many(merchantHours),
  hourExceptions: many(merchantHourExceptions),
  benefits: many(benefits),
  redemptions: many(couponRedemptions)
}));

export const benefitsRelations = relations(benefits, ({ one, many }) => ({
  merchant: one(merchants, { fields: [benefits.merchantId], references: [merchants.id] }),
  timeWindows: many(benefitTimeWindows),
  blackouts: many(benefitBlackouts),
  quota: many(benefitQuota),
  assets: many(benefitAssets),
  coupons: many(coupons),
  bookmarks: many(userBookmarks)
}));

export const couponsRelations = relations(coupons, ({ one, many }) => ({
  benefit: one(benefits, { fields: [coupons.benefitId], references: [benefits.id] }),
  user: one(users, { fields: [coupons.userId], references: [users.id] }),
  redemptions: many(couponRedemptions)
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMerchantSchema = createInsertSchema(merchants).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBenefitSchema = createInsertSchema(benefits).omit({ id: true, createdAt: true, updatedAt: true, publishedAt: true });
export const insertCouponSchema = createInsertSchema(coupons).omit({ id: true, issuedAt: true, redeemedAt: true });
export const insertMerchantApplicationSchema = createInsertSchema(merchantApplications).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Merchant = typeof merchants.$inferSelect;
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type Benefit = typeof benefits.$inferSelect;
export type InsertBenefit = z.infer<typeof insertBenefitSchema>;
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type MerchantApplication = typeof merchantApplications.$inferSelect;
export type InsertMerchantApplication = z.infer<typeof insertMerchantApplicationSchema>;
export type Region = typeof regions.$inferSelect;
export type Category = typeof categories.$inferSelect;
