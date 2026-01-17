/**
 * Station Layout Model
 * 
 * MongoDB model for storing complete station layouts
 */

import mongoose, { Schema, Document } from 'mongoose';

// Shop Zone subdocument - Generic allocation areas (not category-based)
const ShopZoneSchema = new Schema({
  id: { type: String }, // Add explicit id field
  shopId: String,
  x: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number }, // Optional height, defaults to width for square
  category: {
    type: String,
    enum: ['food', 'retail', 'kiosk', 'bookstore', 'pharmacy', 'electronics', 'clothing', 'other', 'general'],
    default: 'general', // Generic allocation area by default
  },
  minWidth: { type: Number, default: 50 },
  maxWidth: { type: Number, default: 500 },
  isAllocated: { type: Boolean, default: false },
  vendorId: String,
  rent: Number,
  shopName: String, // Actual shop name when allocated
  shopType: String, // Actual shop type when allocated
  notes: String,
}, { _id: true });

// Platform subdocument (legacy - for old track-based structure)
const PlatformSchema = new Schema({
  id: { type: String }, // Add explicit id field
  platformNumber: { type: String, required: true },
  side: {
    type: String,
    enum: ['up', 'down', 'single'],
    required: true,
  },
  length: { type: Number, required: true },
  width: { type: Number, required: true },
  startX: { type: Number, required: true },
  shops: [ShopZoneSchema],
  restrictedZones: [{
    x: Number,
    width: Number,
  }],
}, { _id: true });

// New Platform Schema (for new platform-based architecture)
const NewPlatformSchema = new Schema({
  id: { type: String }, // Add explicit id field
  platformNumber: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  length: { type: Number, required: true },
  width: { type: Number, required: true },
  shops: [ShopZoneSchema],
  restrictedZones: [{
    x: Number,
    width: Number,
    height: Number,
    side: String,
  }],
  // Single-track configuration
  track: {
    trackNumber: Number,
    x: Number,
    y: Number,
    length: Number,
    height: Number,
  },
  restrictedZone: {
    height: Number,
  },
  isInverted: { type: Boolean, default: false },
  // Dual-track configuration
  isDualTrack: { type: Boolean, default: false },
  topTrack: {
    trackNumber: Number,
    height: Number,
  },
  topRestrictedZone: {
    height: Number,
  },
  bottomTrack: {
    trackNumber: Number,
    height: Number,
  },
  bottomRestrictedZone: {
    height: Number,
  },
}, { _id: true });

// Track subdocument
const TrackSchema = new Schema({
  id: { type: String }, // Add explicit id field
  trackNumber: { type: Number, required: true },
  trackCount: {
    type: Number,
    enum: [1, 2],
    required: true,
  },
  y: { type: Number, required: true },
  platforms: [PlatformSchema],
  length: { type: Number, required: true },
}, { _id: true });

// Infrastructure Block subdocument
const InfrastructureBlockSchema = new Schema({
  id: { type: String }, // Add explicit id field
  type: {
    type: String,
    enum: [
      'ENTRANCE', 'EXIT', 'FOOT_OVER_BRIDGE', 'UNDERPASS', 'STAIRCASE',
      'ELEVATOR', 'ESCALATOR', 'TICKET_COUNTER', 'WAITING_HALL', 'WASHROOM',
      'DRINKING_WATER', 'SECURITY_CHECK', 'INFORMATION_DESK', 'PARKING', 'TAXI_STAND'
    ],
    required: true,
  },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  dimensions: {
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  rotation: { type: Number, default: 0 },
  isLocked: { type: Boolean, default: false },
  isConnector: { type: Boolean, default: false },
  connectedPlatforms: [String],
  metadata: Schema.Types.Mixed,
}, { _id: true });

export interface IStationLayout extends Document {
  stationId: mongoose.Types.ObjectId;
  stationName: string;
  stationCode: string;
  tracks: any[];
  platforms: any[]; // New platform-based architecture
  infrastructureBlocks: any[];
  canvasSettings: {
    width: number;
    height: number;
    gridSize: number;
    snapToGrid: boolean;
    scale: number;
  };
  pricing?: {
    unitToMeters?: number;
    pricePer100x100Single?: number;
    pricePer100x100Dual?: number;
    securityDepositRate?: number;
  };
  metadata: {
    version: string;
    createdBy: mongoose.Types.ObjectId;
    isLocked: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const StationLayoutSchema: Schema = new Schema(
  {
    stationId: {
      type: Schema.Types.ObjectId,
      ref: 'Station',
      required: true,
      unique: true,
    },
    stationName: {
      type: String,
      required: true,
    },
    stationCode: {
      type: String,
      required: true,
      uppercase: true,
    },
    tracks: [TrackSchema],
    platforms: [NewPlatformSchema], // New platform-based architecture
    infrastructureBlocks: [InfrastructureBlockSchema],
    canvasSettings: {
      width: { type: Number, default: 2000 },
      height: { type: Number, default: 1200 },
      gridSize: { type: Number, default: 20 },
      snapToGrid: { type: Boolean, default: true },
      scale: { type: Number, default: 1 },
    },
    // Pricing and settings that the Station Manager can set when saving the layout
    pricing: {
      // Default unitToMeters chosen so that 200 units == 10 m² -> sqrt(10)/200
      unitToMeters: { type: Number, default: Math.sqrt(10) / 200 },
      pricePer100x100Single: { type: Number, default: 0 }, // currency per 100x100 units for single-track platforms
      pricePer100x100Dual: { type: Number, default: 0 }, // currency per 100x100 units for dual-track platforms
      securityDeposit: { type: Number, default: 0 },
    },
    metadata: {
      version: { type: String, default: '1.0.0' },
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      isLocked: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
StationLayoutSchema.index({ stationId: 1 });
StationLayoutSchema.index({ stationCode: 1 });

// Force model reload in development to pick up schema changes
if (mongoose.models.StationLayout) {
  delete mongoose.models.StationLayout;
}

export default mongoose.model<IStationLayout>('StationLayout', StationLayoutSchema);
