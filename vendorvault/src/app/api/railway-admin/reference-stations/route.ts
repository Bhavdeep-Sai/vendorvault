import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ReferenceStation from '@/models/ReferenceStation';
import { getAuthUser } from '@/middleware/auth';

// GET - List all reference stations
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== 'RAILWAY_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stations = await ReferenceStation.find()
      .sort({ stationName: 1 })
      .lean();

    return NextResponse.json({ stations });
  } catch (error) {
    console.error('Get reference stations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reference stations' },
      { status: 500 }
    );
  }
}

// POST - Create new reference station
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== 'RAILWAY_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      stationName,
      stationCode,
      railwayZone,
      division,
      stationCategory,
      platformsCount,
      dailyFootfallAvg,
      city,
      state,
      pincode,
      address
    } = body;

    // Validate required fields
    if (!stationName || !stationCode || !railwayZone || !stationCategory || 
        !platformsCount || !dailyFootfallAvg) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if station code already exists
    const existing = await ReferenceStation.findOne({ stationCode });
    if (existing) {
      return NextResponse.json(
        { error: 'Station code already exists' },
        { status: 400 }
      );
    }

    const newStation = new ReferenceStation({
      stationName,
      stationCode: stationCode.toUpperCase(),
      railwayZone,
      division,
      stationCategory,
      platformsCount: parseInt(platformsCount),
      dailyFootfallAvg: parseInt(dailyFootfallAvg),
      city,
      state,
      pincode,
      address
    });

    await newStation.save();

    return NextResponse.json({
      success: true,
      message: 'Reference station created successfully',
      station: newStation
    });
  } catch (error) {
    console.error('Create reference station error:', error);
    return NextResponse.json(
      { error: 'Failed to create reference station' },
      { status: 500 }
    );
  }
}
