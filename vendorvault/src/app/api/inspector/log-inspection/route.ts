import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import License from '@/models/License';
import Vendor from '@/models/Vendor';
import User from '@/models/User';

interface InspectionLog {
  inspectorId: string;
  inspectorName: string;
  inspectionDate: Date;
  notes?: string;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'REQUIRES_ATTENTION';
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'INSPECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { licenseNumber, complianceStatus, notes } = await request.json();

    if (!licenseNumber || !complianceStatus) {
      return NextResponse.json(
        { error: 'License number and compliance status are required' },
        { status: 400 }
      );
    }

    if (!['COMPLIANT', 'NON_COMPLIANT', 'REQUIRES_ATTENTION'].includes(complianceStatus)) {
      return NextResponse.json(
        { error: 'Invalid compliance status' },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch the user details to get the name
    const userDetails = await User.findById(user.userId).select('name');
    if (!userDetails) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const license = await License.findOne({ licenseNumber });
    if (!license) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    if (license.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Can only inspect approved licenses' },
        { status: 400 }
      );
    }

    const inspectionLog: InspectionLog = {
      inspectorId: user.userId,
      inspectorName: userDetails.name,
      inspectionDate: new Date(),
      notes: notes || '',
      complianceStatus,
    };

    if (!license.inspectionLogs) {
      license.inspectionLogs = [];
    }
    license.inspectionLogs.push(inspectionLog);
    license.lastInspectionDate = new Date();
    license.complianceStatus = complianceStatus;

    await license.save();

    return NextResponse.json({
      success: true,
      message: 'Inspection logged successfully',
      inspection: inspectionLog,
    });
  } catch (error) {
    console.error('Error logging inspection:', error);
    return NextResponse.json(
      { error: 'Failed to log inspection' },
      { status: 500 }
    );
  }
}
