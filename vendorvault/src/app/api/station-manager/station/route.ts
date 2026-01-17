import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Station from "@/models/Station";
import Platform from "@/models/Platform";
import { getAuthUser } from "@/middleware/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Forbidden - Station Manager access required' }, { status: 403 });
    }

    await connectDB();

    // Find the station managed by this user (can be pending or approved)
    const station = await Station.findOne({ 
      stationManagerId: auth.userId
    });

    if (!station) {
      return NextResponse.json(
        { error: "No station found for this manager" },
        { status: 404 }
      );
    }

    // Get existing platforms
    const platforms = await Platform.find({ stationId: station._id })
      .sort({ platformNumber: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      station: {
        _id: station._id,
        stationName: station.stationName,
        stationCode: station.stationCode,
        railwayZone: station.railwayZone,
        stationCategory: station.stationCategory,
        platformsCount: station.platformsCount,
        dailyFootfallAvg: station.dailyFootfallAvg,
        operationalStatus: station.operationalStatus,
        approvalStatus: station.approvalStatus,
        layoutCompleted: station.layoutCompleted || false,
        createdAt: station.createdAt,
        updatedAt: station.updatedAt
      },
      platforms
    });

  } catch (error) {
    console.error("Error fetching station data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}// Update station data (e.g., mark layout as completed)
export async function PATCH(request: NextRequest) {
  try {
    const auth = getAuthUser(request);
    
    if (!auth || auth.role !== 'STATION_MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized - Station Manager access required' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { layoutCompleted } = body;

    const station = await Station.findOne({ stationManagerId: auth.userId });
    
    if (!station) {
      return NextResponse.json(
        { error: 'No station assigned to this station manager' },
        { status: 404 }
      );
    }

    if (layoutCompleted !== undefined) {
      station.layoutCompleted = layoutCompleted;
      await station.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Station updated successfully',
      station: {
        _id: station._id,
        stationName: station.stationName,
        stationCode: station.stationCode,
        layoutCompleted: station.layoutCompleted,
      },
    });

  } catch (error: any) {
    console.error('Update station error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update station' },
      { status: 500 }
    );
  }
}
