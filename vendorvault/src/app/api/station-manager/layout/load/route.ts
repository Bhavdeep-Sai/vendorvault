/**
 * API Route: Load Station Layout
 * GET /api/station-manager/layout/load?stationId=XXX
 * 
 * Loads the station layout from the database
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

    const { userId, role } = authData;

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

    // Check permissions based on role
    if (role === 'STATION_MANAGER') {
      if (station.stationManagerId.toString() !== userId) {
        return NextResponse.json(
          { error: 'You do not have permission to view this station layout' },
          { status: 403 }
        );
      }
    } else if (!['RAILWAY_ADMIN', 'SUPER_ADMIN'].includes(role)) {
      // Vendors and Inspectors can view layouts too (read-only)
      // No additional permission check needed
    }

    // Load layout
    const layout = await StationLayout.findOne({ stationId });

    if (!layout) {
      return NextResponse.json(
        { error: 'Layout not found for this station' },
        { status: 404 }
      );
    }

    // Transform layout to plain object and ensure IDs are strings
    const layoutObj = layout.toObject();
    
    // Ensure all platforms have string IDs
    if (layoutObj.platforms) {
      layoutObj.platforms = layoutObj.platforms.map((platform: any) => ({
        ...platform,
        id: platform.id || platform._id?.toString(),
        shops: platform.shops ? platform.shops.map((shop: any) => ({
          ...shop,
          id: shop.id || shop._id?.toString(),
        })) : [],
      }));
    }
    
    // Ensure all tracks have string IDs (for backward compatibility)
    if (layoutObj.tracks) {
      layoutObj.tracks = layoutObj.tracks.map((track: any) => ({
        ...track,
        id: track.id || track._id?.toString(),
        platforms: track.platforms ? track.platforms.map((platform: any) => ({
          ...platform,
          id: platform.id || platform._id?.toString(),
          shops: platform.shops ? platform.shops.map((shop: any) => ({
            ...shop,
            id: shop.id || shop._id?.toString(),
          })) : [],
        })) : [],
      }));
    }

    // Ensure all infrastructure blocks have string IDs
    if (layoutObj.infrastructureBlocks) {
      layoutObj.infrastructureBlocks = layoutObj.infrastructureBlocks.map((block: any) => ({
        ...block,
        id: block.id || block._id?.toString(),
      }));
    }

    return NextResponse.json({
      success: true,
      layout: layoutObj,
      station: {
        id: station._id,
        name: station.stationName,
        code: station.stationCode,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
