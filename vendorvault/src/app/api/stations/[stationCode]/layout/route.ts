/**
 * Public API Route: Get Station Layout for Vendors
 * GET /api/stations/[stationCode]/layout
 * 
 * Returns the station layout for approved stations (for vendor application)
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StationLayout from '@/models/StationLayout';
import Station from '@/models/Station';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ stationCode: string }> }
) {
  try {
    await connectDB();

    // Await params as required by Next.js 14+ API routes
    const params = await context.params;
    const { stationCode } = params;

    if (!stationCode) {
      return NextResponse.json(
        { error: 'Station code is required' },
        { status: 400 }
      );
    }

    // Find station by code
    const station = await Station.findOne({ stationCode: stationCode.toUpperCase() });

    if (!station) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }

    // Only return layout for approved and active stations with completed layouts
    if (station.approvalStatus !== 'APPROVED' ||
      station.operationalStatus !== 'ACTIVE' ||
      !station.layoutCompleted) {
      return NextResponse.json(
        { error: 'Station layout is not available' },
        { status: 403 }
      );
    }

    // Find station layout
    const layout = await StationLayout.findOne({ stationId: station._id });

    if (!layout) {
      return NextResponse.json(
        { error: 'Layout not found for this station' },
        { status: 404 }
      );
    }

    // Return layout data (include pricing so vendors get correct unit/price info)
    return NextResponse.json({
      success: true,
      layout: {
        _id: layout._id,
        stationId: layout.stationId,
        stationName: layout.stationName,
        stationCode: layout.stationCode,
        platforms: layout.platforms || [],
        infrastructureBlocks: layout.infrastructureBlocks || [],
        canvasSettings: layout.canvasSettings,
        pricing: layout.pricing || {},
      },
    });

  } catch (error: any) {
    console.error('Get station layout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch station layout' },
      { status: 500 }
    );
  }
}
