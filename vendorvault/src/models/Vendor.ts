import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVendor extends Document {
  userId: mongoose.Types.ObjectId;
  businessName: string;
  
  // Deprecated fields - use User model instead
  ownerName?: string; // @deprecated Use User.name
  contactNumber?: string; // @deprecated Use User.phone
  email?: string; // @deprecated Use User.email
  address?: string; // @deprecated Use User.address for personal address
  
  gstNumber?: string;
  businessType: string;
  customBusinessType?: string; // For "other" business type
  stationName?: string;
  stationCode?: string;
  platformNumber?: string;
  shopNumber?: string;
  stallLocationDescription?: string;
  profileCompleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema: Schema = new Schema(
  {
    userId: {
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
    // DEPRECATED: Use User.name instead
    ownerName: {
      type: String,
      trim: true,
    },
    // DEPRECATED: Use User.phone instead
    contactNumber: {
      type: String,
      trim: true,
    },
    // DEPRECATED: Use User.email instead
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    // DEPRECATED: Use User.address instead for personal address
    address: {
      type: String,
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    businessType: {
      type: String,
      required: true,
      trim: true,
    },
    customBusinessType: {
      type: String,
      trim: true,
    },
    stationName: {
      type: String,
      trim: true,
    },
    stationCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    platformNumber: {
      type: String,
      trim: true,
    },
    shopNumber: {
      type: String,
      trim: true,
    },
    stallLocationDescription: {
      type: String,
      trim: true,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
VendorSchema.index({ userId: 1 });

// Remove the old model from cache to force schema update
if (mongoose.models?.Vendor) {
  delete mongoose.models.Vendor;
}

const Vendor = (mongoose.models.Vendor as mongoose.Model<IVendor>) || mongoose.model<IVendor>('Vendor', VendorSchema);

export default Vendor;

