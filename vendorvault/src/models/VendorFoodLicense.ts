import mongoose, { Schema, Document, Model } from 'mongoose';

export type FoodType = 'veg' | 'nonveg' | 'packaged' | 'fresh' | 'mixed';

export interface IVendorFoodLicense extends Document {
  vendorId: mongoose.Types.ObjectId;
  fssaiNumber: string;
  fssaiCertificateUrl: string;
  fssaiExpiryDate: Date;
  foodType: FoodType;
  foodItems: string[]; // List of food items to be sold
  kitchenType?: 'on_premises' | 'off_premises' | 'packaged_only';
  hygieneDeclarationAccepted: boolean;
  hygieneTrainingCertificate?: string;
  waterQualityCertificate?: string;
  pestControlCertificate?: string;
  fssaiVerified: boolean;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  reminderSent?: Date; // For expiry reminders
  createdAt: Date;
  updatedAt: Date;
}

const VendorFoodLicenseSchema: Schema = new Schema(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    fssaiNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    fssaiCertificateUrl: {
      type: String,
      required: true,
      trim: true,
    },
    fssaiExpiryDate: {
      type: Date,
      required: true,
    },
    foodType: {
      type: String,
      enum: ['veg', 'nonveg', 'packaged', 'fresh', 'mixed'],
      required: true,
    },
    foodItems: {
      type: [String],
      required: true,
    },
    kitchenType: {
      type: String,
      enum: ['on_premises', 'off_premises', 'packaged_only'],
    },
    hygieneDeclarationAccepted: {
      type: Boolean,
      required: true,
      default: false,
    },
    hygieneTrainingCertificate: {
      type: String,
      trim: true,
    },
    waterQualityCertificate: {
      type: String,
      trim: true,
    },
    pestControlCertificate: {
      type: String,
      trim: true,
    },
    fssaiVerified: {
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
    reminderSent: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
VendorFoodLicenseSchema.index({ vendorId: 1 });
VendorFoodLicenseSchema.index({ fssaiNumber: 1 });
VendorFoodLicenseSchema.index({ fssaiVerified: 1 });
VendorFoodLicenseSchema.index({ fssaiExpiryDate: 1 });
VendorFoodLicenseSchema.index({ foodType: 1 });

const VendorFoodLicense: Model<IVendorFoodLicense> = mongoose.models.VendorFoodLicense || mongoose.model<IVendorFoodLicense>('VendorFoodLicense', VendorFoodLicenseSchema);

export default VendorFoodLicense;