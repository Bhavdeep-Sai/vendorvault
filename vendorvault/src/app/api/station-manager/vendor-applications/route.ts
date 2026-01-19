import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import License from "@/models/License";
import ShopApplication from "@/models/ShopApplication";
import Vendor from "@/models/Vendor";
import Station from "@/models/Station";
import User from "@/models/User";
import { getAuthUser } from "@/middleware/auth";
import { getPaginationParams, createPaginationResult } from "@/lib/pagination";

// Get all vendor applications for station manager's station
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const { skip, limit, page } = getPaginationParams(request.nextUrl.searchParams);

    // Build query for shop applications at this station
    // Don't filter by ShopApplication.status - we filter by License.status instead
    const applicationQuery: any = {
      stationId: station._id
    };

    // Find all shop applications for this station
    const shopApplications = await ShopApplication.find(applicationQuery)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const totalApplications = await ShopApplication.countDocuments(applicationQuery);

    // Get vendor details and license for each application
    const applications = await Promise.all(
      shopApplications.map(async (app) => {
        // app.vendorId is the Vendor's _id, not User's _id
        const vendor = await Vendor.findById(app.vendorId).lean();
        // Get user details using vendor.userId
        const user = vendor ? await User.findById(vendor.userId).lean() : null;
        const license = await License.findOne({ applicationId: app._id }).lean();

        return {
          _id: license?._id || app._id,
          licenseId: license?._id,
          applicationId: app._id,
          vendor: {
            _id: vendor?._id,
            userId: vendor?.userId,
            businessName: vendor?.businessName || 'Unknown',
            ownerName: vendor?.ownerName || user?.fullName || 'Unknown',
            email: vendor?.email || user?.email || '',
            contactNumber: vendor?.contactNumber || user?.phone || '',
            businessType: vendor?.businessType || 'other',
          },
          license: license ? {
            _id: license._id,
            licenseNumber: license.licenseNumber,
            status: license.status,
            proposedRent: license.proposedRent || app.quotedRent,
            shopId: app.shopId,
            shopWidth: license.shopWidth,
            createdAt: license.createdAt,
          } : {
            status: app.status,
            proposedRent: app.quotedRent,
            shopId: app.shopId,
            createdAt: app.createdAt,
          },
          application: app,
        };
      })
    );

    const pagination = createPaginationResult({
      data: applications,
      total: totalApplications,
      page,
      limit
    });

    return NextResponse.json({
      applications,
      station: {
        name: station.stationName,
        code: station.stationCode
      },
      pagination
    });

  } catch (error) {
    console.error("Error fetching vendor applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
