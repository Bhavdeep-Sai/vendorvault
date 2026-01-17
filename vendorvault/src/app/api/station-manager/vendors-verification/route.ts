import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAuthUser } from '@/middleware/auth';
import Station from '@/models/Station';
import User from '@/models/User';
import ShopApplication from '@/models/ShopApplication';
import VendorBank from '@/models/VendorBank';
import VendorBusiness from '@/models/VendorBusiness';
import VendorFoodLicense from '@/models/VendorFoodLicense';
import VendorPolice from '@/models/VendorPolice';
import VendorFinancial from '@/models/VendorFinancial';
import VendorRailwayDeclaration from '@/models/VendorRailwayDeclaration';

/**
 * GET /api/station-manager/vendors-verification
 * Get list of all vendors with applications to this station
 * showing their verification status
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get station
    const station = await Station.findOne({ stationManagerId: authUser.userId });
    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const verificationFilter = searchParams.get('filter'); // 'pending', 'verified', 'all'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get all applications for this station
    const applications = await ShopApplication.find({
      stationId: station._id,
    })
      .select('vendorId status')
      .distinct('vendorId');

    if (!applications.length) {
      return NextResponse.json({
        success: true,
        vendors: [],
        total: 0,
        pagination: { page, limit, total: 0, pages: 0 },
      });
    }

    // Get vendor details with verification status
    const vendorPromises = applications.map(async (vendorId) => {
      const [
        user,
        bankDetails,
        businessDetails,
        foodLicense,
        policeVerification,
        financialDetails,
        railwayDeclaration,
        applicationCount,
      ] = await Promise.all([
        User.findById(vendorId).select('name email phone fullName aadhaarVerified panVerified').lean(),
        VendorBank.findOne({ vendorId }).select('bankVerified verifiedAt').lean(),
        VendorBusiness.findOne({ vendorId }).select('businessName businessCategory businessVerified verifiedAt').lean(),
        VendorFoodLicense.findOne({ vendorId }).select('fssaiVerified verifiedAt').lean(),
        VendorPolice.findOne({ vendorId }).select('policeVerified backgroundCheckStatus verifiedAt').lean(),
        VendorFinancial.findOne({ vendorId }).select('financialVerified verifiedAt').lean(),
        VendorRailwayDeclaration.findOne({ vendorId }).select('isValid verifiedAt').lean(),
        ShopApplication.countDocuments({ vendorId, stationId: station._id }),
      ]);

      if (!user) return null;

      // Calculate verification counts
      let verifiedCount = 0;
      let totalRequired = 7;

      const verificationStatus = {
        aadhaar: user.aadhaarVerified || false,
        pan: user.panVerified || false,
        bank: bankDetails?.bankVerified || false,
        business: businessDetails?.businessVerified || false,
        foodLicense: foodLicense?.fssaiVerified || false,
        foodLicenseRequired: businessDetails?.businessCategory === 'FOOD',
        police: policeVerification?.policeVerified || false,
        financial: financialDetails?.financialVerified || false,
        railwayDeclaration: railwayDeclaration?.isValid || false,
      };

      if (verificationStatus.aadhaar) verifiedCount++;
      if (verificationStatus.pan) verifiedCount++;
      if (verificationStatus.bank) verifiedCount++;
      if (verificationStatus.business) verifiedCount++;
      if (!verificationStatus.foodLicenseRequired || verificationStatus.foodLicense) verifiedCount++;
      if (verificationStatus.police) verifiedCount++;
      if (verificationStatus.financial) verifiedCount++;
      if (verificationStatus.railwayDeclaration) verifiedCount++;

      const allVerified = verifiedCount === totalRequired;
      const hasPending = verifiedCount < totalRequired;

      return {
        vendorId: vendorId.toString(),
        name: user.fullName || user.name,
        email: user.email,
        phone: user.phone,
        businessName: businessDetails?.businessName || 'N/A',
        businessCategory: businessDetails?.businessCategory || 'N/A',
        applicationCount,
        verificationStatus,
        verificationSummary: {
          verifiedCount,
          totalRequired,
          percentage: Math.round((verifiedCount / totalRequired) * 100),
          allVerified,
          hasPending,
        },
        lastVerifiedAt: [
          bankDetails?.verifiedAt,
          businessDetails?.verifiedAt,
          foodLicense?.verifiedAt,
          policeVerification?.verifiedAt,
          financialDetails?.verifiedAt,
          railwayDeclaration?.verifiedAt,
        ]
          .filter(Boolean)
          .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] || null,
      };
    });

    let vendors = (await Promise.all(vendorPromises)).filter(Boolean);

    // Apply filter
    if (verificationFilter === 'pending') {
      vendors = vendors.filter((v) => v && v.verificationSummary.hasPending);
    } else if (verificationFilter === 'verified') {
      vendors = vendors.filter((v) => v && v.verificationSummary.allVerified);
    }

    // Sort by pending first, then by last verified date
    vendors.sort((a, b) => {
      if (!a || !b) return 0;
      if (a.verificationSummary.hasPending && !b.verificationSummary.hasPending) return -1;
      if (!a.verificationSummary.hasPending && b.verificationSummary.hasPending) return 1;
      
      const aDate = a.lastVerifiedAt ? new Date(a.lastVerifiedAt).getTime() : 0;
      const bDate = b.lastVerifiedAt ? new Date(b.lastVerifiedAt).getTime() : 0;
      return bDate - aDate;
    });

    // Pagination
    const total = vendors.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedVendors = vendors.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      vendors: paginatedVendors,
      total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        totalVendors: vendors.length,
        fullyVerified: vendors.filter((v) => v && v.verificationSummary.allVerified).length,
        pendingVerification: vendors.filter((v) => v && v.verificationSummary.hasPending).length,
      },
    });
  } catch (error) {
    console.error('Error fetching vendors for verification:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}
