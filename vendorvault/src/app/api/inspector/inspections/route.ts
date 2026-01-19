import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import License from '@/models/License';
import { getPaginationParams, createPaginationResult } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'INSPECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { skip, limit, page } = getPaginationParams(searchParams);
    const complianceFilter = searchParams.get('compliance') || 'all';
    const search = searchParams.get('search') || '';

    await connectDB();

    const query: Record<string, unknown> = {
      status: 'APPROVED',
      inspectionLogs: { $exists: true, $ne: [] },
      'inspectionLogs.inspectorId': user.userId, // Only show inspections by this inspector
    };

    if (complianceFilter !== 'all') {
      query.complianceStatus = complianceFilter;
    }

    if (search) {
      query.$or = [
        { licenseNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [inspections, totalCount] = await Promise.all([
      License.find(query)
        .populate('vendorId', 'businessName ownerName email stationName businessType')
        .sort({ lastInspectionDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      License.countDocuments(query),
    ]);

    const formattedInspections = inspections.map((license) => {
      const lastInspection = license.inspectionLogs?.[license.inspectionLogs.length - 1];
      return {
        _id: license._id,
        licenseNumber: license.licenseNumber,
        vendor: license.vendorId,
        complianceStatus: license.complianceStatus,
        lastInspectionDate: license.lastInspectionDate,
        totalInspections: license.inspectionLogs?.length || 0,
        lastInspection,
      };
    });

    return NextResponse.json(
      createPaginationResult(formattedInspections, totalCount, page, limit)
    );
  } catch (error) {
    console.error('Error fetching inspections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inspections' },
      { status: 500 }
    );
  }
}
