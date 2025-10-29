export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  isVerified: boolean;
  roles?: string[];
  merchantId?: string | null;
}

export interface Benefit {
  id: string;
  merchantId: string;
  title: string;
  description?: string;
  type: 'PERCENT' | 'AMOUNT' | 'GIFT' | 'MEMBERSHIP';
  percent?: number;
  amount?: number;
  gift?: string;
  membershipTier?: string;
  terms: string[];
  images?: string[];
  studentOnly: boolean;
  minOrder?: number;
  validFrom: Date;
  validTo: Date;
  geoRadiusM: number;
  status: string;
  rule?: Record<string, any>;
  merchant?: Merchant;
  distance?: number;
  distanceFormatted?: string;
}

export interface Merchant {
  id: string;
  name: string;
  description?: string;
  categoryPath: string[];
  address: string;
  addressDetail?: string;
  phone: string;
  regionId?: string;
  location: string; // PostGIS geography point
  website?: string;
  socialLinks?: Record<string, string>;
  images?: string[];
  status: string;
  badges?: string[];
  hours?: MerchantHour[];
}

export interface MerchantHour {
  dayOfWeek: number;
  openTime?: string;
  closeTime?: string;
  isOpen: boolean;
  breakStart?: string;
  breakEnd?: string;
}

export interface Region {
  id: string;
  code: string;
  name: string;
  level: number;
  parentId?: string;
  geom?: string;
  center?: string;
}

export interface Category {
  id: string;
  name: string;
  path: string[];
  icon?: string;
  color?: string;
  isActive: boolean;
}

export interface LocationState {
  lat: number;
  lng: number;
  address: string;
  region: string;
  accuracy?: number;
}

export interface SearchOptions {
  categoryId?: string;  // 단일 카테고리만 선택 가능
  regionId?: string;
  types?: string[];
  nowOpen?: boolean;
  sort?: 'distance' | 'popularity' | 'newest' | 'ending';
  studentOnly?: boolean;
  minDiscount?: number;
  maxDistance?: number;
}

export interface BenefitStats {
  views: number;
  bookmarks: number;
  ctr: number;
}

export interface MerchantApplication {
  id: string;
  userId: string;
  status: string;
  currentStep: number;
  snapshot?: Record<string, any>;
  reviewNotes?: string;
  reviewerId?: string;
  submittedAt?: Date;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NaverMapConfig {
  clientId: string;
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
}

export interface MapMarker {
  id: string;
  position: {
    lat: number;
    lng: number;
  };
  title: string;
  type: 'benefit' | 'merchant';
  data: Benefit | Merchant;
}
