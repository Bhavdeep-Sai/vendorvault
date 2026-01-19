import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import License from '@/models/License';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'INSPECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const [
      totalLicenses,
      compliantCount,
      nonCompliantCount,
      requiresAttentionCount,
      myInspections,
    ] = await Promise.all([
      License.countDocuments({ status: 'APPROVED' }),
      License.countDocuments({ status: 'APPROVED', complianceStatus: 'COMPLIANT' }),
      License.countDocuments({ status: 'APPROVED', complianceStatus: 'NON_COMPLIANT' }),
      License.countDocuments({ status: 'APPROVED', complianceStatus: 'REQUIRES_ATTENTION' }),
      License.countDocuments({
        status: 'APPROVED',
        'inspectionLogs.inspectorId': user._id,
      }),
    ]);

    const recentInspections = await License.find({
      status: 'APPROVED',
      inspectionLogs: { $exists: true, $ne: [] },
    })
      .populate('vendorId', 'businessName ownerName stationName')
      .sort({ lastInspectionDate: -1 })
      .limit(10)
      .lean();

    const stats = {
      totalActiveLicenses: totalLicenses,
      compliantLicenses: compliantCount,
      nonCompliantLicenses: nonCompliantCount,
      requiresAttentionLicenses: requiresAttentionCount,
      myTotalInspections: myInspections,
      recentInspections: recentInspections.map((license) => {
        const lastInspection = license.inspectionLogs?.[license.inspectionLogs.length - 1];
        return {
          licenseNumber: license.licenseNumber,
          businessName: license.vendorId?.businessName,
          stationName: license.vendorId?.stationName,
          complianceStatus: license.complianceStatus,
          lastInspectionDate: license.lastInspectionDate,
          inspectorName: lastInspection?.inspectorName,
        };
      }),
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching inspector stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
