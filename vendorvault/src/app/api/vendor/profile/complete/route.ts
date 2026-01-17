import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAuthToken } from '@/middleware/auth';
import VendorBank from '@/models/VendorBank';
import VendorBusiness from '@/models/VendorBusiness';
import VendorFoodLicense from '@/models/VendorFoodLicense';
import VendorPolice from '@/models/VendorPolice';
import VendorFinancial from '@/models/VendorFinancial';
import VendorRailwayDeclaration from '@/models/VendorRailwayDeclaration';
import User from '@/models/User';
import { calculateProfileCompletion, checkVerificationStatus } from '@/lib/helpers';
import { BUSINESS_CATEGORIES } from '@/lib/constants';

// GET /api/vendor/profile/complete - Get complete vendor profile
export async function GET(req: NextRequest) {
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

    // Get all vendor data
    const [user, bank, business, foodLicense, police, financial, railwayDeclaration] = await Promise.all([
      User.findById(vendorId),
      VendorBank.findOne({ vendorId }),
      VendorBusiness.findOne({ vendorId }),
      VendorFoodLicense.findOne({ vendorId }),
      VendorPolice.findOne({ vendorId }),
      VendorFinancial.findOne({ vendorId }),
      VendorRailwayDeclaration.findOne({ vendorId }),
    ]);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate profile completion
    const profileData = {
      personal: {
        name: user.name,
        aadhaarNumber: user.aadhaarNumber,
        aadhaarVerified: user.aadhaarVerified,
        panNumber: user.panNumber,
        panVerified: user.panVerified,
        photo: user.photo,
        address: user.address,
        phone: user.phone,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        emergencyContact: user.emergencyContact,
        emergencyRelation: user.emergencyRelation,
      },
      business: business ? {
        businessName: business.businessName,
        businessType: business.businessType,
        businessCategory: business.businessCategory,
        yearsOfExperience: business.yearsOfExperience,
        employeeCount: business.employeeCount,
      } : undefined,
      bank: bank ? {
        accountHolderName: bank.accountHolderName,
        accountNumber: bank.accountNumber,
        ifscCode: bank.ifscCode,
        bankVerified: bank.bankVerified,
      } : undefined,
      financial: financial ? {
        annualTurnover: financial.annualTurnover,
        expectedMonthlyRevenue: financial.expectedMonthlyRevenue,
        canPaySecurityDeposit: financial.canPaySecurityDeposit,
      } : undefined,
      foodLicense: foodLicense ? {
        fssaiNumber: foodLicense.fssaiNumber,
        fssaiVerified: foodLicense.fssaiVerified,
        hygieneDeclarationAccepted: foodLicense.hygieneDeclarationAccepted,
      } : undefined,
      police: police ? {
        policeVerificationCertificate: police.policeVerificationCertificate,
        policeVerified: police.policeVerified,
        criminalDeclaration: police.criminalDeclaration,
      } : undefined,
      railwayDeclaration: railwayDeclaration ? {
        digitalSignature: railwayDeclaration.digitalSignature,
        signedAt: railwayDeclaration.signedAt,
        isValid: railwayDeclaration.isValid,
      } : undefined,
    };

    const completionPercentage = calculateProfileCompletion(profileData, business?.businessCategory);
    const verificationStatus = checkVerificationStatus(profileData, business?.businessCategory);

    // Update user profile completion percentage
    if (user.profileCompletionPercentage !== completionPercentage) {
      await User.findByIdAndUpdate(vendorId, { 
        profileCompletionPercentage: completionPercentage 
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        user,
        bank,
        business,
        foodLicense,
        police,
        financial,
        railwayDeclaration,
        profileCompletion: {
          percentage: completionPercentage,
          verificationStatus,
        },
      },
    });

  } catch (error) {
    console.error('Error fetching vendor profile:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch profile data' },
      { status: 500 }
    );
  }
}

