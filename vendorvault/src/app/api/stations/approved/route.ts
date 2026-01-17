import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Station from '@/models/Station';

// Get all approved stations for vendor selection
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Fetch all approved and active stations
    const stations = await Station.find({
      approvalStatus: 'APPROVED',
      operationalStatus: 'ACTIVE'
    })
    .select('stationName stationCode railwayZone stationCategory')
    .sort({ stationName: 1 })
    .lean();

    return NextResponse.json({
      success: true,
      stations: stations
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error fetching approved stations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approved stations' },
      { status: 500 }
    );
  }
}
