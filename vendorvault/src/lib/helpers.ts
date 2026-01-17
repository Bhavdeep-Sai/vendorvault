import { 
  STATUS_COLORS, 
  VALIDATION_RULES, 
  PROFILE_COMPLETION_WEIGHTS, 
  VERIFICATION_REQUIREMENTS,
  LICENSE_CONFIG,
  BUSINESS_CATEGORIES
} from './constants';
import { BusinessCategory } from '../models/VendorBusiness';

export type StatusType = keyof typeof STATUS_COLORS;

// Status and Display Helpers
export function getStatusColor(status: string): string {
  const upperStatus = status.toUpperCase() as StatusType;
  return STATUS_COLORS[upperStatus] || STATUS_COLORS.PENDING;
}

export function generateLicenseNumber(): string {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${LICENSE_CONFIG.NUMBER_PREFIX}${year}${timestamp}${random}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isLicenseExpiringSoon(expiresAt: Date | string | undefined): boolean {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
}

export function isLicenseExpired(expiresAt: Date | string | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export function formatPhoneNumber(phone: string): string {
  // Format Indian phone numbers
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
}

// Enhanced Validation Functions
export function validateAadhaar(aadhaar: string): boolean {
  const cleaned = aadhaar.replace(/\s/g, '');
  return cleaned.length === VALIDATION_RULES.AADHAAR_LENGTH && /^\d+$/.test(cleaned);
}

export function validatePAN(pan: string): boolean {
  const cleaned = pan.toUpperCase().replace(/\s/g, '');
  return VALIDATION_RULES.PAN_PATTERN.test(cleaned);
}

export function validateIFSC(ifsc: string): boolean {
  const cleaned = ifsc.toUpperCase().replace(/\s/g, '');
  return VALIDATION_RULES.IFSC_PATTERN.test(cleaned);
}

export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return VALIDATION_RULES.PHONE_PATTERN.test(cleaned);
}

export function validateGST(gst: string): boolean {
  const cleaned = gst.toUpperCase().replace(/\s/g, '');
  return VALIDATION_RULES.GST_PATTERN.test(cleaned);
}

export function validateFSSAI(fssai: string): boolean {
  const cleaned = fssai.replace(/\s/g, '');
  return VALIDATION_RULES.FSSAI_PATTERN.test(cleaned);
}

export function validateEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

// Profile Completion Calculator
export interface ProfileData {
  personal?: {
    fullName?: string;
    aadhaarNumber?: string;
    aadhaarVerified?: boolean;
    panNumber?: string;
    panVerified?: boolean;
    photo?: string;
    permanentAddress?: string;
    currentAddress?: string;
  };
  business?: {
    businessName?: string;
    businessType?: string;
    businessCategory?: string;
    yearsOfExperience?: number;
    employeeCount?: number;
  };
  bank?: {
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankVerified?: boolean;
  };
  financial?: {
    annualTurnover?: number;
    expectedMonthlyRevenue?: number;
    canPaySecurityDeposit?: boolean;
  };
  foodLicense?: {
    fssaiNumber?: string;
    fssaiVerified?: boolean;
    hygieneDeclarationAccepted?: boolean;
  };
  police?: {
    policeVerificationCertificate?: string;
    policeVerified?: boolean;
    criminalDeclaration?: boolean;
  };
  railwayDeclaration?: {
    digitalSignature?: string;
    signedAt?: Date;
    isValid?: boolean;
  };
}

export function calculateProfileCompletion(data: ProfileData, businessCategory?: BusinessCategory): number {
  let totalWeight = 0;
  let completedWeight = 0;

  // Personal Information (20%)
  totalWeight += PROFILE_COMPLETION_WEIGHTS.PERSONAL;
  const personalComplete = data.personal?.fullName && 
    data.personal?.aadhaarNumber && 
    data.personal?.panNumber &&
    data.personal?.permanentAddress;
  if (personalComplete) {
    completedWeight += PROFILE_COMPLETION_WEIGHTS.PERSONAL;
  }

  // Business Information (25%)
  totalWeight += PROFILE_COMPLETION_WEIGHTS.BUSINESS;
  const businessComplete = data.business?.businessName && 
    data.business?.businessType && 
    data.business?.businessCategory &&
    data.business?.yearsOfExperience !== undefined &&
    data.business?.employeeCount !== undefined;
  if (businessComplete) {
    completedWeight += PROFILE_COMPLETION_WEIGHTS.BUSINESS;
  }

  // Bank Information (15%)
  totalWeight += PROFILE_COMPLETION_WEIGHTS.BANK;
  const bankComplete = data.bank?.accountHolderName && 
    data.bank?.accountNumber && 
    data.bank?.ifscCode;
  if (bankComplete) {
    completedWeight += PROFILE_COMPLETION_WEIGHTS.BANK;
  }

  // Financial Information (10%)
  totalWeight += PROFILE_COMPLETION_WEIGHTS.FINANCIAL;
  const financialComplete = data.financial?.annualTurnover !== undefined && 
    data.financial?.expectedMonthlyRevenue !== undefined &&
    data.financial?.canPaySecurityDeposit !== undefined;
  if (financialComplete) {
    completedWeight += PROFILE_COMPLETION_WEIGHTS.FINANCIAL;
  }

  // FSSAI License (15% - only for FOOD category)
  if (businessCategory === BUSINESS_CATEGORIES.FOOD) {
    totalWeight += PROFILE_COMPLETION_WEIGHTS.FOOD_LICENSE;
    const fssaiComplete = data.foodLicense?.fssaiNumber && 
      data.foodLicense?.hygieneDeclarationAccepted;
    if (fssaiComplete) {
      completedWeight += PROFILE_COMPLETION_WEIGHTS.FOOD_LICENSE;
    }
  }

  // Police Verification (10%)
  totalWeight += PROFILE_COMPLETION_WEIGHTS.POLICE;
  const policeComplete = data.police?.policeVerificationCertificate && 
    data.police?.criminalDeclaration;
  if (policeComplete) {
    completedWeight += PROFILE_COMPLETION_WEIGHTS.POLICE;
  }

  // Railway Declaration (5%)
  totalWeight += PROFILE_COMPLETION_WEIGHTS.RAILWAY_DECLARATION;
  const railwayComplete = data.railwayDeclaration?.digitalSignature && 
    data.railwayDeclaration?.signedAt;
  if (railwayComplete) {
    completedWeight += PROFILE_COMPLETION_WEIGHTS.RAILWAY_DECLARATION;
  }

  return Math.round((completedWeight / totalWeight) * 100);
}

// Verification Status Checker
export interface VerificationStatus {
  aadhaarVerified: boolean;
  panVerified: boolean;
  bankVerified: boolean;
  fssaiVerified?: boolean;
  policeVerified: boolean;
  railwayDeclarationSigned: boolean;
  allVerified: boolean;
}

export function checkVerificationStatus(
  data: ProfileData, 
  businessCategory?: BusinessCategory
): VerificationStatus {
  const status: VerificationStatus = {
    aadhaarVerified: data.personal?.aadhaarVerified || false,
    panVerified: data.personal?.panVerified || false,
    bankVerified: data.bank?.bankVerified || false,
    policeVerified: data.police?.policeVerified || false,
    railwayDeclarationSigned: data.railwayDeclaration?.isValid || false,
    allVerified: false,
  };

  // Add FSSAI verification for FOOD category
  if (businessCategory === BUSINESS_CATEGORIES.FOOD) {
    status.fssaiVerified = data.foodLicense?.fssaiVerified || false;
  }

  // Check if all required verifications are complete
  const requiredVerifications = VERIFICATION_REQUIREMENTS[businessCategory || 'RETAIL'];
  status.allVerified = requiredVerifications.every(verification => {
    switch (verification) {
      case 'aadhaar': return status.aadhaarVerified;
      case 'pan': return status.panVerified;
      case 'bank': return status.bankVerified;
      case 'fssai': return businessCategory === BUSINESS_CATEGORIES.FOOD ? status.fssaiVerified : true;
      case 'police': return status.policeVerified;
      case 'railway': return status.railwayDeclarationSigned;
      default: return true;
    }
  });

  return status;
}

// Risk Assessment
export function calculateRiskLevel(data: ProfileData): 'LOW' | 'MEDIUM' | 'HIGH' {
  let riskScore = 0;
  const factors: string[] = [];

  // Experience factor
  if (!data.business?.yearsOfExperience || data.business.yearsOfExperience < 1) {
    riskScore += 2;
    factors.push('Low experience');
  }

  // Financial factor
  if (!data.financial?.annualTurnover || data.financial.annualTurnover < 100000) {
    riskScore += 1;
    factors.push('Low annual turnover');
  }

  // Security deposit capability
  if (!data.financial?.canPaySecurityDeposit) {
    riskScore += 2;
    factors.push('Cannot pay security deposit');
  }

  // Verification completeness
  const verificationStatus = checkVerificationStatus(data, data.business?.businessCategory as BusinessCategory);
  if (!verificationStatus.allVerified) {
    riskScore += 1;
    factors.push('Incomplete verification');
  }

  // Return risk level
  if (riskScore <= 1) return 'LOW';
  if (riskScore <= 3) return 'MEDIUM';
  return 'HIGH';
}

// QR Code Data Generation
export function generateQRCodeData(licenseData: {
  vendorId: string;
  stallId: string;
  stationId: string;
  stationCode: string;
  validFrom: Date;
  validUntil: Date;
  licenseNumber: string;
  emergencyContact?: string;
}): string {
  return JSON.stringify({
    type: 'RAILWAY_VENDOR_LICENSE',
    version: '1.0',
    ...licenseData,
    generatedAt: new Date().toISOString(),
  });
}

// Utility for mobile-friendly table wrapping
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
