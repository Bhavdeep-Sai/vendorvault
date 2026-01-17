import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRailwayDeclaration extends Document {
  noEncroachment: boolean;
  noSubletting: boolean;
  inspectionAllowed: boolean;
  railwayRulesAccepted: boolean;
}

export interface IVendorRailwayDeclaration extends Document {
  vendorId: mongoose.Types.ObjectId;
  declarations: IRailwayDeclaration;
  digitalSignature: string; // Base64 or URL to signature
  digitalSignatureData?: string; // JSON containing signature metadata
  signedAt: Date;
  ipAddress?: string;
  deviceInfo?: string;
  witnessName?: string; // Optional witness for the signing
  witnessContact?: string;
  legalAcceptance: boolean; // Confirms understanding of legal implications
  declarationVersion?: string; // Version of T&C accepted
  agreementUrl?: string; // URL to the full agreement document
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  isValid: boolean; // Whether the declaration is currently valid
  expiryDate?: Date; // Some declarations may have validity periods
  renewalRequired?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RailwayDeclarationSchema: Schema = new Schema({
  noEncroachment: {
    type: Boolean,
    required: true,
    default: false,
  },
  noSubletting: {
    type: Boolean,
    required: true,
    default: false,
  },
  inspectionAllowed: {
    type: Boolean,
    required: true,
    default: false,
  },
  railwayRulesAccepted: {
    type: Boolean,
    required: true,
    default: false,
  },
}, { _id: false });

const VendorRailwayDeclarationSchema: Schema = new Schema(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    declarations: {
      type: RailwayDeclarationSchema,
      required: true,
    },
    digitalSignature: {
      type: String,
      required: true,
      trim: true,
    },
    digitalSignatureData: {
      type: String, // JSON string with metadata
      trim: true,
    },
    signedAt: {
      type: Date,
      required: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    deviceInfo: {
      type: String,
      trim: true,
    },
    witnessName: {
      type: String,
      trim: true,
    },
    witnessContact: {
      type: String,
      trim: true,
    },
    legalAcceptance: {
      type: Boolean,
      required: true,
      default: false,
    },
    declarationVersion: {
      type: String,
      default: '1.0',
    },
    agreementUrl: {
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
    isValid: {
      type: Boolean,
      default: true,
    },
    expiryDate: {
      type: Date,
    },
    renewalRequired: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
VendorRailwayDeclarationSchema.index({ vendorId: 1 });
VendorRailwayDeclarationSchema.index({ isValid: 1 });
VendorRailwayDeclarationSchema.index({ signedAt: 1 });
VendorRailwayDeclarationSchema.index({ expiryDate: 1 });

const VendorRailwayDeclaration: Model<IVendorRailwayDeclaration> = mongoose.models.VendorRailwayDeclaration || mongoose.model<IVendorRailwayDeclaration>('VendorRailwayDeclaration', VendorRailwayDeclarationSchema);

export default VendorRailwayDeclaration;