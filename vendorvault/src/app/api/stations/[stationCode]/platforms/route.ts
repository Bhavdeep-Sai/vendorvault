import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Station from '@/models/Station';
import Platform from '@/models/Platform';

// Get platforms with available shops for a specific station
export async function GET(
  request: NextRequest,
  { params }: { params: { stationCode: string } }
) {
  try {
    await connectDB();

    const { stationCode } = params;

    // Find the station
    const station = await Station.findOne({ 
      stationCode: stationCode.toUpperCase(),
      approvalStatus: 'APPROVED',
      layoutCompleted: true
    });

    if (!station) {
      return NextResponse.json(
        { error: 'Station not found or layout not completed' },
        { status: 404 }
      );
    }

    // Get all platforms with shops for this station
    const platforms = await Platform.find({ stationId: station._id })
      .select('platformNumber platformName shops totalShops availableShops dimensions')
      .sort({ platformNumber: 1 })
      .lean();

    // Filter to only show available shops
    const platformsWithAvailableShops = platforms.map(platform => ({
      ...platform,
      shops: platform.shops.filter((shop: any) => shop.status === 'AVAILABLE')
    }));

    return NextResponse.json({
      success: true,
      station: {
        stationName: station.stationName,
        stationCode: station.stationCode,
        railwayZone: station.railwayZone,
      },
      platforms: platformsWithAvailableShops
    });

  } catch (error: any) {
    console.error('Get station platforms error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch station platforms' },
      { status: 500 }
    );
  }
}
