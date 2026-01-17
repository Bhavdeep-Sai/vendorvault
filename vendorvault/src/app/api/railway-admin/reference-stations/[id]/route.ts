import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ReferenceStation from '@/models/ReferenceStation';
import { getAuthUser } from '@/middleware/auth';

// PUT - Update reference station
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== 'RAILWAY_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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

    // Check if station code is being changed and if it conflicts
    const existing = await ReferenceStation.findOne({ 
      stationCode: stationCode?.toUpperCase(),
      _id: { $ne: id }
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Station code already exists' },
        { status: 400 }
      );
    }

    const station = await ReferenceStation.findByIdAndUpdate(
      id,
      {
        stationName,
        stationCode: stationCode?.toUpperCase(),
        railwayZone,
        division,
        stationCategory,
        platformsCount: platformsCount ? parseInt(platformsCount) : undefined,
        dailyFootfallAvg: dailyFootfallAvg ? parseInt(dailyFootfallAvg) : undefined,
        city,
        state,
        pincode,
        address
      },
      { new: true }
    );

    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Reference station updated successfully',
      station
    });
  } catch (error) {
    console.error('Update reference station error:', error);
    return NextResponse.json(
      { error: 'Failed to update reference station' },
      { status: 500 }
    );
  }
}

// DELETE - Delete reference station
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== 'RAILWAY_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const station = await ReferenceStation.findByIdAndDelete(id);

    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Reference station deleted successfully'
    });
  } catch (error) {
    console.error('Delete reference station error:', error);
    return NextResponse.json(
      { error: 'Failed to delete reference station' },
      { status: 500 }
    );
  }
}
