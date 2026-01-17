import mongoose, { Schema, Document, Model } from 'mongoose';

export type BusinessType = 'tea' | 'food' | 'retail' | 'books' | 'services' | 'other';
export type BusinessCategory = 'FOOD' | 'RETAIL' | 'SERVICE';

export interface IVendorBusiness extends Document {
  vendorId: mongoose.Types.ObjectId;
  businessName: string;
  businessType: BusinessType;
  businessCategory: BusinessCategory;
  businessDescription?: string;
  yearsOfExperience: number;
  employeeCount: number;
  existingShopAddress?: string; // Previous/current shop if any
  gstNumber?: string;
  gstRegistered: boolean;
  tradeLicense?: string;
  tradeLicenseUrl?: string;
  shopEstablishmentLicense?: string;
  shopEstablishmentUrl?: string;
  businessVerified: boolean;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VendorBusinessSchema: Schema = new Schema(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    businessType: {
      type: String,
      enum: ['tea', 'food', 'retail', 'books', 'services', 'other'],
      required: true,
    },
    businessCategory: {
      type: String,
      enum: ['FOOD', 'RETAIL', 'SERVICE'],
      required: true,
    },
    businessDescription: {
      type: String,
      trim: true,
    },
    yearsOfExperience: {
      type: Number,
      required: true,
      min: 0,
    },
    employeeCount: {
      type: Number,
      required: true,
      min: 0,
    },
    existingShopAddress: {
      type: String,
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    gstRegistered: {
      type: Boolean,
      default: false,
    },
    tradeLicense: {
      type: String,
      trim: true,
    },
    tradeLicenseUrl: {
      type: String,
      trim: true,
    },
    shopEstablishmentLicense: {
      type: String,
      trim: true,
    },
    shopEstablishmentUrl: {
      type: String,
      trim: true,
    },
    businessVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
VendorBusinessSchema.index({ vendorId: 1 });
VendorBusinessSchema.index({ businessCategory: 1 });
VendorBusinessSchema.index({ businessType: 1 });
VendorBusinessSchema.index({ businessVerified: 1 });

const VendorBusiness: Model<IVendorBusiness> = mongoose.models.VendorBusiness || mongoose.model<IVendorBusiness>('VendorBusiness', VendorBusinessSchema);

export default VendorBusiness;