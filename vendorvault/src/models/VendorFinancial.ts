import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVendorFinancial extends Document {
  vendorId: mongoose.Types.ObjectId;
  annualTurnover: number;
  expectedMonthlyRevenue: number;
  canPaySecurityDeposit: boolean;
  securityDepositAmount?: number;
  monthlyRentBudget?: number;
  financialDocuments?: {
    itrUrl?: string; // Income Tax Return
    balanceSheetUrl?: string;
    profitLossUrl?: string;
    bankStatementUrl?: string;
  };
  creditScore?: number;
  previousRentHistory?: {
    landlordName?: string;
    landlordContact?: string;
    rentAmount?: number;
    tenancyPeriod?: string;
    reasonForLeaving?: string;
  }[];
  financialVerified: boolean;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  riskAssessment?: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: Date;
  updatedAt: Date;
}

const VendorFinancialSchema: Schema = new Schema(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    annualTurnover: {
      type: Number,
      required: true,
      min: 0,
    },
    expectedMonthlyRevenue: {
      type: Number,
      required: true,
      min: 0,
    },
    canPaySecurityDeposit: {
      type: Boolean,
      required: true,
      default: false,
    },
    securityDepositAmount: {
      type: Number,
      min: 0,
    },
    monthlyRentBudget: {
      type: Number,
      min: 0,
    },
    financialDocuments: {
      itrUrl: { type: String, trim: true },
      balanceSheetUrl: { type: String, trim: true },
      profitLossUrl: { type: String, trim: true },
      bankStatementUrl: { type: String, trim: true },
    },
    creditScore: {
      type: Number,
      min: 300,
      max: 900,
    },
    previousRentHistory: [{
      landlordName: { type: String, trim: true },
      landlordContact: { type: String, trim: true },
      rentAmount: { type: Number, min: 0 },
      tenancyPeriod: { type: String, trim: true },
      reasonForLeaving: { type: String, trim: true },
    }],
    financialVerified: {
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
    riskAssessment: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
VendorFinancialSchema.index({ vendorId: 1 });
VendorFinancialSchema.index({ financialVerified: 1 });
VendorFinancialSchema.index({ riskAssessment: 1 });
VendorFinancialSchema.index({ annualTurnover: 1 });

const VendorFinancial: Model<IVendorFinancial> = mongoose.models.VendorFinancial || mongoose.model<IVendorFinancial>('VendorFinancial', VendorFinancialSchema);

export default VendorFinancial;