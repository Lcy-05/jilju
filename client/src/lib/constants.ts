// Service URLs for Naver Maps API registration
// 환경별 URL 자동 설정
const isExplicitProduction = import.meta.env.PROD;
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isProductionDomain = window.location.hostname === 'jilju.co.kr';
const isDevDomain = window.location.hostname === 'dev.jilju.co.kr';

const getBaseUrl = () => {
  // If on production domain, use production URL
  if (isProductionDomain || isExplicitProduction) {
    return 'https://jilju.co.kr';
  }
  // If on dev domain, use dev URL
  else if (isDevDomain) {
    return 'https://dev.jilju.co.kr';
  }
  // For localhost or Replit preview, use current origin (co-hosted API)
  else {
    return window.location.origin;
  }
};

const BASE_URL = getBaseUrl();

export const SERVICE_URLS = {
  MAIN: BASE_URL,
  API: BASE_URL + '/api',
  MERCHANT: BASE_URL + '/merchant',
  ADMIN: BASE_URL + '/admin'
};

// App configuration
export const APP_CONFIG = {
  NAME: '질주',
  VERSION: '1.0.0',
  DEFAULT_LOCATION: {
    lat: 33.4996,
    lng: 126.5312,
    name: '제주특별자치도'
  },
  SEARCH_DEBOUNCE_MS: 250,
  MAP_THROTTLE_MS: 300,
  COUPON_EXPIRY_MINUTES: 10,
  MAX_SEARCH_RESULTS: 100,
  MAX_MAP_MARKERS: 200,
  GEOFENCE_DEFAULT_RADIUS: 150, // meters
  PAGINATION_LIMIT: 20
};

// User roles
export const ROLES = {
  USER: 'USER',
  MERCHANT_OWNER: 'MERCHANT_OWNER', 
  OPERATOR: 'OPERATOR',
  ADMIN: 'ADMIN'
} as const;

// Benefit types
export const BENEFIT_TYPES = {
  PERCENT: 'PERCENT',
  AMOUNT: 'AMOUNT',
  GIFT: 'GIFT',
  MEMBERSHIP: 'MEMBERSHIP'
} as const;

// Application statuses
export const APPLICATION_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  IN_REVIEW: 'IN_REVIEW',
  NEEDS_INFO: 'NEEDS_INFO',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
} as const;

// Map configuration
export const MAP_CONFIG = {
  DEFAULT_ZOOM: 14,
  MIN_ZOOM: 10,
  MAX_ZOOM: 18,
  CLUSTER_MIN_ZOOM: 14,
  MARKER_LIMIT: 200,
  SEARCH_RADIUS_KM: 5,
  GEOFENCE_MAX_RADIUS: 1000 // meters
};

// Jeju Island Region Classification (제주도 지역 분류)
export const JEJU_REGIONS = {
  ara: {
    id: 'ara',
    name: '아라권',
    center: { lat: 33.4636, lng: 126.5579 },
    radius: 3000, // meters
    areas: ['아라동', '오등동', '영평동', '월평동', '용강동']
  },
  samhwa: {
    id: 'samhwa',
    name: '삼화권',
    center: { lat: 33.5246, lng: 126.5650 },
    radius: 3500,
    areas: ['화북동', '봉개동', '도련동', '삼양동', '회천동']
  },
  city_hall: {
    id: 'city_hall',
    name: '시청권',
    center: { lat: 33.5102, lng: 126.5219 },
    radius: 2000,
    areas: ['일도동', '이도동', '삼도동', '건입동', '도남동']
  },
  airport_coast: {
    id: 'airport_coast',
    name: '공항연안권',
    center: { lat: 33.5063, lng: 126.4933 },
    radius: 2500,
    areas: ['용담동', '이호동', '도두동', '외도동', '내도동']
  },
  nohyeong: {
    id: 'nohyeong',
    name: '노형권',
    center: { lat: 33.4897, lng: 126.4787 },
    radius: 3000,
    areas: ['오라동', '연동', '노형동', '해안동', '도평동']
  },
  east: {
    id: 'east',
    name: '동부권',
    center: { lat: 33.5283, lng: 126.6798 },
    radius: 8000,
    areas: ['조천읍', '구좌읍']
  },
  west: {
    id: 'west',
    name: '서부권',
    center: { lat: 33.3950, lng: 126.2394 },
    radius: 10000,
    areas: ['한림읍', '한경면', '애월읍']
  },
  seogwipo: {
    id: 'seogwipo',
    name: '서귀포권',
    center: { lat: 33.2541, lng: 126.5599 },
    radius: 8000,
    areas: ['서귀포시']
  }
} as const;

