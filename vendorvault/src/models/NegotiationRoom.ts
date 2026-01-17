import mongoose, { Schema, Document, Model } from 'mongoose';

export type MessageSender = 'VENDOR' | 'STATION_MANAGER';
export type NegotiationStatus = 'ACTIVE' | 'AGREED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export interface INegotiationMessage {
  messageId: string;
  senderId: mongoose.Types.ObjectId;
  senderRole: MessageSender;
  senderName: string;
  messageType: 'TEXT' | 'COUNTER_OFFER' | 'SYSTEM' | 'ATTACHMENT';
  content: string;
  
  // For counter offers
  proposedRent?: number;
  proposedSecurityDeposit?: number;
  proposedDuration?: number; // in months
  conditions?: string;
  
  // For attachments
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  
  // Message metadata
  isRead: boolean;
  readAt?: Date;
  editedAt?: Date;
  isEdited: boolean;
  replyToMessageId?: string;
  
  timestamp: Date;
}

export interface INegotiationRoom extends Document {
  applicationId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  stationManagerId: mongoose.Types.ObjectId;
  shopId: string;
  
  // Current negotiation state
  status: NegotiationStatus;
  currentOffer: {
    rent: number;
    securityDeposit: number;
    duration?: number;
    proposedBy: MessageSender;
    proposedAt: Date;
    conditions?: string;
  };
  
  // Negotiation history
  messages: INegotiationMessage[];
  
  // Counter tracking
  counterOfferCount: number;
  maxCounterOffers?: number; // System limit
  
  // Timeline
  negotiationStartedAt: Date;
  lastActivityAt: Date;
  lastUpdatedBy: MessageSender;
  deadlineAt?: Date; // Negotiation deadline
  
  // Final agreement
  finalAgreement?: {
    agreedRent: number;
    agreedSecurityDeposit: number;
    agreedDuration?: number;
    specialTerms?: string;
    agreedAt: Date;
    agreedByVendor: boolean;
    agreedByManager: boolean;
  };
  
  // Metadata
  autoResponses?: boolean; // Whether system auto-responses are enabled
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  tags?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

const NegotiationMessageSchema: Schema = new Schema({
  messageId: {
    type: String,
    required: true,
    unique: true,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderRole: {
    type: String,
    enum: ['VENDOR', 'STATION_MANAGER'],
    required: true,
  },
  senderName: {
    type: String,
    required: true,
    trim: true,
  },
  messageType: {
    type: String,
    enum: ['TEXT', 'COUNTER_OFFER', 'SYSTEM', 'ATTACHMENT'],
    default: 'TEXT',
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  
  // Counter offer details
  proposedRent: { type: Number, min: 0 },
  proposedSecurityDeposit: { type: Number, min: 0 },
  proposedDuration: { type: Number, min: 1 },
  conditions: { type: String, trim: true },
  
  // Attachment details
  attachmentUrl: { type: String, trim: true },
  attachmentName: { type: String, trim: true },
  attachmentType: { type: String, trim: true },
  
  // Message metadata
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  editedAt: { type: Date },
  isEdited: { type: Boolean, default: false },
  replyToMessageId: { type: String },
  
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const NegotiationRoomSchema: Schema = new Schema(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'ShopApplication',
      required: true,
      unique: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    stationManagerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shopId: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Current state
    status: {
      type: String,
      enum: ['ACTIVE', 'AGREED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
      default: 'ACTIVE',
    },
    currentOffer: {
      rent: { type: Number, required: true, min: 0 },
      securityDeposit: { type: Number, required: true, min: 0 },
      duration: { type: Number, min: 1 },
      proposedBy: { 
        type: String, 
        enum: ['VENDOR', 'STATION_MANAGER'], 
        required: true 
      },
      proposedAt: { type: Date, required: true },
      conditions: { type: String, trim: true },
    },
    
    // Messages
    messages: [NegotiationMessageSchema],
    
    // Counters
    counterOfferCount: { type: Number, default: 0 },
    maxCounterOffers: { type: Number, default: 10 },
    
    // Timeline
    negotiationStartedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastActivityAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastUpdatedBy: {
      type: String,
      enum: ['VENDOR', 'STATION_MANAGER'],
      required: true,
    },
    deadlineAt: { type: Date },
    
    // Final agreement
    finalAgreement: {
      agreedRent: { type: Number, min: 0 },
      agreedSecurityDeposit: { type: Number, min: 0 },
      agreedDuration: { type: Number, min: 1 },
      specialTerms: { type: String, trim: true },
      agreedAt: { type: Date },
      agreedByVendor: { type: Boolean, default: false },
      agreedByManager: { type: Boolean, default: false },
    },
    
    // Metadata
    autoResponses: { type: Boolean, default: false },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM',
    },
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
NegotiationRoomSchema.index({ applicationId: 1 });
NegotiationRoomSchema.index({ vendorId: 1, status: 1 });
NegotiationRoomSchema.index({ stationManagerId: 1, status: 1 });
NegotiationRoomSchema.index({ status: 1, lastActivityAt: -1 });
NegotiationRoomSchema.index({ deadlineAt: 1, status: 1 });
NegotiationRoomSchema.index({ shopId: 1 });
NegotiationRoomSchema.index({ priority: 1, status: 1 });

// Compound indexes
NegotiationRoomSchema.index({ vendorId: 1, stationManagerId: 1, status: 1 });
NegotiationRoomSchema.index({ lastUpdatedBy: 1, lastActivityAt: -1 });

const NegotiationRoom: Model<INegotiationRoom> = mongoose.models.NegotiationRoom || mongoose.model<INegotiationRoom>('NegotiationRoom', NegotiationRoomSchema);

export default NegotiationRoom;