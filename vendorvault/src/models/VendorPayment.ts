import mongoose, { Schema, Document, Model } from 'mongoose';

export type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'WAIVED';
export type PaymentType = 'RENT' | 'SECURITY_DEPOSIT' | 'PENALTY' | 'RENEWAL_FEE' | 'OTHER';

export interface IPaymentRecord {
  amount: number;
  paidAmount: number;
  paymentDate?: Date;
  receiptNumber?: string;
  paymentMode?: 'CASH' | 'CHEQUE' | 'DD' | 'ONLINE' | 'NEFT' | 'RTGS' | 'UPI';
  transactionReference?: string;
  receivedBy?: mongoose.Types.ObjectId; // Station manager who verified
  notes?: string;
}

export interface IVendorPayment extends Document {
  vendorId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  stationId: mongoose.Types.ObjectId;
  shopId: string;
  
  // Payment details
  paymentType: PaymentType;
  dueDate: Date;
  amount: number;
  paidAmount: number;
  balanceAmount: number;
  status: PaymentStatus;
  
  // For monthly rent
  billingMonth?: string; // Format: 'YYYY-MM'
  billingYear?: number;
  
  // Payment records
  payments: IPaymentRecord[];
  
  // Late fee
  lateFee?: number;
  lateFeeApplied?: boolean;
  
  // Reminders
  remindersSent: number;
  lastReminderDate?: Date;
  
  // Audit
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const PaymentRecordSchema = new Schema({
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  paidAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  receiptNumber: {
    type: String,
    trim: true,
  },
  paymentMode: {
    type: String,
    enum: ['CASH', 'CHEQUE', 'DD', 'ONLINE', 'NEFT', 'RTGS', 'UPI'],
  },
  transactionReference: {
    type: String,
    trim: true,
  },
  receivedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: {
    type: String,
    trim: true,
  },
});

const VendorPaymentSchema: Schema = new Schema(
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
    paymentType: {
      type: String,
      enum: ['RENT', 'SECURITY_DEPOSIT', 'PENALTY', 'RENEWAL_FEE', 'OTHER'],
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'OVERDUE', 'PARTIAL', 'WAIVED'],
      default: 'PENDING',
      required: true,
    },
    billingMonth: {
      type: String,
      trim: true,
    },
    billingYear: {
      type: Number,
    },
    payments: [PaymentRecordSchema],
    lateFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    lateFeeApplied: {
      type: Boolean,
      default: false,
    },
    remindersSent: {
      type: Number,
      default: 0,
    },
    lastReminderDate: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
VendorPaymentSchema.index({ vendorId: 1, status: 1 });
VendorPaymentSchema.index({ stationId: 1, status: 1 });
VendorPaymentSchema.index({ dueDate: 1, status: 1 });
VendorPaymentSchema.index({ billingMonth: 1, billingYear: 1 });
VendorPaymentSchema.index({ applicationId: 1 });

// Calculate balance before saving
VendorPaymentSchema.pre<IVendorPayment>('save', function(next) {
  this.balanceAmount = this.amount - this.paidAmount;
  
  // Auto-update status based on payment
  if (this.paidAmount === 0) {
    const now = new Date();
    if (this.dueDate < now) {
      this.status = 'OVERDUE';
    } else {
      this.status = 'PENDING';
    }
  } else if (this.paidAmount >= this.amount) {
    this.status = 'PAID';
  } else {
    this.status = 'PARTIAL';
  }
  
  next();
});

const VendorPayment: Model<IVendorPayment> = mongoose.models.VendorPayment || mongoose.model<IVendorPayment>('VendorPayment', VendorPaymentSchema);

export default VendorPayment;
