import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Vendor from '@/models/Vendor';
import User from '@/models/User';
import VendorBank from '@/models/VendorBank';
import VendorBusiness from '@/models/VendorBusiness';
import VendorFoodLicense from '@/models/VendorFoodLicense';
import VendorPolice from '@/models/VendorPolice';
import VendorFinancial from '@/models/VendorFinancial';
import VendorRailwayDeclaration from '@/models/VendorRailwayDeclaration';
import License from '@/models/License';
import ShopApplication from '@/models/ShopApplication';
import Station from '@/models/Station';
import Document from '@/models/Document';
import { requireRole } from '@/middleware/auth';
import { generateLicenseNumber } from '@/lib/utils';
import { createNewApplicationNotification } from '@/lib/notifications';

async function handler(req: NextRequest, userId: string) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      stationCode,
      stationName,
      platformNumber,
      shopId,
      shopWidth,
      shopName,
      shopDescription,
      proposedMonthlyRent,
    } = body;

    // Debug: log incoming application body
    console.debug('Vendor apply request body:', {
      stationCode,
      stationName,
      platformNumber,
      shopId,
      shopWidth,
      proposedMonthlyRent,
    });

    // Validate all required fields and return which ones are missing
    const missingFields: string[] = [];
    if (!stationName) missingFields.push('stationName');
    if (!stationCode) missingFields.push('stationCode');
    if (!platformNumber) missingFields.push('platformNumber');
    if (!shopId) missingFields.push('shopId');
    if (!shopName) missingFields.push('shopName');
    if (!proposedMonthlyRent && proposedMonthlyRent !== 0) missingFields.push('proposedMonthlyRent');

    if (missingFields.length > 0) {
      console.warn('Vendor apply missing fields:', missingFields);
      return NextResponse.json(
        { error: 'All fields are required.', missingFields, received: { stationCode, stationName, platformNumber, shopId, shopName, shopWidth, proposedMonthlyRent } },
        { status: 400 }
      );
    }

    // Note: do not capture or persist document verification snapshot here.
    // Vendors may submit applications without verified documents. Station
    // managers will review documents and mark them verified via the
    // documents verification workflow before approving applications.

    // Find or create vendor profile
    let vendor = await Vendor.findOne({ userId });
    if (vendor) {
      // Update existing vendor with application details
      vendor.stationName = stationName;
      vendor.stationCode = stationCode;
      vendor.platformNumber = platformNumber;
      vendor.shopNumber = shopId; // Store shopId temporarily, will be updated on approval
      vendor.stallLocationDescription = `Platform ${platformNumber}, Shop Area`;
      vendor.shopDescription = shopDescription || undefined;
      await vendor.save();
    } else {
      // Create new vendor with application details
      vendor = await Vendor.create({
        userId,
        businessName: 'Not specified',
        businessType: 'other',
        stationName,
        stationCode,
        platformNumber,
        shopDescription: shopDescription || undefined,
        shopNumber: shopId, // Store shopId temporarily, will be updated on approval
        stallLocationDescription: `Platform ${platformNumber}, Shop Area`,
      });
    }

    // Find the station by stationCode
    const station = await Station.findOne({ stationCode });
    if (!station) {
      return NextResponse.json(
        { error: 'Station not found', shopDescription: shopDescription || undefined },
        { status: 404 }
      );
    }

    // Check if there's already a pending application for this shop
    const existingApplication = await ShopApplication.findOne({
      vendorId: userId, // Use userId consistently
      shopId,
      status: { $in: ['SUBMITTED', 'NEGOTIATION', 'APPROVED'] },
    });

    if (existingApplication) {
      // Return existing application ID for negotiation
      return NextResponse.json({
        success: true,
        message: 'You have a pending application for this shop.',
        applicationId: existingApplication._id.toString(),
      });
    }

    // Create shop application first
    const shopApplication = await ShopApplication.create({
      vendorId: userId, // Store User ID for consistency with verification models
      shopId,
      shopName: shopName || undefined,
      stationId: station._id,
      stationName: station.stationName || station.stationName || station.name,
      platformNumber: platformNumber,
      quotedRent: proposedMonthlyRent,
      securityDeposit: proposedMonthlyRent * 3, // Standard 3 months deposit
      proposedStartDate: new Date(),
      proposedEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      status: 'SUBMITTED',
      submittedAt: new Date(),
    });

    // Do not persist verification snapshot; station manager will verify documents
    // and approval flow will compute verification from the `Document` collection.
    await shopApplication.save();

    // Create license application linked to shop application
    const licenseNumber = generateLicenseNumber();
    
    const initialMessage = {
      senderId: userId,
      senderRole: 'VENDOR' as const,
      senderName: vendor.businessName || 'Vendor',
      message: `Initial application submitted with proposed rent of ₹${proposedMonthlyRent}/month.`,
      proposedRent: proposedMonthlyRent,
      timestamp: new Date(),
    };
    
    const license = await License.create({
      vendorId: userId, // Store User ID for consistency
      applicationId: shopApplication._id, // Link to shop application
      stationId: station._id, // Add required stationId
      shopName: shopName || undefined,
      licenseNumber,
      status: 'PENDING',
      monthlyRent: proposedMonthlyRent, // Store proposed rent
      proposedRent: proposedMonthlyRent, // Store as initial proposal
      shopId, // Store shopId for later shop allocation
      shopWidth, // Store shopWidth for reference
      licenseType: 'TEMPORARY', // Default license type
      validityPeriod: 12, // 12 months
      renewalEligible: true,
      negotiationStatus: 'PENDING', // Start negotiation
      negotiationMessages: [initialMessage],
    });
    
    // Create notification for station manager
    try {
      if (station.stationManagerId) {
        await createNewApplicationNotification(
          station.stationManagerId.toString(),
          vendor.businessName || 'A vendor',
          shopApplication._id.toString()
        );
      }
    } catch (notifError) {
      console.error('Failed to send application notification to station manager:', notifError);
      // Don't fail the application if notification fails
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Application submitted successfully! Proceed to negotiation with station manager.',
        applicationId: license._id.toString(),
        license: {
          id: license._id,
          licenseNumber: license.licenseNumber,
          status: license.status,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit application' },
      { status: 500 }
    );
  }
}

export const POST = requireRole(['VENDOR'])(handler);

