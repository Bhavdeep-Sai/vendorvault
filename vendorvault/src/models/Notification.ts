import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType = 
  | 'APPLICATION_SUBMITTED'
  | 'APPLICATION_APPROVED'
  | 'APPLICATION_REJECTED'
  | 'DOCUMENT_VERIFIED'
  | 'DOCUMENT_REJECTED'
  | 'DOCUMENT_REUPLOAD_REQUIRED'
  | 'LICENSE_ISSUED'
  | 'LICENSE_RENEWED'
  | 'LICENSE_EXPIRED'
  | 'NEGOTIATION_MESSAGE'
  | 'STATION_MANAGER_APPLICATION'
  | 'SYSTEM_ANNOUNCEMENT';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  actionUrl?: string;
  metadata?: {
    applicationId?: string;
    licenseId?: string;
    documentId?: string;
    documentType?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'APPLICATION_SUBMITTED',
        'APPLICATION_APPROVED',
        'APPLICATION_REJECTED',
        'DOCUMENT_VERIFIED',
        'DOCUMENT_REJECTED',
        'DOCUMENT_REUPLOAD_REQUIRED',
        'LICENSE_ISSUED',
        'LICENSE_RENEWED',
        'LICENSE_EXPIRED',
        'NEGOTIATION_MESSAGE',
        'STATION_MANAGER_APPLICATION',
        'SYSTEM_ANNOUNCEMENT',
      ],
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    actionUrl: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

const Notification: Model<INotification> = 
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
