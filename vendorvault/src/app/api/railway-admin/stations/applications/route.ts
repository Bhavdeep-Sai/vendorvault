import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Station from '@/models/Station';
import { getAuthUser } from '@/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== 'RAILWAY_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stations = await Station.find()
      .select('stationName stationCode railwayZone stationCategory operationalStatus approvalStatus stationManagerId createdAt')
      .populate('stationManagerId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return NextResponse.json({ stations });
  } catch (error) {
    console.error('Get stations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stations' },
      { status: 500 }
    );
  }
}
