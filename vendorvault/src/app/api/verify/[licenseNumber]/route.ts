import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import License from '@/models/License';
import Document from '@/models/Document';
import ShopApplication from '@/models/ShopApplication';
import Station from '@/models/Station';
import Platform from '@/models/Platform';
import { isLicenseExpired } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { licenseNumber: string } }
) {
  try {
    await connectDB();

    const license = await License.findOne({
      licenseNumber: params.licenseNumber,
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

    const vendor = license.vendorId as {
      _id: unknown;
      businessName: string;
      businessType: string;
      stationName: string;
      platformNumber?: string;
      userId?: { name: string };
    };

    // Fetch documents for this vendor
    const documents = vendor ? await Document.find({ vendorId: vendor._id }) : [];

    // Fetch shop application to get shop and station names
    let shopName = license.shopName || 'N/A';
    let stationName = vendor?.stationName || 'N/A';
    let platformName = 'N/A';

    try {
      const application = await ShopApplication.findOne({ 
        vendorId: license.vendorId,
        licenseNumber: license.licenseNumber 
      });

      if (application) {
        shopName = application.shopName || shopName;
        
        // Fetch station details
        if (application.stationId) {
          const station = await Station.findById(application.stationId).exec();
          if (station) {
            stationName = station.stationName;
          }
        }

        // Fetch platform details
        if (application.platformId) {
          const platform = await Platform.findById(application.platformId).exec();
          if (platform) {
            platformName = platform.platformName;
          }
        } else if (application.stationId && application.shopId) {
          // Try to find platform by shop
          const platform = await Platform.findOne({
            stationId: application.stationId,
            $or: [
              { 'shops._id': application.shopId },
              { 'shops.shopNumber': application.shopId }
            ]
          }).exec();
          if (platform) {
            platformName = platform.platformName;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching shop/station details:', err);
    }

    return NextResponse.json({
      license: {
        licenseNumber: license.licenseNumber,
        status,
        issuedAt: license.issuedAt,
        expiresAt: license.expiresAt,
        qrCodeUrl: license.qrCodeUrl,
        qrCodeData: license.qrCodeData,
        shopName,
        stationName,
        platformName,
      },
      vendor: vendor ? {
        businessName: vendor.businessName,
        businessType: vendor.businessType,
        stationName,
        platformNumber: vendor.platformNumber,
        ownerName: vendor.userId?.name,
      } : null,
      documents: documents,
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    );
  }
}

