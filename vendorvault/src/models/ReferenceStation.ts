import mongoose, { Schema, Document } from 'mongoose';

export interface IReferenceStation extends Document {
  stationName: string;
  stationCode: string;
  railwayZone: string;
  division?: string;
  stationCategory: string;
  platformsCount?: number;
  dailyFootfallAvg?: number;
  city?: string;
  state?: string;
  pincode?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReferenceStationSchema: Schema = new Schema(
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
      required: true,
      trim: true,
    },
    platformsCount: {
      type: Number,
      required: false,
    },
    dailyFootfallAvg: {
      type: Number,
      required: false,
    },
    city: {
      type: String,
      required: false,
      trim: true,
    },
    state: {
      type: String,
      required: false,
      trim: true,
    },
    pincode: {
      type: String,
      required: false,
      trim: true,
    },
    address: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for search performance
ReferenceStationSchema.index({ stationName: 'text', stationCode: 'text' });
ReferenceStationSchema.index({ stationCode: 1 });
ReferenceStationSchema.index({ railwayZone: 1 });

const ReferenceStation = mongoose.models?.ReferenceStation || mongoose.model<IReferenceStation>('ReferenceStation', ReferenceStationSchema);

export default ReferenceStation;
