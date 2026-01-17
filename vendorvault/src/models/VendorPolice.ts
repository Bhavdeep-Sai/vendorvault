import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVendorPolice extends Document {
  vendorId: mongoose.Types.ObjectId;
  policeVerificationCertificate: string; // Document URL
  policeStation?: string;
  certificateNumber?: string;
  issuedDate?: Date;
  expiryDate?: Date;
  policeVerified: boolean;
  criminalDeclaration: boolean; // Declares no criminal background
  criminalDeclarationDate?: Date;
  digitalSignatureUrl?: string; // For signed declaration
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  backgroundCheckStatus?: 'PENDING' | 'CLEAR' | 'REQUIRES_REVIEW' | 'FLAGGED';
  createdAt: Date;
  updatedAt: Date;
}

const VendorPoliceSchema: Schema = new Schema(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    policeVerificationCertificate: {
      type: String,
      required: true,
      trim: true,
    },
    policeStation: {
      type: String,
      trim: true,
    },
    certificateNumber: {
      type: String,
      trim: true,
    },
    issuedDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
    },
    policeVerified: {
      type: Boolean,
      default: false,
    },
    criminalDeclaration: {
      type: Boolean,
      required: true,
      default: false,
    },
    criminalDeclarationDate: {
      type: Date,
    },
    digitalSignatureUrl: {
      type: String,
      trim: true,
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
    backgroundCheckStatus: {
      type: String,
      enum: ['PENDING', 'CLEAR', 'REQUIRES_REVIEW', 'FLAGGED'],
      default: 'PENDING',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
VendorPoliceSchema.index({ vendorId: 1 });
VendorPoliceSchema.index({ policeVerified: 1 });
VendorPoliceSchema.index({ backgroundCheckStatus: 1 });
VendorPoliceSchema.index({ expiryDate: 1 });

const VendorPolice: Model<IVendorPolice> = mongoose.models.VendorPolice || mongoose.model<IVendorPolice>('VendorPolice', VendorPoliceSchema);

export default VendorPolice;