import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import License from '@/models/License';
import Vendor from '@/models/Vendor';
import User from '@/models/User';
import Document from '@/models/Document';
import { isLicenseExpired } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ licenseNumber: string }> }
) {
  try {
    await connectDB();

    const { licenseNumber } = await params;

    const license = await License.findOne({
      licenseNumber,
    }).populate({
      path: 'vendorId',
      populate: {
        path: 'userId',
        select: 'name email phone',
      },
    });

    if (!license) {
      return NextResponse.json(
        { error: 'License not found' },
        { status: 404 }
      );
    }

    // Check if license is expired
    let status = license.status;
    if (status === 'APPROVED' && isLicenseExpired(license.expiresAt)) {
      status = 'EXPIRED';
      // Update in database
      license.status = 'EXPIRED';
      await license.save();
    }

    const vendor = license.vendorId as any;

    // Fetch documents for this vendor
    const documents = vendor ? await Document.find({ vendorId: vendor._id }) : [];

    return NextResponse.json({
      license: {
        licenseNumber: license.licenseNumber,
        status,
        issuedAt: license.issuedAt,
        expiresAt: license.expiresAt,
        qrCodeUrl: license.qrCodeUrl,
        qrCodeData: license.qrCodeData,
      },
      vendor: vendor ? {
        businessName: vendor.businessName,
        businessType: vendor.businessType,
        stationName: vendor.stationName,
        platformNumber: vendor.platformNumber,
        ownerName: vendor.userId?.name,
      } : null,
      documents: documents,
    });
  } catch (error: any) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}

