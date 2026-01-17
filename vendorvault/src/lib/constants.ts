// Application-wide constants

// Authentication
export const JWT_EXPIRY = 60 * 60 * 24 * 7; // 7 days in seconds
export const BCRYPT_ROUNDS = 12;
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// File Upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
export const MAX_FILE_SIZE_MB = 10;
export const ALLOWED_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  DOCUMENT: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
  ALL: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
};

// License
export const LICENSE_VALIDITY_DAYS = 365; // 1 year
export const LICENSE_EXPIRY_WARNING_DAYS = 30; // Warn 30 days before expiry

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// Role Dashboard Routes
export const DASHBOARD_ROUTES = {
  VENDOR: '/vendor/dashboard',
  STATION_MANAGER: '/station-manager/dashboard',
  INSPECTOR: '/inspector/dashboard',
  RAILWAY_ADMIN: '/railway-admin/dashboard',
} as const;

// Enhanced Application Status with new workflow
export const APPLICATION_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  NEGOTIATION: 'NEGOTIATION',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  LICENSED: 'LICENSED',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  TERMINATED: 'TERMINATED',
} as const;

// Verification Status
export const VERIFICATION_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;

// Business Categories
export const BUSINESS_CATEGORIES = {
  FOOD: 'FOOD',
  RETAIL: 'RETAIL',
  SERVICE: 'SERVICE',
} as const;

// Business Types
export const BUSINESS_TYPES = {
  TEA: 'tea',
  FOOD: 'food',
  RETAIL: 'retail',
  BOOKS: 'books',
  SERVICES: 'services',
  OTHER: 'other',
} as const;

// Food Types for FSSAI
export const FOOD_TYPES = {
  VEG: 'veg',
  NONVEG: 'nonveg',
  PACKAGED: 'packaged',
  FRESH: 'fresh',
  MIXED: 'mixed',
} as const;

// License Types
export const LICENSE_TYPES = {
  TEMPORARY: 'TEMPORARY',
  PERMANENT: 'PERMANENT',
  SEASONAL: 'SEASONAL',
} as const;

// Risk Levels
export const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

// Negotiation Status
export const NEGOTIATION_STATUS = {
  ACTIVE: 'ACTIVE',
  AGREED: 'AGREED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

// Enhanced Status Colors with new statuses
export const STATUS_COLORS = {
  // Application Status Colors
  DRAFT: 'bg-gray-100 text-gray-800 border border-gray-200',
  SUBMITTED: 'bg-blue-50 text-blue-700 border border-blue-200',
  NEGOTIATION: 'bg-orange-50 text-orange-700 border border-orange-200',
  APPROVED: 'bg-success/10 text-success border border-success/20',
  REJECTED: 'bg-destructive/10 text-destructive border border-destructive/20',
  LICENSED: 'bg-green-50 text-green-700 border border-green-200',
  ACTIVE: 'bg-success/10 text-success border border-success/20',
  EXPIRED: 'bg-muted text-muted-foreground border border-border',
  TERMINATED: 'bg-red-100 text-red-800 border border-red-200',
  SUSPENDED: 'bg-warning/10 text-warning border border-warning/20',
  
  // Legacy status colors
  PENDING: 'bg-warning/10 text-warning border border-warning/20',
  REVOKED: 'bg-destructive/10 text-destructive border border-destructive/20',
} as const;

// Profile Completion Weights (for calculating percentage)
export const PROFILE_COMPLETION_WEIGHTS = {
  PERSONAL: 20, // Basic personal info
  BUSINESS: 25, // Business details
  BANK: 15, // Banking information
  FINANCIAL: 10, // Financial details
  FOOD_LICENSE: 15, // FSSAI (if applicable)
  POLICE: 10, // Police verification
  RAILWAY_DECLARATION: 5, // Railway compliance
} as const;

// Verification Requirements by Business Category
export const VERIFICATION_REQUIREMENTS = {
  FOOD: ['aadhaar', 'pan', 'bank', 'fssai', 'police', 'railway'],
  RETAIL: ['aadhaar', 'pan', 'bank', 'police', 'railway'],
  SERVICE: ['aadhaar', 'pan', 'bank', 'police', 'railway'],
} as const;

// Document Types for Upload
export const DOCUMENT_TYPES = {
  AADHAAR_FRONT: 'aadhaar_front',
  AADHAAR_BACK: 'aadhaar_back',
  PAN_CARD: 'pan_card',
  CANCELLED_CHEQUE: 'cancelled_cheque',
  FSSAI_CERTIFICATE: 'fssai_certificate',
  POLICE_VERIFICATION: 'police_verification',
  TRADE_LICENSE: 'trade_license',
  SHOP_ESTABLISHMENT: 'shop_establishment',
  ITR_DOCUMENT: 'itr_document',
  BANK_STATEMENT: 'bank_statement',
  PHOTO: 'photo',
} as const;

// API Rate Limiting (for future implementation)
export const RATE_LIMIT = {
  LOGIN: { max: 5, window: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  REGISTER: { max: 3, window: 60 * 60 * 1000 }, // 3 attempts per hour
  UPLOAD: { max: 10, window: 60 * 60 * 1000 }, // 10 uploads per hour
};

// Cloudinary Enhanced Folders
export const CLOUDINARY_FOLDERS = {
  DOCUMENTS: 'railway-vendors/documents',
  QR_CODES: 'railway-vendors/qr-codes',
  PROFILES: 'railway-vendors/profiles',
  SIGNATURES: 'railway-vendors/signatures',
  VERIFICATION: 'railway-vendors/verification',
  LICENSES: 'railway-vendors/licenses',
} as const;

// QR Code Configuration
export const QR_CODE_CONFIG = {
  SIZE: 200, // Size in pixels
  ERROR_CORRECTION: 'M', // Error correction level
  TYPE: 'png',
  QUALITY: 100,
  MARGIN: 1,
} as const;

// License Generation Config
export const LICENSE_CONFIG = {
  NUMBER_PREFIX: 'RVL', // Railway Vendor License
  NUMBER_LENGTH: 10, // Total length including prefix
  VALIDITY_MONTHS: 12, // Default validity period
  RENEWAL_BUFFER_DAYS: 30, // Days before expiry to allow renewal
} as const;

// Negotiation Limits
export const NEGOTIATION_LIMITS = {
  MAX_COUNTER_OFFERS: 10,
  MAX_DURATION_DAYS: 30, // Maximum negotiation period
  AUTO_EXPIRE_HOURS: 72, // Auto-expire if no response
  MIN_RENT_PERCENTAGE: 50, // Minimum rent as % of quoted
  MAX_RENT_PERCENTAGE: 200, // Maximum rent as % of quoted
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  AADHAAR_LENGTH: 12,
  PAN_LENGTH: 10,
  PAN_PATTERN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  IFSC_PATTERN: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  PHONE_PATTERN: /^[6-9]\d{9}$/,
  GST_PATTERN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  FSSAI_PATTERN: /^[0-9]{14}$/,
} as const;

// System Configuration
export const SYSTEM_CONFIG = {
  PROFILE_COMPLETION_MINIMUM: 80, // Minimum % to submit application
  AUTO_VERIFICATION_ENABLED: false, // Whether auto-verification is enabled
  EMAIL_NOTIFICATIONS_ENABLED: true,
  SMS_NOTIFICATIONS_ENABLED: true,
  AUDIT_LOG_RETENTION_DAYS: 2555, // 7 years
} as const;
