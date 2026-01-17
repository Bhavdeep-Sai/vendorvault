import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import VendorAgreement from '@/models/VendorAgreement';
import VendorPayment from '@/models/VendorPayment';
import ShopApplication from '@/models/ShopApplication';
import Station from '@/models/Station';
import mongoose from 'mongoose';
import { verifyAuthToken } from '@/middleware/auth';

// GET: Fetch all agreements for station manager's station
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || authResult.user?.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const expiringOnly = searchParams.get('expiring') === 'true';

    const station = await Station.findOne({ stationManagerId: authResult.user.id });
    if (!station) {
      return NextResponse.json({ error: 'Station not assigned' }, { status: 400 });
    }

    const query: Record<string, unknown> = { stationId: station._id };
    if (status) query.status = status;

    // Filter for expiring agreements (within 30 days)
    if (expiringOnly) {
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      query.endDate = { $gte: now, $lte: thirtyDaysLater };
      query.status = 'ACTIVE';
    }
    
    // Debug logging
    console.log('📄 Agreements Query:', {
      stationName: station.stationName,
      stationId: station._id.toString(),
      query: JSON.stringify(query),
    });

    let agreements = await VendorAgreement.find(query)
      .populate('vendorId', 'fullName email contactNumber')
      .populate('applicationId', 'shopId')
      .sort({ endDate: 1 })
      .lean();

    // Enrich vendor/application info when populate missed due to inconsistent refs
    const VendorModel = (await import('@/models/Vendor')).default;
    const ShopApplicationModel = (await import('@/models/ShopApplication')).default;

    agreements = await Promise.all(agreements.map(async (a: any) => {
      const out = { ...a };

      if (!out.vendorId || !out.vendorId.fullName) {
        try {
          const v = await VendorModel.findById(out.vendorId).lean();
          if (v) {
            out.vendor = {
              _id: v._id,
              fullName: v.businessName || v.ownerName || 'Vendor',
              email: v.email || null,
              contactNumber: v.contactNumber || null,
            };
          } else {
            const user = await (await import('@/models/User')).default.findById(out.vendorId).select('fullName email phone').lean();
            if (user) {
              out.vendor = {
                _id: user._id,
                fullName: user.fullName || user.name || 'Vendor',
                email: user.email || null,
                contactNumber: user.phone || null,
              };
            }
          }
        } catch (e) {}
      } else {
        out.vendor = out.vendorId;
      }

      if (!out.applicationId || !out.applicationId.shopId) {
        try {
          const app = await ShopApplicationModel.findById(out.applicationId).select('shopId licenseNumber').lean();
          if (app) out.application = app;
        } catch (e) {}
      } else {
        out.application = out.applicationId;
      }

      out.startDate = out.startDate ? new Date(out.startDate).toISOString() : null;
      out.endDate = out.endDate ? new Date(out.endDate).toISOString() : null;
      return out;
    }));

    console.log('📋 Agreements Result:', { found: agreements.length });

    return NextResponse.json({ 
      success: true, 
      agreements,
      count: agreements.length 
    });

  } catch (error) {
    console.error('Error fetching agreements:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch agreements',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// POST: Create a new agreement
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || authResult.user?.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    const station = await Station.findOne({ stationManagerId: authResult.user.id });
    if (!station) {
      return NextResponse.json({ error: 'Station not assigned' }, { status: 400 });
    }

    const application = await ShopApplication.findById(applicationId);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.status !== 'APPROVED' && application.status !== 'ACTIVE') {
      return NextResponse.json({ 
        error: 'Only approved applications can have agreements' 
      }, { status: 400 });
    }

    // Check if agreement already exists
    const existingAgreement = await VendorAgreement.findOne({ 
      applicationId,
      status: { $in: ['ACTIVE', 'DRAFT'] }
    });

    if (existingAgreement) {
      return NextResponse.json({ 
        error: 'Active agreement already exists for this application' 
      }, { status: 400 });
    }

    // Generate agreement number
    const agreementCount = await VendorAgreement.countDocuments();
    const agreementNumber = `AGR-${station.stationCode || 'STN'}-${new Date().getFullYear()}-${(agreementCount + 1).toString().padStart(5, '0')}`;

    const duration = application.proposedEndDate && application.proposedStartDate
      ? Math.ceil((application.proposedEndDate.getTime() - application.proposedStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 12;

    const newAgreement = new VendorAgreement({
      vendorId: application.vendorId,
      applicationId: application._id,
      stationId: station._id,
      shopId: application.shopId,
      agreementNumber,
      startDate: application.proposedStartDate || new Date(),
      endDate: application.proposedEndDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      duration,
      monthlyRent: application.finalAgreedRent || application.quotedRent,
      securityDeposit: application.finalSecurityDeposit || application.securityDeposit,
      licenseNumber: application.licenseNumber || '',
      licenseExpiryDate: application.licenseExpiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'DRAFT',
      createdBy: new mongoose.Types.ObjectId(authResult.user.id),
    });

    await newAgreement.save();

    // Create initial payment records: security deposit and first month's rent
    const paymentsCreated: any[] = [];
    try {
      // Security deposit
      if (newAgreement.securityDeposit && newAgreement.securityDeposit > 0) {
        const sd = new VendorPayment({
          vendorId: newAgreement.vendorId,
          applicationId: newAgreement.applicationId,
          stationId: newAgreement.stationId,
          shopId: newAgreement.shopId,
          paymentType: 'SECURITY_DEPOSIT',
          dueDate: new Date(),
          amount: newAgreement.securityDeposit,
          paidAmount: 0,
          billingMonth: null,
          billingYear: null,
          payments: [],
          createdBy: new mongoose.Types.ObjectId(authResult.user.id),
        });
        await sd.save();
        paymentsCreated.push(sd);
      }

      // First month's rent (bill for start month)
      if (newAgreement.monthlyRent && newAgreement.monthlyRent > 0) {
        const start = newAgreement.startDate || new Date();
        const billingMonth = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
        const rent = new VendorPayment({
          vendorId: newAgreement.vendorId,
          applicationId: newAgreement.applicationId,
          stationId: newAgreement.stationId,
          shopId: newAgreement.shopId,
          paymentType: 'RENT',
          dueDate: start,
          amount: newAgreement.monthlyRent,
          paidAmount: 0,
          billingMonth,
          billingYear: start.getFullYear(),
          payments: [],
          createdBy: new mongoose.Types.ObjectId(authResult.user.id),
        });
        await rent.save();
        paymentsCreated.push(rent);
      }
    } catch (err) {
      console.error('Failed to create initial payments for agreement:', err);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Agreement created successfully',
      agreement: newAgreement,
      payments: paymentsCreated,
    });

  } catch (error) {
    console.error('Error creating agreement:', error);
    return NextResponse.json({ 
      error: 'Failed to create agreement',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// PUT: Update agreement (activate, terminate, etc.)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || authResult.user?.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { agreementId, action, reason } = body;

    if (!agreementId || !action) {
      return NextResponse.json({ 
        error: 'Agreement ID and action are required' 
      }, { status: 400 });
    }

    const agreement = await VendorAgreement.findById(agreementId);
    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    switch (action) {
      case 'ACTIVATE':
        agreement.status = 'ACTIVE';
        agreement.approvedBy = new mongoose.Types.ObjectId(authResult.user.id);
        agreement.approvedAt = new Date();
        break;

      case 'TERMINATE':
        if (!reason) {
          return NextResponse.json({ error: 'Termination reason is required' }, { status: 400 });
        }
        agreement.status = 'TERMINATED';
        agreement.terminatedDate = new Date();
        agreement.terminatedBy = new mongoose.Types.ObjectId(authResult.user.id);
        agreement.terminationReason = reason;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await agreement.save();

    return NextResponse.json({ 
      success: true, 
      message: `Agreement ${action.toLowerCase()}d successfully`,
      agreement 
    });

  } catch (error) {
    console.error('Error updating agreement:', error);
    return NextResponse.json({ 
      error: 'Failed to update agreement',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
