import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import License from "@/models/License";
import ShopApplication from "@/models/ShopApplication";
import Vendor from "@/models/Vendor";
import Station from "@/models/Station";
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

    // Get application IDs for this station
    const applicationIds = await ShopApplication.find({
      stationId: station._id
    }).distinct('_id');

    const [
      approvedLicenses,
      pendingLicenses,
      rejectedLicenses,
      expiredLicenses
    ] = await Promise.all([
      License.countDocuments({ applicationId: { $in: applicationIds }, status: 'APPROVED' }),
      License.countDocuments({ applicationId: { $in: applicationIds }, status: 'PENDING' }),
      License.countDocuments({ applicationId: { $in: applicationIds }, status: 'REJECTED' }),
      License.countDocuments({ applicationId: { $in: applicationIds }, status: 'EXPIRED' })
    ]);

    // Get recent pending applications with vendor details
    const recentApplications = await License.find({
      applicationId: { $in: applicationIds },
      status: 'PENDING'
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Enrich with vendor details
    const enrichedApplications = await Promise.all(
      recentApplications.map(async (license) => {
        const application = await ShopApplication.findById(license.applicationId);
        const vendor = await Vendor.findOne({ userId: application?.vendorId });
        return {
          ...license,
          vendorId: {
            businessName: vendor?.businessName || 'Unknown',
            ownerName: vendor?.ownerName,
            email: vendor?.email,
            contactNumber: vendor?.contactNumber,
          }
        };
      })
    );

    return NextResponse.json({
      stats: {
        totalVendors: totalApplications,
        approvedLicenses,
        pendingLicenses,
        rejectedLicenses,
        expiredLicenses,
        activeLicenses: approvedLicenses
      },
      recentApplications: enrichedApplications,
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
