import { NextRequest, NextResponse } from 'next/server';
import User from '@/models/User';
import Station from '@/models/Station';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify user is super admin
    const currentUser = await verifyToken(request);
    if (!currentUser || currentUser.role !== 'RAILWAY_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('🔵 API received body:', body);
    
    const { stationManagerId, adminId, action, rejectionReason } = body;
    const userId = stationManagerId || adminId;
    
    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Station Manager ID and action are required' },
        { status: 400 }
      );
    }

    // Find the user application
    const stationManagerUser = await User.findById(userId);
    if (!stationManagerUser) {
      return NextResponse.json(
        { error: 'Station Manager application not found' },
        { status: 404 }
      );
    }

    if (stationManagerUser.role !== 'STATION_MANAGER') {
      return NextResponse.json(
        { error: 'User is not a station manager or admin application' },
        { status: 400 }
      );
    }

    if (stationManagerUser.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Station Manager application has already been processed' },
        { status: 400 }
      );
    }

    // Update the user status based on action
    if (action === 'approve') {
      stationManagerUser.status = 'ACTIVE';
      stationManagerUser.approvedBy = currentUser.id;
      stationManagerUser.rejectionReason = undefined;
    
    } else if (action === 'reject') {
      if (!rejectionReason || !rejectionReason.trim()) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        );
      }
      stationManagerUser.status = 'REJECTED';
      stationManagerUser.rejectionReason = rejectionReason.trim();
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    await stationManagerUser.save();

    // If this is a STATION_MANAGER and action is approve, also approve their station
    if (stationManagerUser.role === 'STATION_MANAGER' && action === 'approve') {
      const station = await Station.findOne({ stationManagerId: userId });
      
      if (station) {
        station.approvalStatus = 'APPROVED';
        station.operationalStatus = 'ACTIVE';
        station.approvedBy = currentUser.id;
        await station.save();
      } else {
      }
    }

    const actionText = action === 'approve' ? 'approved' : 'rejected';
    const responseData = {
      message: `Station Manager application ${actionText} successfully`,
      stationManager: {
        id: stationManagerUser._id,
        name: stationManagerUser.name,
        email: stationManagerUser.email,
        status: stationManagerUser.status,
      }
    };
    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}