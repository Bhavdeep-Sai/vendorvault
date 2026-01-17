import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAuthToken } from '@/middleware/auth';
import ShopApplication from '@/models/ShopApplication';
import VendorBusiness from '@/models/VendorBusiness';
import VendorBank from '@/models/VendorBank';
import VendorFoodLicense from '@/models/VendorFoodLicense';
import VendorPolice from '@/models/VendorPolice';
import VendorFinancial from '@/models/VendorFinancial';
import VendorRailwayDeclaration from '@/models/VendorRailwayDeclaration';
import User from '@/models/User';
import NegotiationRoom from '@/models/NegotiationRoom';
import { checkVerificationStatus, calculateRiskLevel } from '@/lib/helpers';
import { APPLICATION_STATUS, BUSINESS_CATEGORIES } from '@/lib/constants';

// PUT /api/vendor/applications/[id] - Update application (submit, cancel, etc.)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
    const authResult = await verifyAuthToken(req);
    if (!authResult.success || authResult.user?.role !== 'VENDOR') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const vendorId = authResult.user.id;
    const { id } = await params;
    const applicationId = id;
    const body = await req.json();
    const { action, ...updateData } = body;

    // Find application
    const application = await ShopApplication.findOne({
      _id: applicationId,
      vendorId,
    });

    if (!application) {
      return NextResponse.json(
        { success: false, message: 'Application not found' },
        { status: 404 }
      );
    }

    let updatedApplication;

    switch (action) {
      case 'submit':
        // Validate that all verifications are complete
        const verificationStatus = await validateVendorVerifications(vendorId);
        
        if (!verificationStatus.allVerified) {
          return NextResponse.json(
            {
              success: false,
              message: 'All verifications must be complete before submitting',
              verificationStatus,
            },
            { status: 400 }
          );
        }

        // Calculate risk level
        const profileData = await getVendorProfileData(vendorId);
        const riskLevel = calculateRiskLevel(profileData);

        updatedApplication = await ShopApplication.findByIdAndUpdate(
          applicationId,
          {
            status: APPLICATION_STATUS.SUBMITTED,
            submittedAt: new Date(),
            verificationStatus,
            verificationCheckedAt: new Date(),
            riskLevel,
            $push: {
              statusHistory: {
                status: APPLICATION_STATUS.SUBMITTED,
                changedBy: vendorId,
                changedAt: new Date(),
                reason: 'Application submitted for review',
              },
            },
          },
          { new: true }
        );
        break;

      case 'cancel':
        if (!['DRAFT', 'SUBMITTED'].includes(application.status)) {
          return NextResponse.json(
            { success: false, message: 'Cannot cancel application in current status' },
            { status: 400 }
          );
        }

        updatedApplication = await ShopApplication.findByIdAndUpdate(
          applicationId,
          {
            status: APPLICATION_STATUS.TERMINATED,
            $push: {
              statusHistory: {
                status: APPLICATION_STATUS.TERMINATED,
                changedBy: vendorId,
                changedAt: new Date(),
                reason: updateData.reason || 'Cancelled by vendor',
              },
            },
          },
          { new: true }
        );
        break;

      case 'update':
        if (application.status !== APPLICATION_STATUS.DRAFT) {
          return NextResponse.json(
            { success: false, message: 'Cannot update submitted application' },
            { status: 400 }
          );
        }

        updatedApplication = await ShopApplication.findByIdAndUpdate(
          applicationId,
          {
            ...updateData,
            $push: {
              statusHistory: {
                status: APPLICATION_STATUS.DRAFT,
                changedBy: vendorId,
                changedAt: new Date(),
                reason: 'Application updated',
              },
            },
          },
          { new: true }
        );
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Application ${action}ed successfully`,
      data: updatedApplication,
    });

  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update application' },
      { status: 500 }
    );
  }
}

// GET /api/vendor/applications/[id] - Get specific application with details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
    const authResult = await verifyAuthToken(req);
    if (!authResult.success || authResult.user?.role !== 'VENDOR') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const vendorId = authResult.user.id;
    const { id } = await params;
    const applicationId = id;

    const application = await ShopApplication.findOne({
      _id: applicationId,
      vendorId,
    })
      .populate('stationId', 'name stationCode')
      .populate('platformId', 'name platformNumber')
      .populate('reviewedBy', 'name')
      .populate('approvedBy', 'name')
      .populate('rejectedBy', 'name');

    if (!application) {
      return NextResponse.json(
        { success: false, message: 'Application not found' },
        { status: 404 }
      );
    }

    // Get negotiation room if exists
    let negotiationRoom = null;
    if (application.status === APPLICATION_STATUS.NEGOTIATION) {
      negotiationRoom = await NegotiationRoom.findOne({ applicationId });
    }

    return NextResponse.json({
      success: true,
      data: {
        application,
        negotiationRoom,
      },
    });

  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch application' },
      { status: 500 }
    );
  }
}

// Helper function to validate vendor verifications
async function validateVendorVerifications(vendorId: string) {
  const [user, business, bank, foodLicense, police, railwayDeclaration] = await Promise.all([
    User.findById(vendorId),
    VendorBusiness.findOne({ vendorId }),
    VendorBank.findOne({ vendorId }),
    VendorFoodLicense.findOne({ vendorId }),
    VendorPolice.findOne({ vendorId }),
    VendorRailwayDeclaration.findOne({ vendorId }),
  ]);

  const profileData = {
    personal: {
      aadhaarVerified: user?.aadhaarVerified,
      panVerified: user?.panVerified,
    },
    business: {
      businessCategory: business?.businessCategory,
    },
    bank: {
      bankVerified: bank?.bankVerified,
    },
    foodLicense: {
      fssaiVerified: foodLicense?.fssaiVerified,
    },
    police: {
      policeVerified: police?.policeVerified,
    },
    railwayDeclaration: {
      isValid: railwayDeclaration?.isValid,
    },
  };

  return checkVerificationStatus(profileData, business?.businessCategory);
}

// Helper function to get complete vendor profile data for risk assessment
async function getVendorProfileData(vendorId: string) {
  const [user, business, bank, financial, foodLicense, police, railwayDeclaration] = await Promise.all([
    User.findById(vendorId),
    VendorBusiness.findOne({ vendorId }),
    VendorBank.findOne({ vendorId }),
    VendorFinancial.findOne({ vendorId }), // Fixed: was VendorBank
    VendorFoodLicense.findOne({ vendorId }),
    VendorPolice.findOne({ vendorId }),
    VendorRailwayDeclaration.findOne({ vendorId }),
  ]);

  return {
    personal: {
      aadhaarVerified: user?.aadhaarVerified,
      panVerified: user?.panVerified,
    },
    business: {
      businessCategory: business?.businessCategory,
      yearsOfExperience: business?.yearsOfExperience,
    },
    financial: {
      annualTurnover: financial?.annualTurnover,
      canPaySecurityDeposit: financial?.canPaySecurityDeposit,
    },
    bank: {
      bankVerified: bank?.bankVerified,
    },
    foodLicense: {
      fssaiVerified: foodLicense?.fssaiVerified,
    },
    police: {
      policeVerified: police?.policeVerified,
    },
    railwayDeclaration: {
      isValid: railwayDeclaration?.isValid,
    },
  };
}