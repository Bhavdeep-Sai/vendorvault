import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import License from "@/models/License";
import ShopApplication from "@/models/ShopApplication";
import Station from "@/models/Station";
import StationLayout from "@/models/StationLayout";
import Vendor from "@/models/Vendor";
import mongoose from "mongoose";
import { getAuthUser } from "@/middleware/auth";
import { generateLicenseNumber } from "@/lib/helpers";
import { LICENSE_VALIDITY_DAYS } from "@/lib/constants";
import { createApplicationStatusNotification } from "@/lib/notifications";
import QRCode from 'qrcode';

// Approve or reject vendor license application
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Forbidden - Station Manager access required' }, { status: 403 });
    }

    await connectDB();

    // Find the station managed by this user
    const station = await Station.findOne({ 
      stationManagerId: auth.userId,
      approvalStatus: "APPROVED"
    });

    if (!station) {
      return NextResponse.json(
        { error: "No approved station found for this manager" },
        { status: 404 }
      );
    }

    const { licenseId, action, rejectionReason, expiryMonths, securityDeposit } = await request.json();

    if (!licenseId || !action) {
      return NextResponse.json(
        { error: "License ID and action are required" },
        { status: 400 }
      );
    }

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json(
        { error: "Action must be APPROVED or REJECTED" },
        { status: 400 }
      );
    }

    if (action === 'REJECTED' && !rejectionReason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    const license = await License.findById(licenseId);

    if (!license) {
      return NextResponse.json(
        { error: "License not found" },
        { status: 404 }
      );
    }

    // Get the shop application to verify it belongs to this station
    const shopApplication = await ShopApplication.findById(license.applicationId);
    
    if (!shopApplication) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Verify the application belongs to this station
    if (shopApplication.stationId.toString() !== station._id.toString()) {
      return NextResponse.json(
        { error: "This application does not belong to your station" },
        { status: 403 }
      );
    }

    if (license.status !== 'PENDING') {
      return NextResponse.json(
        { error: "License has already been processed" },
        { status: 400 }
      );
    }

    if (action === 'APPROVED') {
      // validate optional inputs
      const months = expiryMonths !== undefined ? parseInt(String(expiryMonths), 10) : null;
      const deposit = securityDeposit !== undefined ? Number(securityDeposit) : null;

      if (months !== null && (isNaN(months) || months <= 0)) {
        return NextResponse.json({ error: 'expiryMonths must be a positive integer' }, { status: 400 });
      }
      if (deposit !== null && (isNaN(deposit) || deposit < 0)) {
        return NextResponse.json({ error: 'securityDeposit must be a non-negative number' }, { status: 400 });
      }
      // Get vendor details for QR code
      const vendor = await Vendor.findOne({ userId: shopApplication.vendorId });
      
      const licenseNumber = generateLicenseNumber();
      const issuedAt = new Date();
      const expiresAt = new Date();
      if (expiryMonths && !isNaN(Number(expiryMonths)) && Number(expiryMonths) > 0) {
        expiresAt.setMonth(expiresAt.getMonth() + Number(expiryMonths));
      } else {
        expiresAt.setDate(expiresAt.getDate() + LICENSE_VALIDITY_DAYS);
      }

      // Generate QR code
      const qrData = JSON.stringify({
        licenseNumber,
        vendorId: shopApplication.vendorId,
        businessName: vendor?.businessName || 'Vendor',
        shopId: shopApplication.shopId,
        stationCode: station.stationCode,
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });

      const qrCodeUrl = await QRCode.toDataURL(qrData);
      
      license.status = 'APPROVED';
      license.licenseNumber = licenseNumber;
      license.issuedAt = issuedAt;
      license.expiresAt = expiresAt;
      license.qrCodeData = qrData;
      license.qrCodeUrl = qrCodeUrl;
      license.approvedBy = new mongoose.Types.ObjectId(auth.userId);
      license.approvedAt = new Date();
      if (securityDeposit !== undefined) {
        license.securityDeposit = Number(securityDeposit);
      }
      
      // Update shop application status
      shopApplication.status = 'APPROVED';
      shopApplication.approvedBy = new mongoose.Types.ObjectId(auth.userId);
      shopApplication.approvedAt = new Date();
      shopApplication.licenseNumber = licenseNumber;
      shopApplication.licenseIssuedAt = issuedAt;
      shopApplication.licenseExpiresAt = expiresAt;
      shopApplication.qrCodeUrl = qrCodeUrl;
      if (securityDeposit !== undefined) {
        shopApplication.finalSecurityDeposit = Number(securityDeposit);
      }
      await shopApplication.save();

      // Update shop allocation in StationLayout
      if (license.shopId) {
        try {
          const stationLayout = await StationLayout.findOne({ stationCode: station.stationCode });
          
          if (stationLayout) {
            // Find the platform and shop
            let shopFound = false;
            for (const platform of stationLayout.platforms) {
              const shop = platform.shops.find((s: { _id: { toString: () => string } }) => s._id.toString() === license.shopId);
              if (shop) {
                // Mark shop as allocated
                shop.isAllocated = true;
                shop.vendorId = shopApplication.vendorId.toString();
                shop.shopName = vendor?.businessName || 'Vendor';
                shop.shopType = vendor?.businessType || 'other';
                shop.rent = license.monthlyRent;
                shopFound = true;
                break;
              }
            }
            
            if (shopFound) {
              await stationLayout.save();
            } else {
            }
          } else {
          }
        } catch {
          // Don't fail the approval if layout update fails
        }
      }
    } else {
      license.status = 'REJECTED';
      license.rejectionReason = rejectionReason;
      
      // Update shop application status
      shopApplication.status = 'REJECTED';
      shopApplication.rejectionReason = rejectionReason;
      shopApplication.rejectedBy = new mongoose.Types.ObjectId(auth.userId);
      shopApplication.rejectedAt = new Date();
      await shopApplication.save();
    }

    await license.save();

    // Create notification for vendor
    try {
      await createApplicationStatusNotification(
        shopApplication.vendorId,
        action === 'APPROVED' ? 'APPROVED' : 'REJECTED',
        shopApplication._id.toString(),
        action === 'APPROVED' 
          ? `Your application for shop ${shopApplication.shopId} has been approved!`
          : rejectionReason
      );
    } catch {
      // Don't fail the approval if notification fails
    }

    const actionText = action === 'APPROVED' ? 'approved' : 'rejected';
    return NextResponse.json({
      message: `License ${actionText} successfully`,
      license
    });

  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
