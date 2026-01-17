import mongoose, { Schema, Document } from 'mongoose';

export interface IShop {
  shopNumber: string;
  vendorId?: mongoose.Types.ObjectId;
  vendorName?: string;
  businessName?: string;
  stallType?: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  position: {
    x: number; // Position on platform layout
    y: number;
  };
  size: {
    width: number; // Width in grid units
    height: number; // Height in grid units
  };
  monthlyRent?: number;
  occupiedSince?: Date;
  leaseEndDate?: Date;
}

export interface IPlatform extends Document {
  stationId: mongoose.Types.ObjectId;
  platformNumber: number;
  platformName: string;
  totalShops: number;
  occupiedShops: number;
  availableShops: number;
  shops: IShop[];
  dimensions: {
    length: number; // In meters
    width: number;  // In meters
  };
  facilities: string[]; // ['waiting-room', 'restroom', 'ticket-counter']
  createdAt: Date;
  updatedAt: Date;
  updateShopCounts(): void;
}

const ShopSchema = new Schema({
  shopNumber: {
    type: String,
    required: true,
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  vendorName: {
    type: String,
  },
  businessName: {
    type: String,
  },
  stallType: {
    type: String,
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'],
    default: 'AVAILABLE',
  },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  size: {
    width: { type: Number, default: 1 },
    height: { type: Number, default: 1 },
  },
  monthlyRent: {
    type: Number,
  },
  occupiedSince: {
    type: Date,
  },
  leaseEndDate: {
    type: Date,
  },
});

const PlatformSchema: Schema = new Schema(
  {
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station',
      required: true,
    },
    platformNumber: {
      type: Number,
      required: true,
    },
    platformName: {
      type: String,
      required: true,
    },
    totalShops: {
      type: Number,
      required: true,
      default: 0,
    },
    occupiedShops: {
      type: Number,
      default: 0,
    },
    availableShops: {
      type: Number,
      default: 0,
    },
    shops: [ShopSchema],
    dimensions: {
      length: { type: Number, required: true }, // Platform length in meters
      width: { type: Number, required: true },  // Platform width in meters
    },
    facilities: [{
      type: String,
    }],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
PlatformSchema.index({ stationId: 1, platformNumber: 1 }, { unique: true });

// Method to calculate available shops
PlatformSchema.methods.updateShopCounts = function() {
  this.occupiedShops = this.shops.filter((shop: IShop) => shop.status === 'OCCUPIED').length;
  this.availableShops = this.shops.filter((shop: IShop) => shop.status === 'AVAILABLE').length;
  this.totalShops = this.shops.length;
};

const Platform = (mongoose.models.Platform as mongoose.Model<IPlatform>) || mongoose.model<IPlatform>('Platform', PlatformSchema);

export default Platform;
