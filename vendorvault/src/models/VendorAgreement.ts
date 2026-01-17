import mongoose, { Schema, Document, Model } from 'mongoose';

export type AgreementStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'RENEWED' | 'TERMINATED';

export interface IVendorAgreement extends Document {
  vendorId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  stationId: mongoose.Types.ObjectId;
  shopId: string;
  
  // Agreement details
  agreementNumber: string;
  startDate: Date;
  endDate: Date;
  duration: number; // in months
  
  // Financial terms
  monthlyRent: number;
  securityDeposit: number;
  securityDepositPaid: boolean;
  securityDepositDate?: Date;
  
  // Agreement status
  status: AgreementStatus;
  
  // License details
  licenseNumber: string;
  licenseExpiryDate: Date;
  
  // Renewal tracking
  renewalReminderSent: boolean;
  renewalReminderDate?: Date;
  renewalRequired: boolean;
  renewedTo?: mongoose.Types.ObjectId; // Points to new agreement if renewed
  
  // Termination
  terminatedDate?: Date;
  terminatedBy?: mongoose.Types.ObjectId;
  terminationReason?: string;
  
  // Terms and conditions
  terms: string[];
  specialClauses?: string[];
  
  // Documents
  agreementDocumentUrl?: string;
  signedDocumentUrl?: string;
  
  // Audit
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const VendorAgreementSchema: Schema = new Schema(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'ShopApplication',
      required: true,
    },
    stationId: {
      type: Schema.Types.ObjectId,
      ref: 'Station',
      required: true,
    },
    shopId: {
      type: String,
      required: true,
      trim: true,
    },
    agreementNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    monthlyRent: {
      type: Number,
      required: true,
      min: 0,
    },
    securityDeposit: {
      type: Number,
      required: true,
      min: 0,
    },
    securityDepositPaid: {
      type: Boolean,
      default: false,
    },
    securityDepositDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'EXPIRED', 'RENEWED', 'TERMINATED'],
      default: 'DRAFT',
      required: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      trim: true,
    },
    licenseExpiryDate: {
      type: Date,
      required: true,
    },
    renewalReminderSent: {
      type: Boolean,
      default: false,
    },
    renewalReminderDate: {
      type: Date,
    },
    renewalRequired: {
      type: Boolean,
      default: false,
    },
    renewedTo: {
      type: Schema.Types.ObjectId,
      ref: 'VendorAgreement',
    },
    terminatedDate: {
      type: Date,
    },
    terminatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    terminationReason: {
      type: String,
      trim: true,
    },
    terms: {
      type: [String],
      default: [
        'Vendor must maintain cleanliness and hygiene standards',
        'Monthly rent must be paid before 5th of every month',
        'No structural modifications without written permission',
        'Business hours must comply with station regulations',
        'Valid licenses must be displayed at all times',
        'Security deposit is refundable after agreement completion',
        'Agreement is subject to termination with 30 days notice',
      ],
    },
    specialClauses: [String],
    agreementDocumentUrl: {
      type: String,
      trim: true,
    },
    signedDocumentUrl: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
VendorAgreementSchema.index({ vendorId: 1, status: 1 });
VendorAgreementSchema.index({ stationId: 1, status: 1 });
VendorAgreementSchema.index({ agreementNumber: 1 });
VendorAgreementSchema.index({ licenseNumber: 1 });
VendorAgreementSchema.index({ endDate: 1, status: 1 });
VendorAgreementSchema.index({ licenseExpiryDate: 1, status: 1 });

// Check if renewal is required (30 days before expiry)
VendorAgreementSchema.pre<IVendorAgreement>('save', function(next) {
  if (this.status === 'ACTIVE') {
    const now = new Date();
    const daysUntilExpiry = Math.floor((this.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      this.renewalRequired = true;
    }
    
    if (this.endDate < now && !this.renewedTo) {
      this.status = 'EXPIRED';
    }
  }
  next();
});

const VendorAgreement: Model<IVendorAgreement> = mongoose.models.VendorAgreement || mongoose.model<IVendorAgreement>('VendorAgreement', VendorAgreementSchema);

export default VendorAgreement;
