import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAuthToken } from '@/middleware/auth';
import ShopApplication from '@/models/ShopApplication';
import Station from '@/models/Station';
import { APPLICATION_STATUS } from '@/lib/constants';

// GET /api/station-manager/applications - Get applications for review
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const authResult = await verifyAuthToken(req);
    if (!authResult.success || authResult.user?.role !== 'STATION_MANAGER') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get station manager's station
    const station = await Station.findOne({ stationManagerId: authResult.user.id });
    if (!station) {
      return NextResponse.json(
        { success: false, message: 'Station not assigned' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const riskLevel = searchParams.get('riskLevel');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const filter: Record<string, unknown> = { stationId: station._id };
    
    if (status) {
      filter.status = status;
    } else {
      // Default to applications that need review (include rejected so history is visible)
      filter.status = { $in: [APPLICATION_STATUS.SUBMITTED, APPLICATION_STATUS.NEGOTIATION, APPLICATION_STATUS.APPROVED, APPLICATION_STATUS.ACTIVE, APPLICATION_STATUS.REJECTED] };
    }
    
    if (riskLevel) {
      filter.riskLevel = riskLevel;
    }
    
    // Debug logging
    console.log('📝 Applications Query:', {
      stationName: station.stationName,
      stationId: station._id.toString(),
      filter: JSON.stringify(filter),
      status,
    });

    let applications = await ShopApplication.find(filter)
      .populate('vendorId', 'name email phone fullName')
      .populate('stationId', 'stationName stationCode')
      .populate('platformId', 'name platformNumber')
      .sort({ 
        riskLevel: 1, // Show low risk first
        createdAt: -1 
      })
      .limit(limit)
      .skip((page - 1) * limit);

    // Ensure verification status shown in the list is up-to-date by
    // computing current verification state for each application's vendor.
    // This keeps the dashboard consistent with the detailed application view.
    applications = await Promise.all(applications.map(async (app) => {
      const appObj: any = app.toObject ? app.toObject() : app;

      try {
        // Resolve vendor's User._id and Vendor._id
        let vendorUserId: any = null;
        let vendorRefId: any = null;

        if (appObj.vendorId) {
          // If vendorId looks like a populated User doc
          if (appObj.vendorId._id && (appObj.vendorId.email || appObj.vendorId.fullName)) {
            vendorUserId = appObj.vendorId._id;
          } else {
            // Try treat appObj.vendorId as User._id or Vendor._id
            const VendorModel = (await import('@/models/Vendor')).default;
            const maybeVendor = await VendorModel.findOne({ userId: appObj.vendorId }).select('_id userId').lean();
            if (maybeVendor) {
              vendorRefId = maybeVendor._id;
              vendorUserId = maybeVendor.userId;
            } else {
              // Maybe vendorId is Vendor._id
              const vv = await VendorModel.findById(appObj.vendorId).select('_id userId').lean();
              if (vv) {
                vendorRefId = vv._id;
                vendorUserId = vv.userId;
              } else {
                // Fallback: treat vendorId as User._id
                vendorUserId = appObj.vendorId._id || appObj.vendorId;
              }
            }
          }
        }

        if (!vendorUserId) return appObj;

        // Determine required docs
        const VendorDocument = (await import('@/models/Document')).default;
        const business = await (await import('@/models/VendorBusiness')).default.findOne({ vendorId: vendorUserId }).lean();
        const requiredDocs: string[] = ['AADHAAR', 'PAN', 'BANK_STATEMENT', 'POLICE_VERIFICATION', 'RAILWAY_DECLARATION'];
        if (business?.businessCategory === 'FOOD') requiredDocs.push('FSSAI');

        const verificationStatus: Record<string, boolean> = {};
        for (const dt of requiredDocs) {
          let ok = false;
          try {
            if (vendorRefId) {
              ok = !!(await VendorDocument.findOne({ vendorId: vendorRefId, type: dt, verified: true }).lean());
            } else {
              // try to find Vendor by userId
              const VendorModel = (await import('@/models/Vendor')).default;
              const v = await VendorModel.findOne({ userId: vendorUserId }).select('_id').lean();
              if (v) ok = !!(await VendorDocument.findOne({ vendorId: v._id, type: dt, verified: true }).lean());
            }
          } catch (e) {
            ok = false;
          }
          verificationStatus[dt] = ok;
        }

        appObj.verificationStatus = {
          allVerified: Object.values(verificationStatus).every(v => v === true),
        };
      } catch (err) {
        console.error('Failed to compute live verification for application', appObj._id, err);
      }

      return appObj;
    }));

    const total = await ShopApplication.countDocuments(filter);
    
    console.log('📊 Applications Result:', {
      found: applications.length,
      total,
      page,
      limit
    });

    return NextResponse.json({
      success: true,
      applications: applications,
      count: total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}