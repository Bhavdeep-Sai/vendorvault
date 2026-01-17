import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAuthUser } from '@/middleware/auth';
import ShopApplication from '@/models/ShopApplication';
import License from '@/models/License';
import Vendor from '@/models/Vendor';
import User from '@/models/User';
import Station from '@/models/Station';
import Platform from '@/models/Platform';

// GET /api/vendor/applications - Get vendor applications with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = parseInt(searchParams.get('skip') || '0');

    // Get vendor profile
    const vendor = await Vendor.findOne({ userId: user.userId }).lean();
    if (!vendor) {
      return NextResponse.json({ applications: [], total: 0 });
    }

    // Build filter query
    const filter: any = { vendorId: vendor.userId || vendor._id };
    
    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { 'stationName': { $regex: search, $options: 'i' } },
        { 'shopId': { $regex: search, $options: 'i' } },
        { 'businessType': { $regex: search, $options: 'i' } }
      ];
    }

    // Get applications with pagination
    console.debug('Fetching vendor applications with filter:', filter, 'limit:', limit, 'skip:', skip);
    const applications = await ShopApplication.find(filter)
      .populate('stationId', 'name location')
      .populate('platformId', 'name')
      .sort({ submittedAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await ShopApplication.countDocuments(filter);
    console.debug('Vendor applications fetched:', applications.length, 'total:', total);

    // Compute shop count for vendor (approved/active licenses)
    const vendorIdCandidates = [vendor._id];
    if (vendor.userId) vendorIdCandidates.push(vendor.userId);
    const shopCount = await License.countDocuments({ vendorId: { $in: vendorIdCandidates }, status: { $in: ['APPROVED', 'ACTIVE', 'LICENSED'] } });

    // Add negotiation status and linked license for each application
    const applicationsWithExtras = await Promise.all(
      applications.map(async (app) => {
        // Check if negotiation room exists
        const NegotiationRoom = (await import('@/models/NegotiationRoom')).default;
        const negotiationRoom = await NegotiationRoom.findOne({ applicationId: app._id });

        // Find linked license (if any)
        const license = await License.findOne({ applicationId: app._id }).lean();

        return {
          ...app,
          hasNegotiation: !!negotiationRoom,
          negotiationId: negotiationRoom?._id,
          license: license ? {
            _id: license._id,
            licenseNumber: license.licenseNumber,
            status: license.status,
            issuedAt: license.issuedAt,
            expiresAt: license.expiresAt,
            qrCodeUrl: license.qrCodeUrl,
            qrCodeData: license.qrCodeData,
            monthlyRent: license.monthlyRent,
            shopId: license.shopId,
          } : null,
        };
      })
    );

    return NextResponse.json({
      applications: applicationsWithExtras,
      total,
      shopCount,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

// POST /api/vendor/applications - Create new application
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get vendor profile
    const vendor = await Vendor.findOne({ userId: user.userId }).lean();
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      shopId,
      stationId,
      platformId,
      quotedRent,
      securityDeposit,
      proposedStartDate,
      proposedEndDate,
      businessPlan,
      specialRequests,
    } = body;

    // Validate required fields
    if (!shopId || !stationId || !quotedRent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if application already exists for this vendor-shop combination
    const vendorIdToUse = vendor.userId || vendor._id;
    const existingApplication = await ShopApplication.findOne({
      vendorId: vendorIdToUse,
      shopId,
      status: { $nin: ['REJECTED', 'TERMINATED', 'EXPIRED'] }
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: 'Application already exists for this shop' },
        { status: 409 }
      );
    }

    // Get station and platform details for application
    const station = await Station.findById(stationId).lean();
    const platform = platformId ? await Platform.findById(platformId).lean() : null;

    // Create new application
    const application = new ShopApplication({
      vendorId: vendor.userId || vendor._id,
      shopId,
      stationId,
      platformId,
      stationName: station?.stationName || 'Unknown Station',
      platformName: platform?.platformName || 'Unknown Platform',
      quotedRent,
      securityDeposit,
      proposedStartDate: new Date(proposedStartDate),
      proposedEndDate: new Date(proposedEndDate),
      businessPlan,
      specialRequests,
      status: 'SUBMITTED',
      submittedAt: new Date(),
      businessType: vendor.businessType || 'General',
    });

    await application.save();

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application,
    });
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    );
  }
}
