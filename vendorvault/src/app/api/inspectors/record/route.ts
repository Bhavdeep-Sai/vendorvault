import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAuthToken } from '@/middleware/auth';
import License from '@/models/License';
import InspectorModel from '@/models/Inspector';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request);
    if (!auth.success || !auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const body = await request.json();
    const { licenseId, licenseNumber, complianceStatus, hygieneRating, findings, remarks, actionRequired, followUpDate } = body;
    if (!licenseId && !licenseNumber) return NextResponse.json({ error: 'licenseId or licenseNumber required' }, { status: 400 });

    // locate license
    let license = null as any;
    if (licenseId) license = await License.findById(licenseId);
    if (!license && licenseNumber) license = await License.findOne({ licenseNumber: licenseNumber });
    if (!license) return NextResponse.json({ error: 'License not found' }, { status: 404 });

    // authorization: railway admin can record for any; inspector users must be assigned or have no station restriction
    let inspectorRecord = await InspectorModel.findOne({ userId: auth.user.id });
    if (auth.user.role !== 'RAILWAY_ADMIN') {
      if (!inspectorRecord) return NextResponse.json({ error: 'Inspector profile not found' }, { status: 403 });
      if (inspectorRecord.stationId && license.stationId.toString() !== inspectorRecord.stationId.toString()) {
        return NextResponse.json({ error: 'Forbidden - inspector not assigned to this station' }, { status: 403 });
      }
    }

    // Prepare inspection log
    const inspectorName = auth.user.name || auth.user.email || 'Inspector';
    const log = {
      inspectorId: auth.user.id,
      inspectorName,
      inspectionDate: new Date(),
      notes: remarks || '',
      complianceStatus: complianceStatus || 'COMPLIANT',
      hygieneRating: hygieneRating || 0,
      findings: Array.isArray(findings) ? findings : (findings ? findings.split('\n') : []),
      actionRequired: actionRequired || null,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
    } as any;

    // push to license
    license.inspectionLogs = license.inspectionLogs || [];
    license.inspectionLogs.push(log);
    license.lastInspectionDate = log.inspectionDate;
    license.complianceStatus = log.complianceStatus;
    await license.save();

    // update inspector model if exists
    if (inspectorRecord) {
      inspectorRecord.totalInspections = (inspectorRecord.totalInspections || 0) + 1;
      inspectorRecord.lastInspectionDate = log.inspectionDate;
      inspectorRecord.inspections = inspectorRecord.inspections || [];
      inspectorRecord.inspections.push({
        inspectionDate: log.inspectionDate,
        inspectorId: new mongoose.Types.ObjectId(auth.user.id),
        vendorId: license.vendorId,
        shopId: license.shopId,
        licenseVerified: !!(license && license.status === 'ACTIVE'),
        hygieneRating: log.hygieneRating,
        complianceStatus: log.complianceStatus,
        findings: log.findings,
        remarks: log.notes,
        photosUrls: [],
        actionRequired: log.actionRequired,
        followUpDate: log.followUpDate,
      });
      await inspectorRecord.save();
    }

    return NextResponse.json({ success: true, message: 'Inspection recorded', license, inspector: inspectorRecord || null });
  } catch (err) {
    console.error('Record inspection error:', err);
    return NextResponse.json({ error: 'Failed to record inspection', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
