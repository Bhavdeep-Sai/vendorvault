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
import { verifyAuthToken } from '@/middleware/auth';
import { createApplicationStatusNotification } from '@/lib/notifications';

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
      const months = parseInt(String(expiryMonths || '0'), 10);
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
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await application.save();

    // After approval, create agreement and initial payment records (best-effort)
    try {
      // Avoid creating duplicates if an agreement already exists for this application
      let existingAgreement = await VendorAgreement.findOne({ applicationId: application._id });
      let agreementCreated = false;
      if (!existingAgreement) {
        // Ensure required fields exist, provide conservative fallbacks to avoid validation errors
        const safeStationId = application.stationId || null;
        const safeShopId = application.shopId || application.shopNumber || String(application._id).slice(-6);
        if (!safeStationId) {
          console.warn('Skipping agreement creation: missing stationId for application', application._id);
        } else {
        // Determine agreement dates
        const startDate = application.licenseIssuedAt || new Date();
        const endDate = application.licenseExpiresAt || ((): Date => {
          const d = new Date(startDate);
          d.setMonth(d.getMonth() + (months && months > 0 ? months : 12));
          return d;
        })();

        // Get station code for friendly agreement number (best-effort)
        let stationCode = 'UNK';
        try {
          const station = await Station.findById(application.stationId).select('stationCode').lean();
          if (station?.stationCode) stationCode = station.stationCode;
        } catch (e) {}

        const agreementNumber = `AGR-${stationCode}-${new Date().getFullYear()}-${String(application._id).slice(-6)}`;

        const monthlyRent = application.finalAgreedRent || application.quotedRent || 0;
        const securityDeposit = application.finalSecurityDeposit || application.securityDeposit || 0;
        const duration = months && months > 0 ? months : 12;

          const agreement = await VendorAgreement.create({
            vendorId: application.vendorId,
            applicationId: application._id,
            stationId: safeStationId,
            shopId: safeShopId,
            agreementNumber,
            startDate,
            endDate,
            duration,
            monthlyRent,
            securityDeposit,
            securityDepositPaid: false,
            status: 'ACTIVE',
            licenseNumber: application.licenseNumber || application.licenseNumber,
            licenseExpiryDate: endDate,
            createdBy: new mongoose.Types.ObjectId(authResult.user.id),
            approvedBy: new mongoose.Types.ObjectId(authResult.user.id),
            approvedAt: new Date(),
        });

            // Create payment for security deposit (due immediately)
          agreementCreated = true;
          existingAgreement = agreement;
        }

        // Use the canonical agreement (existing or newly created) for subsequent updates
        const agr = existingAgreement;

        // Create or ensure payments exist (idempotent)
        try {
          // Security deposit payment
          if ((agr.securityDeposit || application.finalSecurityDeposit || application.securityDeposit || 0) > 0) {
            const depExists = await VendorPayment.findOne({ applicationId: application._id, paymentType: 'SECURITY_DEPOSIT' });
            if (!depExists) {
              await VendorPayment.create({
                vendorId: application.vendorId,
                applicationId: application._id,
                stationId: safeStationId,
                shopId: agr.shopId || safeShopId,
                paymentType: 'SECURITY_DEPOSIT',
                dueDate: new Date(),
                amount: agr.securityDeposit || application.finalSecurityDeposit || application.securityDeposit || 0,
                paidAmount: 0,
                balanceAmount: agr.securityDeposit || application.finalSecurityDeposit || application.securityDeposit || 0,
                status: 'PENDING',
                createdBy: new mongoose.Types.ObjectId(authResult.user.id),
              });
            }
          }

          // Rent payment (first month) - ensure billingMonth/billingYear set so analytics can pick it up
          const rentExists = await VendorPayment.findOne({ applicationId: application._id, paymentType: 'RENT' });
          if (!rentExists) {
            const rentDueDate = application.licenseIssuedAt || new Date();
            const billingMonth = `${rentDueDate.getFullYear()}-${String(rentDueDate.getMonth() + 1).padStart(2, '0')}`;
            await VendorPayment.create({
              vendorId: application.vendorId,
              applicationId: application._id,
              stationId: safeStationId,
              shopId: agr.shopId || safeShopId,
              paymentType: 'RENT',
              dueDate: rentDueDate,
              amount: agr.monthlyRent || application.finalAgreedRent || application.quotedRent || 0,
              paidAmount: 0,
              balanceAmount: agr.monthlyRent || application.finalAgreedRent || application.quotedRent || 0,
              status: agr.monthlyRent > 0 ? 'PENDING' : 'PAID',
              billingMonth,
              billingYear: rentDueDate.getFullYear(),
              createdBy: new mongoose.Types.ObjectId(authResult.user.id),
            });
          }
        } catch (e) {
          console.error('Failed to ensure payments for application', application._id, e);
        }

        // Update Platform/Shop occupancy status
        try {
          // platform shops store shopNumber which may equal application.shopId
          const Platform = (await import('@/models/Platform')).default;
          // Try multiple strategies to find the platform/shop:
          // 1) Match shops._id by ObjectId
          // 2) Match shops.shopNumber by string
          // 3) Fallback to matching shops.shopNumber loosely
          let platform: any = null;
                try {
                  platform = await Platform.findOne({ stationId: application.stationId, 'shops._id': new mongoose.Types.ObjectId(String(application.shopId)) });
                } catch (e) {
                  // ignore invalid ObjectId
                }
                if (!platform) {
                  platform = await Platform.findOne({ stationId: application.stationId, 'shops.shopNumber': String(application.shopId) });
                }
                if (!platform) {
                  platform = await Platform.findOne({ stationId: application.stationId, 'shops.shopNumber': application.shopId });
                }
          if (platform) {
            // find the shop entry and update using agr.shopId fallback
            const matchId = agr && agr.shopId ? String(agr.shopId) : String(application.shopId || safeShopId);
            const idx = platform.shops.findIndex((s: any) => String(s._id) === matchId || String(s.shopNumber) === matchId || String(s.shopId) === matchId || String(s.id) === matchId);
            if (idx !== -1) {
              platform.shops[idx].status = 'OCCUPIED';
              platform.shops[idx].vendorId = application.vendorId;
              platform.shops[idx].vendorName = undefined;
              platform.shops[idx].occupiedSince = application.licenseIssuedAt || new Date();
              platform.shops[idx].leaseEndDate = application.licenseExpiresAt || null;
              platform.updateShopCounts();
              await platform.save();
            }
          }
        } catch (e) {
          console.error('Failed to update platform/shop occupancy for application', application._id, e);
        }

        // Also update StationLayout (visual layout) to mark the shop zone as allocated
        try {
          const layout = await StationLayout.findOne({ stationId: application.stationId });
          if (layout && Array.isArray(layout.platforms)) {
            let layoutChanged = false;
            for (const plat of layout.platforms) {
              if (!Array.isArray(plat.shops)) continue;
              for (const s of plat.shops) {
                const candidates = [];
                if (s._id) candidates.push(String(s._id));
                if (s.id) candidates.push(String(s.id));
                if (s.shopId) candidates.push(String(s.shopId));
                if (s.shopNumber) candidates.push(String(s.shopNumber));
                if (candidates.includes(String(safeShopId))) {
                  // mark allocated until agreement endDate
                  s.isAllocated = true;
                  s.vendorId = String(application.vendorId);
                  s.rent = monthlyRent || s.rent;
                  s.shopName = s.shopName || application.shopName || application.businessName || '';
                  // store lease end date for future un-allocation tasks
                  try {
                    s.leaseEndDate = endDate;
                  } catch (ee) {}
                  layoutChanged = true;
                  break;
                }
              }
              if (layoutChanged) break;
            }
            if (layoutChanged) {
              await layout.save();
              console.log('Updated StationLayout allocation for application', application._id.toString());
            }
          }
        } catch (e) {
          console.error('Failed to update StationLayout for application', application._id, e);
        }
      }
    } catch (e) {
      console.error('Failed to create agreement/payments after approval for application', application._id, e);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Application ${action.toLowerCase()} successfully`,
      application 
    });

  } catch (error) {
    console.error('Error processing application:', error);
    return NextResponse.json({ 
      error: 'Failed to process application',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
