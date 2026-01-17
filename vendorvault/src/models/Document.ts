import mongoose, { Schema, Document as MongooseDocument, Model } from 'mongoose';

export type DocumentType = 
  | 'AADHAAR'
  | 'PAN'
  | 'BANK_STATEMENT'
  | 'FSSAI'
  | 'POLICE_VERIFICATION'
  | 'RAILWAY_DECLARATION'
  | 'BUSINESS_PHOTO'
  | 'ID_PROOF'
  | 'PHOTO'
  | 'EXISTING_LICENSE'
  | 'OTHER';

export interface IDocument extends MongooseDocument {
  vendorId: mongoose.Types.ObjectId;
  type: DocumentType;
  fileUrl: string;
  fileName?: string;
  verified?: boolean;
  verificationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema: Schema = new Schema(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'AADHAAR',
        'PAN',
        'BANK_STATEMENT',
        'FSSAI',
        'POLICE_VERIFICATION',
        'RAILWAY_DECLARATION',
        'BUSINESS_PHOTO',
        'ID_PROOF',
        'PHOTO',
        'EXISTING_LICENSE',
        'OTHER'
      ],
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      trim: true,
    },
    verified: {
      type: Boolean,
    },
    verificationNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // This creates createdAt and updatedAt automatically
  }
);

// Create compound index for efficient queries
DocumentSchema.index({ vendorId: 1, type: 1 });
DocumentSchema.index({ vendorId: 1, createdAt: -1 });

const VendorDocument: Model<IDocument> = mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema);

export default VendorDocument;

