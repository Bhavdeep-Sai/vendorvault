import { NextRequest, NextResponse } from 'next/server';
import User from '@/models/User';
import Station from '@/models/Station';
import Vendor from '@/models/Vendor';
import License from '@/models/License';
import ReferenceStation from '@/models/ReferenceStation';
import Platform from '@/models/Platform';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verify user is railway admin
    const user = await verifyToken(request);
    if (!user || user.role !== 'RAILWAY_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Optimize stats with aggregation pipelines
    const [userStats, stationStats, licenseStats, otherStats] = await Promise.all([
      // User stats aggregation
      User.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            byRole: [
              { $group: { _id: '$role', count: { $sum: 1 } } }
            ],
            stationManagersByStatus: [
              { $match: { role: 'STATION_MANAGER' } },
              { $group: { _id: '$status', count: { $sum: 1 } } }
            ],
            adminsByStatus: [
              { $match: { role: 'RAILWAY_ADMIN' } },
              { $group: { _id: '$status', count: { $sum: 1 } } }
            ],
            pendingDocs: [
              { $match: { status: 'PENDING', documents: { $exists: true, $ne: {} } } },
              { $count: 'count' }
            ]
          }
        }
      ]),
      // Station stats aggregation
      Station.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            byStatus: [
              { $group: { _id: '$approvalStatus', count: { $sum: 1 } } }
            ]
          }
        }
      ]),
      // License stats aggregation
      License.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            byStatus: [
              { $group: { _id: '$status', count: { $sum: 1 } } }
            ]
          }
        }
      ]),
      // Other counts
      Promise.all([
        Vendor.countDocuments().lean(),
        ReferenceStation.countDocuments().lean(),
        Platform.countDocuments().lean()
      ])
    ]);

    // Extract values from aggregation results
    const totalUsers = userStats[0]?.total[0]?.count || 0;
    const roleMap = new Map(userStats[0]?.byRole.map((r: any) => [r._id, r.count]));
    const smStatusMap = new Map(userStats[0]?.stationManagersByStatus.map((s: any) => [s._id, s.count]));
    const adminStatusMap = new Map(userStats[0]?.adminsByStatus.map((s: any) => [s._id, s.count]));
    const pendingDocuments = userStats[0]?.pendingDocs[0]?.count || 0;

    const totalStations = stationStats[0]?.total[0]?.count || 0;
    const stationStatusMap = new Map(stationStats[0]?.byStatus.map((s: any) => [s._id, s.count]));

    const totalLicenses = licenseStats[0]?.total[0]?.count || 0;
    const licenseStatusMap = new Map(licenseStats[0]?.byStatus.map((s: any) => [s._id, s.count]));

    const [totalVendors, totalReferenceStations, totalPlatforms] = otherStats;

    return NextResponse.json({
      stats: {
        totalUsers,
        totalStationManagers: roleMap.get('STATION_MANAGER') || 0,
        pendingStationManagers: smStatusMap.get('PENDING') || 0,
        approvedStationManagers: smStatusMap.get('ACTIVE') || 0,
        totalAdmins: roleMap.get('RAILWAY_ADMIN') || 0,
        activeAdmins: adminStatusMap.get('ACTIVE') || 0,
        totalInspectors: roleMap.get('INSPECTOR') || 0,
        totalVendors,
        totalStations,
        activeStations: stationStatusMap.get('APPROVED') || 0,
        pendingStations: stationStatusMap.get('PENDING') || 0,
        totalReferenceStations,
        totalPlatforms,
        totalLicenses,
        approvedLicenses: licenseStatusMap.get('APPROVED') || 0,
        pendingLicenses: licenseStatusMap.get('PENDING') || 0,
        pendingDocuments
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Fetch stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}