import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ReferenceStation from '@/models/ReferenceStation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: false,
        stations: []
      });
    }

    await connectDB();

    // Search in reference stations collection (autocomplete data only)
    const stations = await ReferenceStation.find({
      $or: [
        { stationName: { $regex: query, $options: 'i' } },
        { stationCode: { $regex: query, $options: 'i' } }
      ]
    })
    .select('stationName stationCode railwayZone division stationCategory platformsCount dailyFootfallAvg city state pincode address')
    .limit(10)
    .sort({ stationName: 1 })
    .lean();

    return NextResponse.json({
      success: true,
      stations
    });
  } catch (error: any) {
    console.error('Station search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search stations' },
      { status: 500 }
    );
  }
}
