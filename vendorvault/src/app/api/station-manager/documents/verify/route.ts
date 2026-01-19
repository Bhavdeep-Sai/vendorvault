import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';
import Vendor from '@/models/Vendor';
import License from '@/models/License';
import ShopApplication from '@/models/ShopApplication';
import { getAuthUser } from '@/middleware/auth';
import { createDocumentVerificationNotification } from '@/lib/notifications';

// POST /api/station-manager/documents/verify - Verify or reject a document
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, verified, verificationNotes } = await request.json();

    if (!documentId || verified === undefined) {
      return NextResponse.json(
        { error: 'Document ID and verification status required' },
        { status: 400 }
      );
    }

    // Find and update the document
    const document = await Document.findById(documentId);
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    document.verified = verified;
    if (verificationNotes) {
      document.verificationNotes = verificationNotes;
    }
    await document.save();

    // Get vendor to find userId for notification
    const vendor = await Vendor.findById(document.vendorId);
    
    if (vendor) {
      // Create notification for vendor
      await createDocumentVerificationNotification(
        vendor.userId,
        document.type,
        verified,
        verificationNotes
      );

      // If document rejected, check if this vendor has any pending applications
      // and automatically reject them
      if (!verified) {
        const pendingApplications = await ShopApplication.find({
          vendorId: vendor.userId,
          status: { $in: ['SUBMITTED', 'NEGOTIATION'] }
        });

        for (const app of pendingApplications) {
          // Find associated license
          const license = await License.findOne({ applicationId: app._id });
          
          if (license && license.status === 'PENDING') {
            // Update license status to rejected
            license.status = 'REJECTED';
            license.rejectionReason = `Document ${document.type} was rejected: ${verificationNotes || 'Invalid document'}`;
            await license.save();

            // Update application status
            app.status = 'REJECTED';
            app.rejectedBy = authUser.userId;
            app.rejectedAt = new Date();
            app.rejectionReason = `Document verification failed: ${document.type}`;
            await app.save();

            // Notify vendor about automatic rejection
            const { createApplicationStatusNotification } = await import('@/lib/notifications');
            await createApplicationStatusNotification(
              vendor.userId,
              'REJECTED',
              license._id.toString(),
              `Your application was automatically rejected because document ${document.type} verification failed. Please upload valid documents and reapply.`
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: verified ? 'Document verified successfully' : 'Document rejected',
      document,
    });
  } catch (error) {
    console.error('Document verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify document' },
      { status: 500 }
    );
  }
}
