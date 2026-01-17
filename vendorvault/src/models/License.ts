import mongoose, { Schema, Document, Model } from 'mongoose';

export type LicenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'REVOKED' | 'ACTIVE' | 'SUSPENDED';
export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'REQUIRES_ATTENTION';

export interface InspectionLog {
  inspectorId: string;
  inspectorName: string;
  inspectionDate: Date;
  notes?: string;
  complianceStatus: ComplianceStatus;
}

export interface NegotiationMessage {
  senderId: string;
  senderRole: 'VENDOR' | 'STATION_MANAGER';
  senderName: string;
  message: string;
  proposedRent?: number;
  timestamp: Date;
}

export interface ILicense extends Document {
  vendorId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId; // Link to ShopApplication
  licenseNumber: string;
  status: LicenseStatus;
  issuedAt?: Date;
  expiresAt?: Date;
  qrCodeUrl?: string;
  qrCodeData?: string; // JSON containing: vendorId, stallId, stationId, validity
  rejectionReason?: string;
  createdByAdminId?: mongoose.Types.ObjectId;
  inspectionLogs?: InspectionLog[];
  lastInspectionDate?: Date;
  complianceStatus?: ComplianceStatus;
  
  // Shop details
  shopId?: string; // Shop ID from StationLayout
  shopName: string;
  shopDescription?: string;
  stationId: mongoose.Types.ObjectId; // Station reference
  platformId?: mongoose.Types.ObjectId; // Platform reference
  shopWidth?: number; // Shop width for reference
  shopType?: string; // Type of shop (food, retail, etc.)
  
  // Financial terms
  monthlyRent?: number; // Final agreed monthly rent
  securityDeposit?: number; // Security deposit amount
  proposedRent?: number; // Initial proposed rent by vendor
  agreedRent?: number; // Final agreed rent after negotiation
  
  // Approval details
  approvedBy?: mongoose.Types.ObjectId; // Station manager who approved
  approvedAt?: Date;
  
  // Enhanced license details for Indian Railway compliance
  licenseType: 'TEMPORARY' | 'PERMANENT' | 'SEASONAL';
  validityPeriod: number; // in months
  renewalEligible: boolean;
  renewalDate?: Date;
  
  // QR Code enhanced data
  qrCodeMetadata?: {
    vendorId: string;
    stallId: string;
    stationId: string;
    stationCode: string;
    validFrom: Date;
    validUntil: Date;
    licenseType: string;
    emergencyContact: string;
  };
  
  // Verification status at the time of license issue
  verificationSnapshot?: {
    aadhaarVerified: boolean;
    panVerified: boolean;
    bankVerified: boolean;
    fssaiVerified?: boolean;
    policeVerified: boolean;
    railwayDeclarationSigned: boolean;
    verifiedAt: Date;
  };
  
  // Legacy fields for compatibility
  negotiationMessages?: NegotiationMessage[]; // Keep for existing data
  negotiationStatus?: 'PENDING' | 'IN_PROGRESS' | 'AGREED' | 'REJECTED'; // Keep for existing data
  
  createdAt: Date;
  updatedAt: Date;
}

const LicenseSchema: Schema = new Schema(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Updated to reference User instead of Vendor
      required: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'ShopApplication',
      required: true,
    },
    licenseNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED', 'ACTIVE', 'SUSPENDED'],
      default: 'PENDING',
      required: true,
    },
    issuedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    qrCodeUrl: {
      type: String,
    },
    qrCodeData: {
      type: String, // JSON string with enhanced metadata
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    createdByAdminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    inspectionLogs: [{
      inspectorId: {
        type: String,
        required: true,
      },
      inspectorName: {
        type: String,
        required: true,
      },
      inspectionDate: {
        type: Date,
        required: true,
      },
      notes: {
        type: String,
      },
      complianceStatus: {
        type: String,
        enum: ['COMPLIANT', 'NON_COMPLIANT', 'REQUIRES_ATTENTION'],
        required: true,
      },
    }],
    lastInspectionDate: {
      type: Date,
    },
    complianceStatus: {
      type: String,
      enum: ['COMPLIANT', 'NON_COMPLIANT', 'REQUIRES_ATTENTION'],
    },
    
    // Shop details
    shopId: {
      type: String,
      trim: true,
    },
    shopName: {
      type: String,
      trim: true,
      required: true,
    },
    shopDescription: {
      type: String,
      trim: true,
    },
    stationId: {
      type: Schema.Types.ObjectId,
      ref: 'Station',
      required: true,
    },
    platformId: {
      type: Schema.Types.ObjectId,
      ref: 'Platform',
    },
    shopWidth: {
      type: Number,
    },
    shopType: {
      type: String,
      trim: true,
    },
    
    // Financial terms
    monthlyRent: {
      type: Number,
    },
    securityDeposit: {
      type: Number,
    },
    proposedRent: {
      type: Number,
    },
    agreedRent: {
      type: Number,
    },
    
    // Approval details
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    
    // Enhanced license details
    licenseType: {
      type: String,
      enum: ['TEMPORARY', 'PERMANENT', 'SEASONAL'],
      default: 'TEMPORARY',
    },
    validityPeriod: {
      type: Number, // in months
      default: 12,
    },
    renewalEligible: {
      type: Boolean,
      default: true,
    },
    renewalDate: {
      type: Date,
    },
    
    // QR Code metadata
    qrCodeMetadata: {
      vendorId: { type: String, trim: true },
      stallId: { type: String, trim: true },
      stationId: { type: String, trim: true },
      stationCode: { type: String, trim: true },
      validFrom: { type: Date },
      validUntil: { type: Date },
      licenseType: { type: String, trim: true },
      emergencyContact: { type: String, trim: true },
    },
    
    // Verification snapshot
    verificationSnapshot: {
      aadhaarVerified: { type: Boolean, default: false },
      panVerified: { type: Boolean, default: false },
      bankVerified: { type: Boolean, default: false },
      fssaiVerified: { type: Boolean, default: false },
      policeVerified: { type: Boolean, default: false },
      railwayDeclarationSigned: { type: Boolean, default: false },
      verifiedAt: { type: Date },
    },
    
    // Legacy fields for backward compatibility
    negotiationMessages: {
      type: [{
        senderId: {
          type: String,
          required: true,
        },
        senderRole: {
          type: String,
          enum: ['VENDOR', 'STATION_MANAGER'],
          required: true,
        },
        senderName: {
          type: String,
          required: true,
        },
        message: {
          type: String,
          required: true,
        },
        proposedRent: {
          type: Number,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      }],
      default: [],
    },
    negotiationStatus: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'AGREED', 'REJECTED'],
      default: 'PENDING',
    },
  },
  {
    timestamps: true,
  }
);

// Enhanced indexes for faster queries
// licenseNumber already has unique: true, no need for separate index
LicenseSchema.index({ vendorId: 1, status: 1 });
LicenseSchema.index({ applicationId: 1 });
LicenseSchema.index({ status: 1, createdAt: -1 });
LicenseSchema.index({ expiresAt: 1, status: 1 }); // Compound for expiry checks
LicenseSchema.index({ stationId: 1, status: 1 });
LicenseSchema.index({ vendorId: 1, stationId: 1 }); // Compound index

const License: Model<ILicense> = mongoose.models.License || mongoose.model<ILicense>('License', LicenseSchema);

export default License;

