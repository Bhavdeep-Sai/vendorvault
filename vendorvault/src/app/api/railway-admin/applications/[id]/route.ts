import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import License from '@/models/License';
import Vendor from '@/models/Vendor';
import Document from '@/models/Document';
import { getAuthUser } from '@/middleware/auth';
import { generateQRCode } from '@/lib/qrcode';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthUser(request);
    
    if (!auth || auth.role !== 'RAILWAY_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const license = await License.findById(id)
      .populate({
        path: 'vendorId',
        populate: {
          path: 'userId',
          select: 'name email phone',
        },
      })
      .populate('createdByAdminId', 'name email');

    if (!license) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    const documents = await Document.find({ vendorId: license.vendorId });

    return NextResponse.json({
      application: license,
      documents,
    });
  } catch (error: any) {
    console.error('Get application error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get application' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthUser(request);
    
    if (!auth || auth.role !== 'RAILWAY_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { action, expiresAt, rejectionReason } = body;

    const license = await License.findById(id);
    if (!license) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    if (action === 'approve') {
      // Check if required documents exist before approving
      const documents = await Document.find({ vendorId: license.vendorId });
      const hasIdProof = documents.some(doc => doc.type === 'ID_PROOF');
      const hasPhoto = documents.some(doc => doc.type === 'PHOTO');

      if (!hasIdProof || !hasPhoto) {
        return NextResponse.json(
          { 
            error: 'Cannot approve application. Required documents are missing. Please reject the application with reason: "Required documents (ID Proof and/or Stall Photo) are missing."' 
          },
          { status: 400 }
        );
      }

      // Generate QR code ONLY after all validations pass
      const { qrCodeData, qrCodeUrl } = await generateQRCode(license.licenseNumber);

      // Calculate expiry date (default 1 year from now)
      const expiryDate = expiresAt ? new Date(expiresAt) : new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      license.status = 'APPROVED';
      license.issuedAt = new Date();
      license.expiresAt = expiryDate;
      license.qrCodeData = qrCodeData;
      license.qrCodeUrl = qrCodeUrl;
      license.createdByAdminId = auth.userId;
      license.rejectionReason = undefined;

      await license.save();

      return NextResponse.json({
        message: 'Application approved successfully',
        license,
      });
    } else if (action === 'reject') {
      if (!rejectionReason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        );
      }

      license.status = 'REJECTED';
      license.rejectionReason = rejectionReason;
      license.createdByAdminId = auth.userId;

      await license.save();

      return NextResponse.json({
        message: 'Application rejected',
        license,
      });
    } else if (action === 'revoke') {
      license.status = 'REVOKED';
      license.createdByAdminId = auth.userId;

      await license.save();

      return NextResponse.json({
        message: 'License revoked',
        license,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Update application error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update application' },
      { status: 500 }
    );
  }
}