export const JEJU_REGION_KEYWORDS = [
  '아라권', '삼화권', '시청권', '공항연안권', '노형권', '동부권', '서부권', '서귀포권',
  ...Object.values(JEJU_REGIONS).flatMap(region => region.areas)
];

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me'
  },
  BENEFITS: {
    SEARCH: '/api/benefits/search',
    POPULAR: '/api/benefits/popular',
    RECOMMENDED: '/api/benefits/recommended',
    DETAIL: '/api/benefits',
    STATS: '/api/benefits/:id/stats'
  },
  COUPONS: {
    ISSUE: '/api/coupons',
    REDEEM: '/api/coupons/redeem',
    VALIDATE: '/api/coupons/validate',
    USER_COUPONS: '/api/users/:userId/coupons'
  },
  MERCHANTS: {
    SEARCH: '/api/merchants/search',
    DETAIL: '/api/merchants',
    BENEFITS: '/api/merchants/:id/benefits'
  },
  BOOKMARKS: {
    ADD: '/api/bookmarks',
    REMOVE: '/api/bookmarks',
    LIST: '/api/users/:userId/bookmarks'
  },
  GEOGRAPHY: {
    REGIONS: '/api/regions',
    REVERSE_GEOCODE: '/api/geocode/reverse',
    GEOCODE: '/api/geocode'
  },
  CATEGORIES: '/api/categories',
  APPLICATIONS: {
    CREATE: '/api/merchant-applications',
    UPDATE: '/api/merchant-applications',
    LIST: '/api/merchant-applications',
    APPROVE: '/api/merchant-applications/:id/approve',
    REJECT: '/api/merchant-applications/:id/reject'
  }
};

// Error messages
export const ERROR_MESSAGES = {
  LOCATION_DENIED: '위치 권한이 필요합니다. 설정에서 위치 권한을 허용해주세요.',
  LOCATION_TIMEOUT: '위치를 찾을 수 없습니다. 잠시 후 다시 시도해주세요.',
  NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
  INVALID_COUPON: '유효하지 않은 쿠폰입니다.',
  EXPIRED_COUPON: '만료된 쿠폰입니다.',
  USED_COUPON: '이미 사용된 쿠폰입니다.',
  GEOFENCE_ERROR: '매장 근처에서만 사용할 수 있습니다.',
  QUOTA_EXCEEDED: '발급 한도를 초과했습니다.',
  UNAUTHORIZED: '로그인이 필요합니다.',
  FORBIDDEN: '권한이 부족합니다.'
};

// Success messages
export const SUCCESS_MESSAGES = {
  COUPON_ISSUED: '쿠폰이 발급되었습니다.',
  COUPON_REDEEMED: '쿠폰이 사용되었습니다.',
  BOOKMARK_ADDED: '즐겨찾기에 추가되었습니다.',
  BOOKMARK_REMOVED: '즐겨찾기에서 제거되었습니다.',
  APPLICATION_SUBMITTED: '신청서가 제출되었습니다.',
  APPLICATION_APPROVED: '신청이 승인되었습니다.',
  APPLICATION_REJECTED: '신청이 반려되었습니다.'
};

// Category icons mapping
export const CATEGORY_ICONS = {
  '전체': '🏪',
  '음식': '🍽️',
  '카페': '☕',
  '쇼핑': '🛍️',
  '뷰티': '💄',
  '헬스': '💪',
  '의료': '🏥',
  '교육': '📚',
  '오락': '🎮',
  '숙박': '🏨',
  '교통': '🚗',
  '기타': '📱'
};

// Sort options
export const SORT_OPTIONS = [
  { value: 'distance', label: '거리순' },
  { value: 'popularity', label: '인기순' },
  { value: 'newest', label: '신규순' },
  { value: 'ending', label: '마감임박순' }
];

// Time constants
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000
};

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'jilju_auth_token',
  USER_LOCATION: 'jilju_user_location',
  SEARCH_HISTORY: 'jilju_search_history',
  RECENT_SEARCHES: 'jilju_recent_searches',
  APP_PREFERENCES: 'jilju_preferences'
};

// HP_SCORE algorithm weights (from specification)
export const HP_SCORE_WEIGHTS = {
  DISTANCE: 0.35,
  CTR: 0.2,
  ISSUE_COUNT: 0.2,
  BENEFIT_STRENGTH: 0.2,
  FRESHNESS: 0.05
};
