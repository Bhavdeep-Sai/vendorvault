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
      select: 'name email phone',
    });

    if (!license) {
      return NextResponse.json(
        { error: 'License not found' },
        { status: 404 }
      );
    }

    // Check if license is expired
    let status = license.status;
    if ((status === 'APPROVED' || status === 'ACTIVE') && isLicenseExpired(license.expiresAt)) {
      status = 'EXPIRED';
      // Update in database
      license.status = 'EXPIRED';
      await license.save();
    }

    const vendorUser = license.vendorId as any as {
      _id: unknown;
      name: string;
      email: string;
      phone?: string;
    };

    // Get Vendor profile for business details
    const Vendor = (await import('@/models/Vendor')).default;
    const vendorProfile = await Vendor.findOne({ userId: vendorUser._id }).lean();
    const VendorBusiness = (await import('@/models/VendorBusiness')).default;
    const businessProfile = vendorProfile ? await VendorBusiness.findOne({ vendorId: vendorUser._id }).lean() : null;

    // Fetch documents for this vendor (using Vendor._id if exists)
    const documents = vendorProfile ? await Document.find({ vendorId: vendorProfile._id }) : [];

    // Fetch shop application to get shop and station names
    let shopName = license.shopName || 'N/A';
    let stationName = 'N/A';
    let platformName = 'N/A';
    let shopId = license.shopId || 'N/A';

    try {
      // Find application by _id (license.applicationId is the ShopApplication._id)
      const application = await ShopApplication.findById(license.applicationId);

      if (!application) {
        // Try finding by licenseNumber as fallback
        const appByLicense = await ShopApplication.findOne({ 
          licenseNumber: license.licenseNumber 
        });
        if (appByLicense) {
          shopName = appByLicense.shopName || shopName;
          shopId = appByLicense.shopId || shopId;
        }
      } else {
        shopName = application.shopName || `Shop ${application.shopId}` || shopName;
        shopId = application.shopId || shopId;
        
        // Use station name from application or fetch from Station model
        stationName = application.stationName || stationName;
        if (application.stationId && stationName === 'N/A') {
          const station = await Station.findById(application.stationId);
          if (station) {
            stationName = station.name || station.stationName || station.stationCode;
          }
        }

        // Use platform number from application
        platformName = application.platformNumber ? `Platform ${application.platformNumber}` : platformName;
        
        // Fetch platform details if available
        if (application.platformId && platformName === 'N/A') {
          const platform = await Platform.findById(application.platformId);
          if (platform) {
            platformName = platform.name || platform.platformName || platformName;
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
        shopId,
        stationName,
        platformName,
      },
      vendor: vendorUser ? {
        businessName: vendorProfile?.businessName || businessProfile?.businessName || 'N/A',
        stallType: vendorProfile?.businessType || businessProfile?.businessCategory || 'N/A',
        stationName,
        platformNumber: platformName,
        ownerName: vendorUser.name,
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

