import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAuthUser } from '@/middleware/auth';
import Station from '@/models/Station';
import User from '@/models/User';
import Vendor from '@/models/Vendor';
import VendorBank from '@/models/VendorBank';
import VendorBusiness from '@/models/VendorBusiness';
import VendorFoodLicense from '@/models/VendorFoodLicense';
import VendorPolice from '@/models/VendorPolice';
import VendorFinancial from '@/models/VendorFinancial';
import VendorRailwayDeclaration from '@/models/VendorRailwayDeclaration';
import ShopApplication from '@/models/ShopApplication';

/**
 * GET /api/station-manager/vendor-profile/[vendorId]
 * Get complete vendor profile with all verifications for station manager review
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { vendorId } = await params;

    // Verify station manager has access to this vendor
    const station = await Station.findOne({ stationManagerId: authUser.userId });
    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 });
    }

    // Check if vendor has any application for this station
    const hasApplication = await ShopApplication.findOne({
      vendorId,
      stationId: station._id,
    });

    if (!hasApplication) {
      return NextResponse.json(
        { error: 'No application from this vendor to your station' },
        { status: 403 }
      );
    }

    // Fetch all vendor data
    const [
      user,
      vendor,
      bankDetails,
      businessDetails,
      foodLicense,
      policeVerification,
      financialDetails,
      railwayDeclaration,
    ] = await Promise.all([
      User.findById(vendorId).select('-password').lean(),
      Vendor.findOne({ userId: vendorId }).lean(),
      VendorBank.findOne({ vendorId }).lean(),
      VendorBusiness.findOne({ vendorId }).lean(),
      VendorFoodLicense.findOne({ vendorId }).lean(),
      VendorPolice.findOne({ vendorId }).lean(),
      VendorFinancial.findOne({ vendorId }).lean(),
      VendorRailwayDeclaration.findOne({ vendorId }).lean(),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Calculate verification status
    const verificationStatus = {
      personalInfo: {
        completed: !!(user.fullName && user.aadhaarNumber && user.panNumber && user.phone && user.email),
        aadhaarVerified: user.aadhaarVerified || false,
        panVerified: user.panVerified || false,
      },
      bankDetails: {
        completed: !!bankDetails,
        verified: bankDetails?.bankVerified || false,
      },
      businessDetails: {
        completed: !!businessDetails,
        verified: businessDetails?.businessVerified || false,
      },
      foodLicense: {
        required: businessDetails?.businessCategory === 'FOOD',
        completed: !!foodLicense,
        verified: foodLicense?.fssaiVerified || false,
      },
      policeVerification: {
        completed: !!policeVerification,
        verified: policeVerification?.policeVerified || false,
      },
      financialDetails: {
        completed: !!financialDetails,
        verified: financialDetails?.financialVerified || false,
      },
      railwayDeclaration: {
        completed: !!railwayDeclaration,
        verified: railwayDeclaration?.isValid || false,
      },
    };

    // Calculate overall completion
    const totalChecks = 7;
    let completedChecks = 0;
    
    if (verificationStatus.personalInfo.completed) completedChecks++;
    if (verificationStatus.bankDetails.completed) completedChecks++;
    if (verificationStatus.businessDetails.completed) completedChecks++;
    if (!verificationStatus.foodLicense.required || verificationStatus.foodLicense.completed) completedChecks++;
    if (verificationStatus.policeVerification.completed) completedChecks++;
    if (verificationStatus.financialDetails.completed) completedChecks++;
    if (verificationStatus.railwayDeclaration.completed) completedChecks++;

    const allVerified = 
      verificationStatus.personalInfo.aadhaarVerified &&
      verificationStatus.personalInfo.panVerified &&
      verificationStatus.bankDetails.verified &&
      verificationStatus.businessDetails.verified &&
      (!verificationStatus.foodLicense.required || verificationStatus.foodLicense.verified) &&
      verificationStatus.policeVerification.verified &&
      verificationStatus.financialDetails.verified &&
      verificationStatus.railwayDeclaration.verified;

    return NextResponse.json({
      success: true,
      vendor: {
        user,
        vendor,
        bankDetails,
        businessDetails,
        foodLicense,
        policeVerification,
        financialDetails,
        railwayDeclaration,
      },
      verificationStatus,
      summary: {
        completionPercentage: Math.round((completedChecks / totalChecks) * 100),
        allVerified,
        totalChecks,
        completedChecks,
      },
    });
  } catch (error) {
    console.error('Error fetching vendor profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor profile' },
      { status: 500 }
    );
  }
}
