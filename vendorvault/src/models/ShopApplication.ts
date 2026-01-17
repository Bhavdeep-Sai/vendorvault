import mongoose, { Schema, Document, Model } from 'mongoose';

export type ApplicationStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'NEGOTIATION'
  | 'APPROVED'
  | 'REJECTED'
  | 'LICENSED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'TERMINATED';

export interface IShopApplication extends Document {
  vendorId: mongoose.Types.ObjectId;
  shopId: string; // From StationLayout
  shopName: string;
  shopDescription: string;
  stationId: mongoose.Types.ObjectId;
  platformId?: mongoose.Types.ObjectId;
  quotedRent: number;
  securityDeposit: number;
  proposedStartDate: Date;
  proposedEndDate: Date;
  businessPlan?: string;
  specialRequests?: string;
  status: ApplicationStatus;
  
  // Workflow tracking
  submittedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  
  // License details (when approved)
  licenseNumber?: string;
  licenseIssuedAt?: Date;
  licenseExpiresAt?: Date;
  qrCodeUrl?: string;
  
  // Negotiation tracking
  negotiationStartedAt?: Date;
  finalAgreedRent?: number;
  finalSecurityDeposit?: number;
  
  // Verification status check
  verificationCheckedAt?: Date;
  verificationStatus?: {
    aadhaarVerified: boolean;
    panVerified: boolean;
    bankVerified: boolean;
    fssaiVerified?: boolean; // Only for FOOD category
    policeVerified: boolean;
    railwayDeclarationSigned: boolean;
    allVerified: boolean;
  };
  
  // Risk assessment
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  riskFactors?: string[];
  
  // Audit trail
  statusHistory?: {
    status: ApplicationStatus;
    changedBy: mongoose.Types.ObjectId;
    changedAt: Date;
    reason?: string;
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

const ShopApplicationSchema: Schema = new Schema(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shopId: {
      type: String,
      required: true,
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
      // optional: description is informational and may be omitted
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
    quotedRent: {
      type: Number,
      required: true,
      min: 0,
    },
    securityDeposit: {
      type: Number,
      required: true,
      min: 0,
    },
    proposedStartDate: {
      type: Date,
      required: true,
    },
    proposedEndDate: {
      type: Date,
      required: true,
    },
    businessPlan: {
      type: String,
      trim: true,
    },
    specialRequests: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'NEGOTIATION', 'APPROVED', 'REJECTED', 'LICENSED', 'ACTIVE', 'EXPIRED', 'TERMINATED'],
      default: 'DRAFT',
      required: true,
    },
    
    // Workflow tracking
    submittedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    
    // License details
    licenseNumber: { type: String, trim: true, unique: true, sparse: true },
    licenseIssuedAt: { type: Date },
    licenseExpiresAt: { type: Date },
    qrCodeUrl: { type: String, trim: true },
    
    // Negotiation tracking
    negotiationStartedAt: { type: Date },
    finalAgreedRent: { type: Number, min: 0 },
    finalSecurityDeposit: { type: Number, min: 0 },
    
    // Verification status
    verificationCheckedAt: { type: Date },
    verificationStatus: {
      aadhaarVerified: { type: Boolean, default: false },
      panVerified: { type: Boolean, default: false },
      bankVerified: { type: Boolean, default: false },
      fssaiVerified: { type: Boolean, default: false },
      policeVerified: { type: Boolean, default: false },
      railwayDeclarationSigned: { type: Boolean, default: false },
      allVerified: { type: Boolean, default: false },
    },
    
    // Risk assessment
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
    },
    riskFactors: [{ type: String }],
    
    // Audit trail
    statusHistory: [{
      status: {
        type: String,
        enum: ['DRAFT', 'SUBMITTED', 'NEGOTIATION', 'APPROVED', 'REJECTED', 'LICENSED', 'ACTIVE', 'EXPIRED', 'TERMINATED'],
        required: true,
      },
      changedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      changedAt: {
        type: Date,
        default: Date.now,
      },
      reason: {
        type: String,
        trim: true,
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
ShopApplicationSchema.index({ vendorId: 1, status: 1 });
ShopApplicationSchema.index({ shopId: 1, status: 1 });
ShopApplicationSchema.index({ stationId: 1, status: 1 });
ShopApplicationSchema.index({ status: 1, createdAt: -1 });
ShopApplicationSchema.index({ licenseNumber: 1 });
ShopApplicationSchema.index({ approvedBy: 1 });
ShopApplicationSchema.index({ riskLevel: 1 });
// Note: verification is computed from Document collection. Keep schema field
// for backward compatibility but remove the index as it's no longer used for queries.

// Compound indexes for complex queries
ShopApplicationSchema.index({ vendorId: 1, shopId: 1 }, { unique: true }); // One application per vendor per shop
ShopApplicationSchema.index({ stationId: 1, status: 1, createdAt: -1 }); // Station manager dashboard
ShopApplicationSchema.index({ status: 1, riskLevel: 1 }); // Risk-based filtering

const ShopApplication: Model<IShopApplication> = mongoose.models.ShopApplication || mongoose.model<IShopApplication>('ShopApplication', ShopApplicationSchema);

export default ShopApplication;