/**
 * API Route: Export Station Layout
 * GET /api/station-manager/layout/export?stationId=XXX
 * 
 * Exports the station layout as JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StationLayout from '@/models/StationLayout';
import Station from '@/models/Station';
import { getAuthUser } from '@/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authData = getAuthUser(request);
    if (!authData) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = authData;

    // Get station ID from query params
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('stationId');

    if (!stationId) {
      return NextResponse.json(
        { error: 'Station ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify station exists
    const station = await Station.findById(stationId);
    if (!station) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }

    // Load layout
    const layout = await StationLayout.findOne({ stationId });

    if (!layout) {
      return NextResponse.json(
        { error: 'Layout not found for this station' },
        { status: 404 }
      );
    }

    // Create export data
    const exportData = {
      stationId: layout.stationId,
      stationName: layout.stationName,
      stationCode: layout.stationCode,
      tracks: layout.tracks,
      infrastructureBlocks: layout.infrastructureBlocks,
      canvasSettings: layout.canvasSettings,
      metadata: {
        ...layout.metadata,
        exportedAt: new Date().toISOString(),
        exportedBy: userId,
      },
    };

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="station-layout-${layout.stationCode}-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting layout:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
