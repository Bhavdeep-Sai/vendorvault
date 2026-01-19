import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ShopApplication from "@/models/ShopApplication";
import Station from "@/models/Station";
import StationLayout from "@/models/StationLayout";
import VendorAgreement from "@/models/VendorAgreement";
import VendorPayment from "@/models/VendorPayment";
import { getAuthUser } from "@/middleware/auth";

// Get statistics for station manager's station
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

    // Get statistics based on shop applications for this station
    const totalApplications = await ShopApplication.countDocuments({
      stationId: station._id
    });

    // Get counts by application status
    const [
      approvedApplications,
      pendingApplications,
      rejectedApplications,
      activeApplications,
    ] = await Promise.all([
      ShopApplication.countDocuments({ stationId: station._id, status: 'APPROVED' }),
      ShopApplication.countDocuments({ stationId: station._id, status: { $in: ['SUBMITTED', 'NEGOTIATION'] } }),
      ShopApplication.countDocuments({ stationId: station._id, status: 'REJECTED' }),
      ShopApplication.countDocuments({ stationId: station._id, status: 'ACTIVE' }),
    ]);

    // Get platform statistics from StationLayout (source of truth)
    const layout = await StationLayout.findOne({ stationId: station._id }).lean();
    let platformStats = {
      totalPlatforms: 0,
      totalShops: 0,
      occupiedShops: 0,
      availableShops: 0,
    };

    if (layout && layout.platforms) {
      platformStats.totalPlatforms = layout.platforms.length;
      layout.platforms.forEach((platform: any) => {
        const shops = platform.shops || [];
        platformStats.totalShops += shops.length;
        platformStats.occupiedShops += shops.filter((s: any) => s.isAllocated).length;
      });
      platformStats.availableShops = platformStats.totalShops - platformStats.occupiedShops;
    }

    // Get active agreements and payment stats
    const [activeAgreements, pendingPayments, totalRevenue] = await Promise.all([
      VendorAgreement.countDocuments({ stationId: station._id, status: 'ACTIVE' }),
      VendorPayment.countDocuments({ stationId: station._id, status: { $in: ['PENDING', 'OVERDUE'] } }),
      VendorPayment.aggregate([
        { $match: { stationId: station._id, status: 'PAID' } },
        { $group: { _id: null, total: { $sum: '$paidAmount' } } }
      ]).then(result => result[0]?.total || 0),
    ]);

    // Get recent pending applications with vendor details
    const recentApplications = await ShopApplication.find({
      stationId: station._id,
      status: { $in: ['SUBMITTED', 'NEGOTIATION'] }
    })
      .populate('vendorId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return NextResponse.json({
      stats: {
        totalVendors: totalApplications,
        approvedLicenses: approvedApplications,
        pendingLicenses: pendingApplications,
        rejectedLicenses: rejectedApplications,
        activeLicenses: activeApplications,
        activeAgreements,
        pendingPayments,
        totalRevenue,
        ...platformStats,
      },
      recentApplications,
      station: {
        name: station.stationName,
        code: station.stationCode,
        zone: station.railwayZone,
        category: station.stationCategory
      }
    });

  } catch (error) {
    console.error("Error fetching station statistics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
