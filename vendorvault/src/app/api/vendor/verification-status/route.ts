import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAuthUser } from '@/middleware/auth';
import User from '@/models/User';
import VendorBank from '@/models/VendorBank';
import VendorBusiness from '@/models/VendorBusiness';
import VendorFoodLicense from '@/models/VendorFoodLicense';
import VendorPolice from '@/models/VendorPolice';
import VendorFinancial from '@/models/VendorFinancial';
import VendorRailwayDeclaration from '@/models/VendorRailwayDeclaration';

/**
 * GET /api/vendor/verification-status
 * Get vendor's complete verification status
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const vendorId = authUser.userId;

    // Fetch all verification data
    const [user, bank, business, foodLicense, police, financial, railway] = await Promise.all([
      User.findById(vendorId).select('name aadhaarNumber panNumber aadhaarVerified panVerified verificationStatus').lean(),
      VendorBank.findOne({ vendorId }).lean(),
      VendorBusiness.findOne({ vendorId }).lean(),
      VendorFoodLicense.findOne({ vendorId }).lean(),
      VendorPolice.findOne({ vendorId }).lean(),
      VendorFinancial.findOne({ vendorId }).lean(),
      VendorRailwayDeclaration.findOne({ vendorId }).lean(),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build verification status with details
    const verificationStatus = {
      personalInfo: {
        submitted: !!(user.name && user.aadhaarNumber && user.panNumber),
        aadhaarVerified: user.aadhaarVerified || false,
        panVerified: user.panVerified || false,
        status: (user.aadhaarVerified && user.panVerified) ? 'VERIFIED' : 
                (user.name && user.aadhaarNumber && user.panNumber) ? 'PENDING' : 'INCOMPLETE',
      },
      bankDetails: {
        submitted: !!bank,
        verified: bank?.bankVerified || false,
        status: bank?.bankVerified ? 'VERIFIED' : bank ? 'PENDING' : 'INCOMPLETE',
        rejectionReason: bank?.rejectionReason,
      },
      businessDetails: {
        submitted: !!business,
        verified: business?.businessVerified || false,
        status: business?.businessVerified ? 'VERIFIED' : business ? 'PENDING' : 'INCOMPLETE',
        rejectionReason: business?.rejectionReason,
        businessCategory: business?.businessCategory,
      },
      foodLicense: {
        required: business?.businessCategory === 'FOOD',
        submitted: !!foodLicense,
        verified: foodLicense?.fssaiVerified || false,
        status: business?.businessCategory === 'FOOD' 
          ? (foodLicense?.fssaiVerified ? 'VERIFIED' : foodLicense ? 'PENDING' : 'INCOMPLETE')
          : 'NOT_REQUIRED',
        rejectionReason: foodLicense?.rejectionReason,
      },
      policeVerification: {
        submitted: !!police,
        verified: police?.policeVerified || false,
        status: police?.policeVerified ? 'VERIFIED' : police ? 'PENDING' : 'INCOMPLETE',
        backgroundCheckStatus: police?.backgroundCheckStatus,
        rejectionReason: police?.rejectionReason,
      },
      financialDetails: {
        submitted: !!financial,
        verified: financial?.financialVerified || false,
        status: financial?.financialVerified ? 'VERIFIED' : financial ? 'PENDING' : 'INCOMPLETE',
        rejectionReason: financial?.rejectionReason,
      },
      railwayDeclaration: {
        submitted: !!railway,
        verified: railway?.isValid || false,
        status: railway?.isValid ? 'VERIFIED' : railway ? 'PENDING' : 'INCOMPLETE',
      },
    };

    // Calculate overall statistics
    const totalRequired = verificationStatus.foodLicense.required ? 7 : 6;
    let completedCount = 0;
    let verifiedCount = 0;

    if (verificationStatus.personalInfo.submitted) completedCount++;
    if (verificationStatus.personalInfo.aadhaarVerified && verificationStatus.personalInfo.panVerified) verifiedCount++;

    if (verificationStatus.bankDetails.submitted) completedCount++;
    if (verificationStatus.bankDetails.verified) verifiedCount++;

    if (verificationStatus.businessDetails.submitted) completedCount++;
    if (verificationStatus.businessDetails.verified) verifiedCount++;

    if (verificationStatus.foodLicense.required) {
      if (verificationStatus.foodLicense.submitted) completedCount++;
      if (verificationStatus.foodLicense.verified) verifiedCount++;
    }

    if (verificationStatus.policeVerification.submitted) completedCount++;
    if (verificationStatus.policeVerification.verified) verifiedCount++;

    if (verificationStatus.financialDetails.submitted) completedCount++;
    if (verificationStatus.financialDetails.verified) verifiedCount++;

    if (verificationStatus.railwayDeclaration.submitted) completedCount++;
    if (verificationStatus.railwayDeclaration.verified) verifiedCount++;

    const allSubmitted = completedCount === totalRequired;
    const allVerified = verifiedCount === totalRequired;

    return NextResponse.json({
      success: true,
      verificationStatus,
      summary: {
        totalRequired,
        completedCount,
        verifiedCount,
        completionPercentage: Math.round((completedCount / totalRequired) * 100),
        verificationPercentage: Math.round((verifiedCount / totalRequired) * 100),
        allSubmitted,
        allVerified,
        canApply: allVerified,
        nextStep: !allSubmitted ? 'Complete all sections' :
                  !allVerified ? 'Wait for verification' :
                  'You can now apply for shops!',
      },
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verification status' },
      { status: 500 }
    );
  }
}
