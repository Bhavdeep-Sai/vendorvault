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
 * GET /api/vendor/can-apply
 * Check if vendor can apply for a shop based on verification status
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
      User.findById(vendorId).select('aadhaarVerified panVerified').lean(),
      VendorBank.findOne({ vendorId }).select('bankVerified').lean(),
      VendorBusiness.findOne({ vendorId }).select('businessVerified businessCategory').lean(),
      VendorFoodLicense.findOne({ vendorId }).select('fssaiVerified').lean(),
      VendorPolice.findOne({ vendorId }).select('policeVerified').lean(),
      VendorFinancial.findOne({ vendorId }).select('financialVerified').lean(),
      VendorRailwayDeclaration.findOne({ vendorId }).select('isValid').lean(),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check each requirement
    const requirements = {
      aadhaarVerified: user.aadhaarVerified || false,
      panVerified: user.panVerified || false,
      bankVerified: bank?.bankVerified || false,
      businessVerified: business?.businessVerified || false,
      fssaiVerified: business?.businessCategory === 'FOOD' ? (foodLicense?.fssaiVerified || false) : true,
      policeVerified: police?.policeVerified || false,
      financialVerified: financial?.financialVerified || false,
      railwayDeclarationSigned: railway?.isValid || false,
    };

    const missingRequirements = Object.entries(requirements)
      .filter(([_, verified]) => !verified)
      .map(([key]) => key);

    const canApply = missingRequirements.length === 0;

    return NextResponse.json({
      success: true,
      canApply,
      requirements,
      missingRequirements,
      message: canApply 
        ? 'All verifications complete. You can apply for shops!' 
        : `Please complete the following verifications: ${missingRequirements.join(', ')}`,
    });
  } catch (error) {
    console.error('Error checking application eligibility:', error);
    return NextResponse.json(
      { error: 'Failed to check application eligibility' },
      { status: 500 }
    );
  }
}
