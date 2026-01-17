import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Station from '@/models/Station';
import User from '@/models/User';
import { getAuthUser } from '@/middleware/auth';

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== 'RAILWAY_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { stationId, approvalStatus } = await request.json();

    if (!stationId || !approvalStatus) {
      return NextResponse.json(
        { error: 'Station ID and approval status required' },
        { status: 400 }
      );
    }

    const station = await Station.findByIdAndUpdate(
      stationId,
      { 
        approvalStatus,
        operationalStatus: approvalStatus === 'APPROVED' ? 'ACTIVE' : 'PENDING_APPROVAL'
      },
      { new: true, lean: true }
    ).select('stationName stationCode approvalStatus operationalStatus stationManagerId');

    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 });
    }

    // Update the station manager's status as well
    if (station?.stationManagerId) {
      await User.findByIdAndUpdate(
        station.stationManagerId,
        { 
          status: approvalStatus === 'APPROVED' ? 'ACTIVE' : 'REJECTED',
          verificationStatus: approvalStatus === 'APPROVED' ? 'VERIFIED' : 'REJECTED'
        },
        { lean: true }
      ).exec();
    }

    return NextResponse.json({ 
      success: true,
      message: `Station ${approvalStatus.toLowerCase()} successfully`,
      station
    });
  } catch (error) {
    console.error('Approve station error:', error);
    return NextResponse.json(
      { error: 'Failed to approve station' },
      { status: 500 }
    );
  }
}
