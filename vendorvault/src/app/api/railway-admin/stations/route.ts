import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Station from '@/models/Station';
import { verifyAuth } from '@/lib/auth';

// Get all stations (for railway admin)
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request, ['RAILWAY_ADMIN']);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    await connectDB();

    const stations = await Station.find({})
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

// Create new station
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request, ['RAILWAY_ADMIN']);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      stationName,
      stationCode,
      address,
      city,
      state,
      pincode,
      railwayZone,
      division,
      stationCategory,
      platformsCount,
      dailyFootfallAvg,
      operationalStatus,
      facilities
    } = body;

    // Check if station code already exists
    const existingStation = await Station.findOne({ stationCode });
    if (existingStation) {
      return NextResponse.json(
        { error: 'Station with this code already exists' },
        { status: 400 }
      );
    }

    const newStation = new Station({
      stationName,
      stationCode: stationCode.toUpperCase(),
      address,
      city,
      state,
      pincode,
      railwayZone,
      division,
      stationCategory,
      platformsCount: parseInt(platformsCount),
      dailyFootfallAvg: parseInt(dailyFootfallAvg),
      operationalStatus: operationalStatus || 'ACTIVE',
      approvalStatus: 'APPROVED',
      layoutCompleted: false,
      facilities: facilities || []
    });

    await newStation.save();

    return NextResponse.json({
      success: true,
      message: 'Station created successfully',
      station: newStation
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create station' },
      { status: 500 }
    );
  }
}

// Update station
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request, ['RAILWAY_ADMIN']);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { stationId, ...updateData } = body;

    if (!stationId) {
      return NextResponse.json(
        { error: 'Station ID is required' },
        { status: 400 }
      );
    }

    // If updating station code, check for duplicates
    if (updateData.stationCode) {
      const existingStation = await Station.findOne({ 
        stationCode: updateData.stationCode.toUpperCase(),
        _id: { $ne: stationId }
      });
      if (existingStation) {
        return NextResponse.json(
          { error: 'Station code already exists' },
          { status: 400 }
        );
      }
      updateData.stationCode = updateData.stationCode.toUpperCase();
    }

    // Convert numeric fields
    if (updateData.platformsCount) {
      updateData.platformsCount = parseInt(updateData.platformsCount);
    }
    if (updateData.dailyFootfallAvg) {
      updateData.dailyFootfallAvg = parseInt(updateData.dailyFootfallAvg);
    }

    const updatedStation = await Station.findByIdAndUpdate(
      stationId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('stationManagerId', 'name email phone');

    if (!updatedStation) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Station updated successfully',
      station: updatedStation
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update station' },
      { status: 500 }
    );
  }
}

// Delete station
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request, ['RAILWAY_ADMIN']);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('stationId');

    if (!stationId) {
      return NextResponse.json(
        { error: 'Station ID is required' },
        { status: 400 }
      );
    }

    const deletedStation = await Station.findByIdAndDelete(stationId);

    if (!deletedStation) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Station deleted successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete station' },
      { status: 500 }
    );
  }
}
