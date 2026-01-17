import { NextRequest, NextResponse } from 'next/server';
import User from '@/models/User';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verify user is super admin
    const user = await verifyToken(request);
    if (!user || user.role !== 'RAILWAY_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get pending admin (vendor admin) applications
    const pendingAdmins = await User.find({
      role: 'STATION_MANAGER',
      status: 'PENDING'
    }).select('-password').sort({ createdAt: -1 });

    return NextResponse.json({
      pendingAdmins
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}