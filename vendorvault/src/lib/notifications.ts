import Notification, { NotificationType } from '@/models/Notification';
import mongoose from 'mongoose';

interface CreateNotificationParams {
  userId: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await Notification.create({
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      actionUrl: params.actionUrl,
      metadata: params.metadata || {},
    });
    
    return notification;
  } catch (error) {
    throw error;
  }
}

export async function createDocumentVerificationNotification(
  userId: string | mongoose.Types.ObjectId,
  documentType: string,
  verified: boolean,
  notes?: string
) {
  return createNotification({
    userId,
    title: verified ? 'Document Verified' : 'Document Rejected',
    message: verified 
      ? `Your ${documentType} has been verified and approved.`
      : `Your ${documentType} was rejected. ${notes || 'Please upload a valid document.'}`,
    type: verified ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED',
    actionUrl: '/vendor/documents',
    metadata: { documentType, notes },
  });
}

export async function createApplicationStatusNotification(
  userId: string | mongoose.Types.ObjectId,
  status: 'APPROVED' | 'REJECTED',
  licenseId: string,
  reason?: string
) {
  return createNotification({
    userId,
    title: status === 'APPROVED' ? 'Application Approved!' : 'Application Rejected',
    message: status === 'APPROVED'
      ? 'Congratulations! Your shop application has been approved. Your license is now active.'
      : `Your application was rejected. ${reason || 'Please contact station manager for details.'}`,
    type: status === 'APPROVED' ? 'APPLICATION_APPROVED' : 'APPLICATION_REJECTED',
    actionUrl: status === 'APPROVED' ? '/vendor/dashboard' : '/vendor/applications',
    metadata: { licenseId, reason },
  });
}

export async function createNewApplicationNotification(
  stationManagerId: string | mongoose.Types.ObjectId,
  vendorName: string,
  applicationId: string
) {
  return createNotification({
    userId: stationManagerId,
    title: 'New Vendor Application',
    message: `${vendorName} has submitted a new shop application for review.`,
    type: 'APPLICATION_SUBMITTED',
    actionUrl: `/station-manager/applications/${applicationId}`,
    metadata: { applicationId, vendorName },
  });
}
