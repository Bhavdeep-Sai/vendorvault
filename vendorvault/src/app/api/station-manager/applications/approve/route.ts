import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ShopApplication from '@/models/ShopApplication';
import User from '@/models/User';
import VendorBank from '@/models/VendorBank';
import VendorBusiness from '@/models/VendorBusiness';
import VendorFoodLicense from '@/models/VendorFoodLicense';
import VendorPolice from '@/models/VendorPolice';
import VendorFinancial from '@/models/VendorFinancial';
import VendorRailwayDeclaration from '@/models/VendorRailwayDeclaration';
import mongoose from 'mongoose';
import VendorAgreement from '@/models/VendorAgreement';
import VendorPayment from '@/models/VendorPayment';
import Station from '@/models/Station';
import StationLayout from '@/models/StationLayout';
import License from '@/models/License';
import { verifyAuthToken } from '@/middleware/auth';
import { createApplicationStatusNotification } from '@/lib/notifications';
import { generateLicenseQRCode } from '@/lib/qrcode';

// POST: Approve or reject an application
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || authResult.user?.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { applicationId, action, rejectionReason, expiryMonths, securityDeposit } = body;

    if (!applicationId || !action) {
      return NextResponse.json({ 
        error: 'Application ID and action are required' 
      }, { status: 400 });
    }

    const application = await ShopApplication.findById(applicationId);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (action === 'APPROVED') {      // Before approving, check that required documents are verified in the
      // `Document` collection. Station managers should verify documents via
      // /api/station-manager/documents/verify which sets Document.verified=true.
      // Resolve vendor (documents are stored against Vendor._id)
      const vendorUserId = application.vendorId; // application stores User._id
      let vendorDoc = await (await import('@/models/Vendor')).default.findOne({ userId: vendorUserId }).lean();
      if (!vendorDoc) {
        // Maybe application.vendorId already contains Vendor._id
        vendorDoc = await (await import('@/models/Vendor')).default.findById(vendorUserId).lean();
      }

      const vendorRefId = vendorDoc?._id;

      // Determine required document types
      const business = await VendorBusiness.findOne({ vendorId: vendorUserId }).lean();
      const requiredDocs: string[] = ['AADHAAR', 'PAN', 'BANK_STATEMENT', 'POLICE_VERIFICATION', 'RAILWAY_DECLARATION'];
      if (business?.businessCategory === 'FOOD') requiredDocs.push('FSSAI');

      const missingVerifications: string[] = [];
      const verificationStatus: Record<string, boolean> = {};

      for (const dt of requiredDocs) {
        let found = false;
        try {
          if (vendorRefId) {
            const doc = await (await import('@/models/Document')).default.findOne({ vendorId: vendorRefId, type: dt, verified: true }).lean();
            found = !!doc;
          }
        } catch (e) {
          // ignore
        }
        verificationStatus[dt] = found;
        if (!found) missingVerifications.push(dt);
      }

      const allVerified = missingVerifications.length === 0;

      if (!allVerified) {
        return NextResponse.json({
          error: 'Cannot approve application: All required documents must be verified',
          missingVerifications,
          verificationStatus,
        }, { status: 400 });
      }

      // validate optional input values
      const months = parseInt(String(expiryMonths || '12'), 10);
      const deposit = typeof securityDeposit === 'number' ? securityDeposit : (securityDeposit ? Number(securityDeposit) : undefined);

      if (expiryMonths !== undefined && (isNaN(months) || months <= 0)) {
        return NextResponse.json({ error: 'expiryMonths must be a positive integer' }, { status: 400 });
      }
      if (securityDeposit !== undefined && (isNaN(Number(deposit)) || Number(deposit) < 0)) {
        return NextResponse.json({ error: 'securityDeposit must be a non-negative number' }, { status: 400 });
      }

      application.status = 'APPROVED';
      application.approvedBy = new mongoose.Types.ObjectId(authResult.user.id);
      application.approvedAt = new Date();
      // Do not persist document verification snapshot on the application.
      // Documents remain the source of truth in the `Document` collection.
      
      // Add to status history
      application.statusHistory = application.statusHistory || [];
      const approvalReasonParts = ['Approved by station manager - all verifications complete'];
      if (months && months > 0) approvalReasonParts.push(`expiry: ${months} months`);
      if (deposit !== undefined) approvalReasonParts.push(`securityDeposit: ${deposit}`);

      application.statusHistory.push({
        status: 'APPROVED',
        changedBy: new mongoose.Types.ObjectId(authResult.user.id),
        changedAt: new Date(),
        reason: approvalReasonParts.join(' | '),
      });

      // Set license issuance and expiry
      application.licenseIssuedAt = new Date();
      if (months && months > 0) {
        const expires = new Date();
        expires.setMonth(expires.getMonth() + months);
        application.licenseExpiresAt = expires;
      }

      // Apply final security deposit if provided
      if (deposit !== undefined) {
        application.finalSecurityDeposit = Number(deposit);
      }

      // Ensure there's a license number
      if (!application.licenseNumber) {
        application.licenseNumber = `LIC-${Date.now()}-${String(application._id).slice(-6)}`;
      }

      // Send notification to vendor
      try {
        await createApplicationStatusNotification(
          // notify the user (application.vendorId holds User._id)
          vendorUserId || application.vendorId,
          'APPROVED',
          application._id.toString(),
          `Your application has been approved! License expires on ${application.licenseExpiresAt ? application.licenseExpiresAt.toDateString() : 'N/A'}. Proceed with payment and agreement signing.`
        );
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }

      // Save application before creating related records
      await application.save();

      // After approval, create agreement and initial payment records
      try {
        // Determine safe values for shopId and stationId
        const safeStationId = application.stationId;
        const safeShopId = application.shopId || String(application._id).slice(-6);
        
        if (!safeStationId) {
          console.error('❌ Cannot create agreement: missing stationId for application', application._id);
          throw new Error('Missing stationId - agreement creation failed');
        }

        // Determine agreement dates
        const startDate = application.licenseIssuedAt || new Date();
        const endDate = application.licenseExpiresAt || ((): Date => {
          const d = new Date(startDate);
          d.setMonth(d.getMonth() + months);
          return d;
        })();

        const monthlyRent = application.finalAgreedRent || application.quotedRent || 0;
        const securityDepositAmount = application.finalSecurityDeposit || application.securityDeposit || 0;
        const duration = months || 12;

        // Check if agreement already exists
        let agreement = await VendorAgreement.findOne({ applicationId: application._id });
        
        if (!agreement) {
          // Get station code for friendly agreement number
          let stationCode = 'UNK';
          try {
            const station = await Station.findById(application.stationId);
            if (station?.stationCode) stationCode = station.stationCode;
          } catch (e) {
            console.warn('Could not fetch station code:', e);
          }

          const agreementNumber = `AGR-${stationCode}-${new Date().getFullYear()}-${String(application._id).slice(-6)}`;

          agreement = await VendorAgreement.create({
            vendorId: application.vendorId,
            applicationId: application._id,
            stationId: safeStationId,
            shopId: safeShopId,
            agreementNumber,
            startDate,
            endDate,
            duration,
            monthlyRent,
            securityDeposit: securityDepositAmount,
            securityDepositPaid: false,
            status: 'ACTIVE',
            licenseNumber: application.licenseNumber || `LIC-${Date.now()}`,
            licenseExpiryDate: endDate,
            createdBy: new mongoose.Types.ObjectId(authResult.user.id),
            approvedBy: new mongoose.Types.ObjectId(authResult.user.id),
            approvedAt: new Date(),
          });
          
          console.log('✅ Created agreement:', agreement.agreementNumber);
        } else {
          console.log('ℹ️ Agreement already exists:', agreement.agreementNumber);
        }

        // Create License document with QR code
        let license = await License.findOne({ applicationId: application._id });
        
        if (!license) {
          console.log('📄 Creating License document with QR code...');
          
          // Generate QR code for license (simple license number for easy scanning)
          let qrCodeData = '';
          let qrCodeUrl = '';
          
          try {
            const qrResult = await generateLicenseQRCode(application.licenseNumber!);
            qrCodeData = qrResult.qrCodeData;
            qrCodeUrl = qrResult.qrCodeUrl;
            console.log('✅ QR code generated successfully');
          } catch (qrError) {
            console.error('⚠️ Failed to generate QR code:', qrError);
            // Continue without QR code - it can be regenerated later
          }
          
          // Get station details
          let stationCode = 'UNK';
          let stationName = 'N/A';
          try {
            const station = await Station.findById(application.stationId);
            if (station?.stationCode) stationCode = station.stationCode;
            if (station?.stationName) stationName = station.stationName;
          } catch (e) {
            console.warn('Could not fetch station details:', e);
          }
          
          // Get vendor details for emergency contact  
          let emergencyContact = '';
          let vendorName = 'N/A';
          try {
            const vendorUser = await User.findById(application.vendorId);
            if (vendorUser?.phone) emergencyContact = vendorUser.phone;
            if (vendorUser?.fullName) vendorName = vendorUser.fullName;
            else if (vendorUser?.name) vendorName = vendorUser.name;
          } catch (e) {
            console.warn('Could not fetch vendor contact:', e);
          }
          
          license = await License.create({
            vendorId: application.vendorId,
            applicationId: application._id,
            licenseNumber: application.licenseNumber,
            status: 'ACTIVE',
            issuedAt: startDate,
            expiresAt: endDate,
            qrCodeUrl,
            qrCodeData,
            shopId: safeShopId,
            shopName: application.shopName || `Shop ${safeShopId}`,
            shopDescription: application.businessPlan || '',
            stationId: application.stationId,
            platformId: application.platformId,
            monthlyRent,
            securityDeposit: securityDepositAmount,
            proposedRent: application.quotedRent,
            agreedRent: monthlyRent,
            approvedBy: new mongoose.Types.ObjectId(authResult.user.id),
            approvedAt: new Date(),
            licenseType: 'PERMANENT',
            validityPeriod: duration,
            renewalEligible: true,
            renewalDate: endDate,
            qrCodeMetadata: {
              vendorId: String(application.vendorId),
              stallId: safeShopId,
              stationId: String(application.stationId),
              stationCode,
              validFrom: startDate,
              validUntil: endDate,
              licenseType: 'PERMANENT',
              emergencyContact,
              generatedAt: new Date(),
              dataFormat: 'LICENSE_NUMBER_ONLY'
            },
            complianceStatus: 'COMPLIANT',
          });
          
          console.log('✅ Created License:', license.licenseNumber);
        } else {
          console.log('ℹ️ License already exists:', license.licenseNumber);
          
          // If license exists but no QR code, generate it
          if (!license.qrCodeUrl && !license.qrCodeData) {
            try {
              console.log('📄 Generating missing QR code for existing license...');
              const qrResult = await generateLicenseQRCode(license.licenseNumber);
              license.qrCodeData = qrResult.qrCodeData;
              license.qrCodeUrl = qrResult.qrCodeUrl;
              
              // Update metadata
              license.qrCodeMetadata = {
                ...license.qrCodeMetadata,
                generatedAt: new Date(),
                dataFormat: 'LICENSE_NUMBER_ONLY'
              };
              
              await license.save();
              console.log('✅ QR code added to existing license');
            } catch (qrError) {
              console.error('⚠️ Failed to generate QR code for existing license:', qrError);
            }
          }
        }

        // Create security deposit payment if needed
        if (securityDepositAmount > 0) {
          const depExists = await VendorPayment.findOne({ 
            applicationId: application._id, 
            paymentType: 'SECURITY_DEPOSIT' 
          });
          
          if (!depExists) {
            await VendorPayment.create({
              vendorId: application.vendorId,
              applicationId: application._id,
              stationId: safeStationId,
              shopId: safeShopId,
              paymentType: 'SECURITY_DEPOSIT',
              dueDate: new Date(),
              amount: securityDepositAmount,
              paidAmount: 0,
              balanceAmount: securityDepositAmount,
              status: 'PENDING',
              createdBy: new mongoose.Types.ObjectId(authResult.user.id),
            });
            console.log('✅ Created security deposit payment');
          }
        }

        // Create first month rent payment
        const rentExists = await VendorPayment.findOne({ 
          applicationId: application._id, 
          paymentType: 'RENT' 
        });
        
        if (!rentExists) {
          const rentDueDate = application.licenseIssuedAt || new Date();
          const billingMonth = `${rentDueDate.getFullYear()}-${String(rentDueDate.getMonth() + 1).padStart(2, '0')}`;
          
          await VendorPayment.create({
            vendorId: application.vendorId,
            applicationId: application._id,
            stationId: safeStationId,
            shopId: safeShopId,
            paymentType: 'RENT',
            dueDate: rentDueDate,
            amount: monthlyRent,
            paidAmount: 0,
            balanceAmount: monthlyRent,
            status: monthlyRent > 0 ? 'PENDING' : 'PAID',
            billingMonth,
            billingYear: rentDueDate.getFullYear(),
            createdBy: new mongoose.Types.ObjectId(authResult.user.id),
          });
          console.log('✅ Created rent payment');
        }

        // Update StationLayout visual representation (single source of truth)
        try {
          const layout = await StationLayout.findOne({ stationId: application.stationId });
          if (layout && Array.isArray(layout.platforms)) {
            let layoutChanged = false;
            
            platformLoop: for (const plat of layout.platforms) {
              if (!Array.isArray(plat.shops)) continue;
              
              for (const shop of plat.shops) {
                // Build list of possible shop identifiers
                const shopIdentifiers = [
                  shop._id && String(shop._id),
                  shop.id && String(shop.id),
                  shop.shopId && String(shop.shopId),
                  shop.shopNumber && String(shop.shopNumber),
                ].filter(Boolean);
                
                if (shopIdentifiers.includes(String(safeShopId))) {
                  shop.isAllocated = true;
                  shop.vendorId = String(application.vendorId);
                  shop.rent = monthlyRent;
                  shop.shopName = application.shopName || '';
                  shop.leaseEndDate = endDate;
                  layoutChanged = true;
                  console.log(`✅ Allocated shop ${safeShopId} to vendor ${application.vendorId}`);
                  break platformLoop;
                }
              }
            }
            
            if (layoutChanged) {
              await layout.save();
              console.log('✅ Updated StationLayout allocation - this is the single source of truth');
            } else {
              console.warn('⚠️ Shop not found in StationLayout. ShopId:', safeShopId);
            }
          } else {
            console.warn('⚠️ StationLayout not found for stationId:', application.stationId);
          }
        } catch (e) {
          console.error('❌ Failed to update StationLayout:', e);
        }

      } catch (e) {
        console.error('❌ CRITICAL: Failed to create agreement/payments after approval:', e);
        // Don't fail the entire approval, but log prominently
        return NextResponse.json({
          success: true,
          warning: 'Application approved but agreement/payment setup encountered errors. Please check manually.',
          application,
          error: e instanceof Error ? e.message : 'Unknown error'
        }, { status: 200 });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Application approved successfully`,
        application 
      });

    } else if (action === 'REJECTED') {
      if (!rejectionReason) {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
      }
      
      application.status = 'REJECTED';
      application.rejectedBy = new mongoose.Types.ObjectId(authResult.user.id);
      application.rejectedAt = new Date();
      application.rejectionReason = rejectionReason;
      
      // Add to status history
      application.statusHistory = application.statusHistory || [];
      application.statusHistory.push({
        status: 'REJECTED',
        changedBy: new mongoose.Types.ObjectId(authResult.user.id),
        changedAt: new Date(),
        reason: rejectionReason,
      });

      // Send notification to vendor
      try {
        await createApplicationStatusNotification(
          application.vendorId,
          'REJECTED',
          application._id.toString(),
          rejectionReason
        );
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }
      
      await application.save();
      
      return NextResponse.json({ 
        success: true, 
        message: `Application rejected`,
        application 
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing application:', error);
    return NextResponse.json({ 
      error: 'Failed to process application',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
