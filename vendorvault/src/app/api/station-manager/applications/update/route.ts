import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Station from '@/models/Station';
import ShopApplication from '@/models/ShopApplication';
import License from '@/models/License';
import mongoose from 'mongoose';
import { verifyAuthToken } from '@/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || authResult.user?.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { applicationId, expiryMonths, securityDeposit } = body;

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId is required' }, { status: 400 });
    }

    const station = await Station.findOne({ stationManagerId: authResult.user.id });
    if (!station) return NextResponse.json({ error: 'Station not assigned' }, { status: 400 });

    const application = await ShopApplication.findById(applicationId);
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

    if (application.stationId.toString() !== station._id.toString()) {
      return NextResponse.json({ error: 'This application does not belong to your station' }, { status: 403 });
    }

    // Validate inputs
    const months = expiryMonths !== undefined ? parseInt(String(expiryMonths), 10) : null;
    const deposit = securityDeposit !== undefined ? Number(securityDeposit) : null;

    if (months !== null && (isNaN(months) || months <= 0)) {
      return NextResponse.json({ error: 'expiryMonths must be a positive integer' }, { status: 400 });
    }
    if (deposit !== null && (isNaN(deposit) || deposit < 0)) {
      return NextResponse.json({ error: 'securityDeposit must be a non-negative number' }, { status: 400 });
    }

    // Update ShopApplication
    if (deposit !== null) {
      application.finalSecurityDeposit = Number(deposit);
    }
    if (months !== null && months > 0) {
      const issuedAt = application.licenseIssuedAt || new Date();
      const expires = new Date(issuedAt);
      expires.setMonth(expires.getMonth() + months);
      application.licenseExpiresAt = expires;
    }

    // Persist status history entry
    application.statusHistory = application.statusHistory || [];
    const reasonParts: string[] = ['Updated by station manager'];
    if (months !== null) reasonParts.push(`expiry: ${months} months`);
    if (deposit !== null) reasonParts.push(`securityDeposit: ${deposit}`);
    application.statusHistory.push({
      status: application.status,
      changedBy: new mongoose.Types.ObjectId(authResult.user.id),
      changedAt: new Date(),
      reason: reasonParts.join(' | '),
    });

    await application.save();

    // Update License if exists
    const license = await License.findOne({ applicationId: application._id });
    if (license) {
      if (deposit !== null) license.securityDeposit = Number(deposit);
      if (months !== null && months > 0) {
        const issuedAt = license.issuedAt || new Date();
        const expires = new Date(issuedAt);
        expires.setMonth(expires.getMonth() + months);
        license.expiresAt = expires;
        license.validityPeriod = months;
      }
      await license.save();
    }

    return NextResponse.json({ success: true, message: 'Application updated', application, license });
  } catch (error) {
    console.error('Error updating application financials:', error);
    return NextResponse.json({ error: 'Failed to update application', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
}