// PUT /api/vendor/profile/complete - Update multiple profile sections
export async function PUT(req: NextRequest) {
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
    const body = await req.json();
    const { section, data } = body;

    let result;

    switch (section) {
      case 'personal':
        result = await User.findByIdAndUpdate(
          vendorId,
          {
            fullName: data.fullName,
            aadhaarNumber: data.aadhaarNumber,
            panNumber: data.panNumber,
            permanentAddress: data.permanentAddress,
            currentAddress: data.currentAddress,
            photo: data.photo,
          },
          { new: true, runValidators: true }
        );
        break;

      case 'business':
        result = await VendorBusiness.findOneAndUpdate(
          { vendorId },
          {
            businessName: data.businessName,
            businessType: data.businessType,
            businessCategory: data.businessCategory,
            businessDescription: data.businessDescription,
            yearsOfExperience: data.yearsOfExperience,
            employeeCount: data.employeeCount,
            existingShopAddress: data.existingShopAddress,
            gstNumber: data.gstNumber,
            gstRegistered: data.gstRegistered,
          },
          { new: true, upsert: true, runValidators: true }
        );
        break;

      case 'bank':
        result = await VendorBank.findOneAndUpdate(
          { vendorId },
          {
            accountHolderName: data.accountHolderName,
            accountNumber: data.accountNumber,
            ifscCode: data.ifscCode,
            bankName: data.bankName,
            branchName: data.branchName,
            cancelledChequeUrl: data.cancelledChequeUrl,
          },
          { new: true, upsert: true, runValidators: true }
        );
        break;

      case 'financial':
        result = await VendorFinancial.findOneAndUpdate(
          { vendorId },
          {
            annualTurnover: data.annualTurnover,
            expectedMonthlyRevenue: data.expectedMonthlyRevenue,
            canPaySecurityDeposit: data.canPaySecurityDeposit,
            securityDepositAmount: data.securityDepositAmount,
            monthlyRentBudget: data.monthlyRentBudget,
            financialDocuments: data.financialDocuments,
            creditScore: data.creditScore,
            previousRentHistory: data.previousRentHistory,
          },
          { new: true, upsert: true, runValidators: true }
        );
        break;

      case 'foodLicense':
        // Only allow if business category is FOOD
        const business = await VendorBusiness.findOne({ vendorId });
        if (business?.businessCategory !== BUSINESS_CATEGORIES.FOOD) {
          return NextResponse.json(
            { success: false, message: 'Food license only required for FOOD category businesses' },
            { status: 400 }
          );
        }

        result = await VendorFoodLicense.findOneAndUpdate(
          { vendorId },
          {
            fssaiNumber: data.fssaiNumber,
            fssaiCertificateUrl: data.fssaiCertificateUrl,
            fssaiExpiryDate: data.fssaiExpiryDate,
            foodType: data.foodType,
            foodItems: data.foodItems,
            kitchenType: data.kitchenType,
            hygieneDeclarationAccepted: data.hygieneDeclarationAccepted,
            hygieneTrainingCertificate: data.hygieneTrainingCertificate,
            waterQualityCertificate: data.waterQualityCertificate,
            pestControlCertificate: data.pestControlCertificate,
          },
          { new: true, upsert: true, runValidators: true }
        );
        break;

      case 'police':
        result = await VendorPolice.findOneAndUpdate(
          { vendorId },
          {
            policeVerificationCertificate: data.policeVerificationCertificate,
            policeStation: data.policeStation,
            certificateNumber: data.certificateNumber,
            issuedDate: data.issuedDate,
            expiryDate: data.expiryDate,
            criminalDeclaration: data.criminalDeclaration,
            criminalDeclarationDate: new Date(),
            digitalSignatureUrl: data.digitalSignatureUrl,
          },
          { new: true, upsert: true, runValidators: true }
        );
        break;

      case 'railwayDeclaration':
        result = await VendorRailwayDeclaration.findOneAndUpdate(
          { vendorId },
          {
            declarations: {
              noEncroachment: data.declarations.noEncroachment,
              noSubletting: data.declarations.noSubletting,
              inspectionAllowed: data.declarations.inspectionAllowed,
              railwayRulesAccepted: data.declarations.railwayRulesAccepted,
            },
            digitalSignature: data.digitalSignature,
            digitalSignatureData: data.digitalSignatureData,
            signedAt: new Date(),
            ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
            deviceInfo: req.headers.get('user-agent') || '',
            witnessName: data.witnessName,
            witnessContact: data.witnessContact,
            legalAcceptance: data.legalAcceptance,
            declarationVersion: '1.0',
            isValid: true,
          },
          { new: true, upsert: true, runValidators: true }
        );
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid section' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `${section} updated successfully`,
      data: result,
    });

  } catch (error) {
    console.error('Error updating vendor profile:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update profile' },
      { status: 500 }
    );
  }
}