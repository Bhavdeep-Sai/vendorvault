import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/middleware/auth';
import dbConnect from '@/lib/mongodb';
import Station from '@/models/Station';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(request);
    if (!user || user.role !== 'RAILWAY_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { id } = await params;
    const station = await Station.findById(id)
      .populate('stationManagerId')
      .lean();

    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 });
    }

    return NextResponse.json({ station });
  } catch (error) {
    console.error('Error fetching station details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch station details' },
      { status: 500 }
    );
  }
}
