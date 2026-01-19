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

      // Create agreement and payments after approval
      try {
        const VendorAgreement = (await import('@/models/VendorAgreement')).default;
        const VendorPayment = (await import('@/models/VendorPayment')).default;
        const Platform = (await import('@/models/Platform')).default;

        const safeStationId = shopApplication.stationId;
        const safeShopId = shopApplication.shopId || String(shopApplication._id).slice(-6);
        
        const startDate = issuedAt;
        const endDate = expiresAt;
        const monthlyRent = shopApplication.finalAgreedRent || shopApplication.quotedRent || license.monthlyRent || 0;
        const securityDepositAmount = shopApplication.finalSecurityDeposit || shopApplication.securityDeposit || license.securityDeposit || 0;
        const durationMonths = expiryMonths && !isNaN(Number(expiryMonths)) ? Number(expiryMonths) : 12;

        // Check if agreement already exists
        let agreement = await VendorAgreement.findOne({ applicationId: shopApplication._id });
        
        if (!agreement) {
          const agreementNumber = `AGR-${station.stationCode}-${new Date().getFullYear()}-${String(shopApplication._id).slice(-6)}`;

          agreement = await VendorAgreement.create({
            vendorId: shopApplication.vendorId,
            applicationId: shopApplication._id,
            stationId: safeStationId,
            shopId: safeShopId,
            agreementNumber,
            startDate,
            endDate,
            duration: durationMonths,
            monthlyRent,
            securityDeposit: securityDepositAmount,
            securityDepositPaid: false,
            status: 'ACTIVE',
            licenseNumber: licenseNumber,
            licenseExpiryDate: endDate,
            createdBy: new mongoose.Types.ObjectId(auth.userId),
            approvedBy: new mongoose.Types.ObjectId(auth.userId),
            approvedAt: new Date(),
          });
          
          console.log('✅ Created agreement:', agreement.agreementNumber);
        }

        // Create security deposit payment if needed
        if (securityDepositAmount > 0) {
          const depExists = await VendorPayment.findOne({ 
            applicationId: shopApplication._id, 
            paymentType: 'SECURITY_DEPOSIT' 
          });
          
          if (!depExists) {
            await VendorPayment.create({
              vendorId: shopApplication.vendorId,
              applicationId: shopApplication._id,
              stationId: safeStationId,
              shopId: safeShopId,
              paymentType: 'SECURITY_DEPOSIT',
              dueDate: new Date(),
              amount: securityDepositAmount,
              paidAmount: 0,
              balanceAmount: securityDepositAmount,
              status: 'PENDING',
              createdBy: new mongoose.Types.ObjectId(auth.userId),
            });
            console.log('✅ Created security deposit payment');
          }
        }

        // Create first month rent payment
        const rentExists = await VendorPayment.findOne({ 
          applicationId: shopApplication._id, 
          paymentType: 'RENT' 
        });
        
        if (!rentExists) {
          const billingMonth = `${issuedAt.getFullYear()}-${String(issuedAt.getMonth() + 1).padStart(2, '0')}`;
          
          await VendorPayment.create({
            vendorId: shopApplication.vendorId,
            applicationId: shopApplication._id,
            stationId: safeStationId,
            shopId: safeShopId,
            paymentType: 'RENT',
            dueDate: issuedAt,
            amount: monthlyRent,
            paidAmount: 0,
            balanceAmount: monthlyRent,
            status: monthlyRent > 0 ? 'PENDING' : 'PAID',
            billingMonth,
            billingYear: issuedAt.getFullYear(),
            createdBy: new mongoose.Types.ObjectId(auth.userId),
          });
          console.log('✅ Created rent payment');
        }

        // Update Platform shop occupancy status
        let platform: any = null;
        
        // Try multiple matching strategies
        try {
          if (mongoose.Types.ObjectId.isValid(safeShopId)) {
            platform = await Platform.findOne({ 
              stationId: shopApplication.stationId, 
              'shops._id': new mongoose.Types.ObjectId(safeShopId) 
            });
          }
        } catch (e) {
          // Not a valid ObjectId
        }
        
        if (!platform) {
          platform = await Platform.findOne({ 
            stationId: shopApplication.stationId, 
            'shops.shopNumber': String(safeShopId) 
          });
        }
        
        if (platform) {
          let shopUpdated = false;
          for (let i = 0; i < platform.shops.length; i++) {
            const shop = platform.shops[i];
            const shopMatches = (
              String(shop._id) === String(safeShopId) ||
              String(shop.shopNumber) === String(safeShopId)
            );
            
            if (shopMatches) {
              platform.shops[i].status = 'OCCUPIED';
              platform.shops[i].vendorId = shopApplication.vendorId;
              platform.shops[i].businessName = shopApplication.shopName;
              platform.shops[i].monthlyRent = monthlyRent;
              platform.shops[i].occupiedSince = issuedAt;
              platform.shops[i].leaseEndDate = expiresAt;
              shopUpdated = true;
              break;
            }
          }
          
          if (shopUpdated) {
            platform.updateShopCounts();
            await platform.save();
            console.log('✅ Updated platform shop status to OCCUPIED');
          } else {
            console.warn('⚠️ Shop not found in platform. ShopId:', safeShopId);
          }
        } else {
          console.warn('⚠️ Platform not found for stationId:', shopApplication.stationId);
        }

      } catch (e) {
        console.error('❌ Failed to create agreement/payments:', e);
        // Don't fail the approval
      }

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
