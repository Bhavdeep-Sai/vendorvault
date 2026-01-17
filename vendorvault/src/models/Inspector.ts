import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInspectionRecord {
  inspectionDate: Date;
  inspectorId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  shopId: string;
  licenseVerified: boolean;
  hygieneRating: number; // 1-5
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'WARNING';
  findings: string[];
  remarks?: string;
  photosUrls?: string[];
  actionRequired?: string;
  followUpDate?: Date;
}

export interface IInspector extends Document {
  userId: mongoose.Types.ObjectId;
  stationId: mongoose.Types.ObjectId;
  employeeId: string;
  designation: string;
  
  // Assignment
  assignedBy: mongoose.Types.ObjectId; // Station manager
  assignedDate: Date;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  zone?: string; // For national inspectors (railway zone)
  
  // Inspection history
  totalInspections: number;
  lastInspectionDate?: Date;
  inspections: IInspectionRecord[];
  
  // Contact
  contactNumber?: string;
  email?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const InspectionRecordSchema = new Schema({
  inspectionDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  inspectorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  vendorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  shopId: {
    type: String,
    required: true,
  },
  licenseVerified: {
    type: Boolean,
    required: true,
  },
  hygieneRating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  complianceStatus: {
    type: String,
    enum: ['COMPLIANT', 'NON_COMPLIANT', 'WARNING'],
    required: true,
  },
  findings: [String],
  remarks: String,
  photosUrls: [String],
  actionRequired: String,
  followUpDate: Date,
});

const InspectorSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    stationId: {
      type: Schema.Types.ObjectId,
      ref: 'Station',
      required: true,
    },
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    zone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      required: true,
    },
    totalInspections: {
      type: Number,
      default: 0,
    },
    lastInspectionDate: {
      type: Date,
    },
    inspections: [InspectionRecordSchema],
    contactNumber: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
InspectorSchema.index({ userId: 1 });
InspectorSchema.index({ stationId: 1, status: 1 });
InspectorSchema.index({ employeeId: 1 });

const Inspector: Model<IInspector> = mongoose.models.Inspector || mongoose.model<IInspector>('Inspector', InspectorSchema);

export default Inspector;
