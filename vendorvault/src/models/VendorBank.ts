import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVendorBank extends Document {
  vendorId: mongoose.Types.ObjectId;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName?: string;
  branchName?: string;
  cancelledChequeUrl?: string;
  bankVerified: boolean;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VendorBankSchema: Schema = new Schema(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    accountHolderName: {
      type: String,
      required: true,
      trim: true,
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
    },
    ifscCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    bankName: {
      type: String,
      trim: true,
    },
    branchName: {
      type: String,
      trim: true,
    },
    cancelledChequeUrl: {
      type: String,
      trim: true,
    },
    bankVerified: {
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
VendorBankSchema.index({ vendorId: 1 });
VendorBankSchema.index({ bankVerified: 1 });
VendorBankSchema.index({ accountNumber: 1, ifscCode: 1 });

const VendorBank: Model<IVendorBank> = mongoose.models.VendorBank || mongoose.model<IVendorBank>('VendorBank', VendorBankSchema);

export default VendorBank;