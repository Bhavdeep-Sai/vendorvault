import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAuthUser } from '@/middleware/auth';
import Station from '@/models/Station';
import User from '@/models/User';
import VendorBank from '@/models/VendorBank';
import VendorBusiness from '@/models/VendorBusiness';
import VendorFoodLicense from '@/models/VendorFoodLicense';
import VendorPolice from '@/models/VendorPolice';
import VendorFinancial from '@/models/VendorFinancial';
import VendorRailwayDeclaration from '@/models/VendorRailwayDeclaration';
import ShopApplication from '@/models/ShopApplication';
import { createDocumentVerificationNotification } from '@/lib/notifications';

/**
 * PATCH /api/station-manager/vendor-verification
 * Verify or reject specific vendor document sections
 */
export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { vendorId, verificationType, verified, verificationNotes } = await request.json();

    if (!vendorId || !verificationType || verified === undefined) {
      return NextResponse.json(
        { error: 'vendorId, verificationType, and verified status required' },
        { status: 400 }
      );
    }

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

    let updatedDocument = null;
    let notificationMessage = '';

    switch (verificationType) {
      case 'bank':
        updatedDocument = await VendorBank.findOneAndUpdate(
          { vendorId },
          {
            bankVerified: verified,
            verifiedAt: verified ? new Date() : undefined,
            verifiedBy: verified ? authUser.userId : undefined,
            rejectionReason: !verified ? verificationNotes : undefined,
          },
          { new: true }
        );
        notificationMessage = `Bank details ${verified ? 'verified' : 'rejected'}`;
        break;

      case 'business':
        updatedDocument = await VendorBusiness.findOneAndUpdate(
          { vendorId },
          {
            businessVerified: verified,
            verifiedAt: verified ? new Date() : undefined,
            verifiedBy: verified ? authUser.userId : undefined,
            rejectionReason: !verified ? verificationNotes : undefined,
          },
          { new: true }
        );
        notificationMessage = `Business details ${verified ? 'verified' : 'rejected'}`;
        break;

      case 'foodLicense':
        updatedDocument = await VendorFoodLicense.findOneAndUpdate(
          { vendorId },
          {
            fssaiVerified: verified,
            verifiedAt: verified ? new Date() : undefined,
            verifiedBy: verified ? authUser.userId : undefined,
            rejectionReason: !verified ? verificationNotes : undefined,
          },
          { new: true }
        );
        notificationMessage = `FSSAI license ${verified ? 'verified' : 'rejected'}`;
        break;

      case 'police':
        updatedDocument = await VendorPolice.findOneAndUpdate(
          { vendorId },
          {
            policeVerified: verified,
            verifiedAt: verified ? new Date() : undefined,
            verifiedBy: verified ? authUser.userId : undefined,
            rejectionReason: !verified ? verificationNotes : undefined,
            backgroundCheckStatus: verified ? 'CLEAR' : 'REQUIRES_REVIEW',
          },
          { new: true }
        );
        notificationMessage = `Police verification ${verified ? 'verified' : 'rejected'}`;
        break;

      case 'financial':
        updatedDocument = await VendorFinancial.findOneAndUpdate(
          { vendorId },
          {
            financialVerified: verified,
            verifiedAt: verified ? new Date() : undefined,
            verifiedBy: verified ? authUser.userId : undefined,
            rejectionReason: !verified ? verificationNotes : undefined,
          },
          { new: true }
        );
        notificationMessage = `Financial details ${verified ? 'verified' : 'rejected'}`;
        break;

      case 'railwayDeclaration':
        updatedDocument = await VendorRailwayDeclaration.findOneAndUpdate(
          { vendorId },
          {
            isValid: verified,
            verifiedAt: verified ? new Date() : undefined,
            verifiedBy: verified ? authUser.userId : undefined,
          },
          { new: true }
        );
        notificationMessage = `Railway declaration ${verified ? 'verified' : 'rejected'}`;
        break;

      case 'aadhaar':
        await User.findByIdAndUpdate(vendorId, {
          aadhaarVerified: verified,
        });
        notificationMessage = `Aadhaar ${verified ? 'verified' : 'rejected'}`;
        break;

      case 'pan':
        await User.findByIdAndUpdate(vendorId, {
          panVerified: verified,
        });
        notificationMessage = `PAN ${verified ? 'verified' : 'rejected'}`;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid verification type' },
          { status: 400 }
        );
    }

    // Send notification to vendor
    try {
      await createDocumentVerificationNotification(
        vendorId,
        verificationType,
        verified,
        verificationNotes || notificationMessage
      );
    } catch (notifError) {
      console.error('Notification error:', notifError);
      // Don't fail the verification if notification fails
    }

    // If rejected, update any pending applications
    if (!verified) {
      await ShopApplication.updateMany(
        {
          vendorId,
          stationId: station._id,
          status: { $in: ['SUBMITTED', 'NEGOTIATION'] },
        },
        {
          $push: {
            statusHistory: {
              status: 'VERIFICATION_FAILED',
              changedBy: authUser.userId,
              changedAt: new Date(),
              reason: `${verificationType} verification failed: ${verificationNotes || 'Invalid or incomplete information'}`,
            },
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: notificationMessage,
      document: updatedDocument,
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Failed to update verification status' },
      { status: 500 }
    );
  }
}
