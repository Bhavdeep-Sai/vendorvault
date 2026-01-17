import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Station from '@/models/Station';

// Get all approved stations for vendor registration
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Fetch only approved stations with active operational status and completed layouts
    const stations = await Station.find({
      approvalStatus: 'APPROVED',
      operationalStatus: 'ACTIVE',
      layoutCompleted: true
    })
    .select('stationName stationCode railwayZone stationCategory platformsCount layoutCompleted')
    .populate('stationManagerId', 'name email phone')
    .sort({ stationName: 1 })
    .lean();

    return NextResponse.json({
      success: true,
      stations
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stations' },
      { status: 500 }
    );
  }
}
