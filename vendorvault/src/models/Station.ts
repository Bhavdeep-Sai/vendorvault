import mongoose, { Schema, Document } from 'mongoose';

export interface IStation extends Document {
  stationName: string;
  stationCode: string;
  railwayZone: string;
  division?: string;
  stationCategory: 'NSG-1' | 'NSG-2' | 'NSG-3' | 'NSG-4' | 'NSG-5' | 'NSG-6' | 'SG-1' | 'SG-2' | 'SG-3' | 'HG-1' | 'HG-2' | 'HG-3';
  operationalStatus: 'ACTIVE' | 'RENOVATION' | 'PENDING_APPROVAL';
  totalAreaSqM?: number;
  platformsCount: number;
  entryGates?: number;
  dailyFootfallAvg: number;
  peakFootfall?: number;
  stationManagerId: mongoose.Types.ObjectId;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  layoutCompleted: boolean; // Track if station layout is setup
  approvedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StationSchema: Schema = new Schema(
  {
    stationName: {
      type: String,
      required: true,
      trim: true,
    },
    stationCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 5,
    },
    railwayZone: {
      type: String,
      required: true,
      trim: true,
    },
    division: {
      type: String,
      required: false,
      trim: true,
    },
    stationCategory: {
      type: String,
      enum: ['NSG-1', 'NSG-2', 'NSG-3', 'NSG-4', 'NSG-5', 'NSG-6', 'SG-1', 'SG-2', 'SG-3', 'HG-1', 'HG-2', 'HG-3'],
      required: true,
    },
    operationalStatus: {
      type: String,
      enum: ['ACTIVE', 'RENOVATION', 'PENDING_APPROVAL'],
      required: true,
      default: 'PENDING_APPROVAL',
    },
    totalAreaSqM: {
      type: Number,
      required: false,
      min: 0,
    },
    platformsCount: {
      type: Number,
      required: true,
      min: 1,
    },
    entryGates: {
      type: Number,
      required: false,
      min: 1,
      default: 1,
    },
    dailyFootfallAvg: {
      type: Number,
      required: true,
      min: 0,
    },
    peakFootfall: {
      type: Number,
      required: false,
      min: 0,
    },
    stationManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      required: true,
      default: 'PENDING',
    },
    layoutCompleted: {
      type: Boolean,
      required: true,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    rejectionReason: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
// stationCode already has unique: true, no need for separate index
StationSchema.index({ stationManagerId: 1 });
StationSchema.index({ approvalStatus: 1 });
StationSchema.index({ railwayZone: 1 });
StationSchema.index({ approvalStatus: 1, createdAt: -1 }); // Compound index for sorting

const Station = (mongoose.models.Station as mongoose.Model<IStation>) || mongoose.model<IStation>('Station', StationSchema);

export default Station;