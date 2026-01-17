import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Platform from '@/models/Platform';
import { getAuthUser } from '@/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== 'RAILWAY_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const platforms = await Platform.find()
      .populate('stationId', 'stationName stationCode')
      .sort({ stationId: 1, platformNumber: 1 })
      .lean();

    return NextResponse.json({ platforms });
  } catch (error) {
    console.error('Get platforms error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platforms' },
      { status: 500 }
    );
  }
}
