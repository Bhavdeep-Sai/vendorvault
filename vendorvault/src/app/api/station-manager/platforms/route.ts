import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Platform from '@/models/Platform';
import Station from '@/models/Station';
import { getAuthUser } from '@/middleware/auth';

// Get all platforms for a station (Station Manager only)
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthUser(request);
    
    if (!auth || auth.role !== 'STATION_MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized - Station Manager access required' },
        { status: 403 }
      );
    }

    await connectDB();

    // Get station for this station manager
    const station = await Station.findOne({ stationManagerId: auth.userId });
    
    if (!station) {
      return NextResponse.json(
        { error: 'No station assigned to this station manager' },
        { status: 404 }
      );
    }

    // Get all platforms for this station
    const platforms = await Platform.find({ stationId: station._id })
      .populate('shops.vendorId', 'name email phone')
      .sort({ platformNumber: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      platforms,
      stationInfo: {
        stationName: station.stationName,
        stationCode: station.stationCode,
        totalPlatforms: station.platformsCount,
      }
    });

  } catch (error: any) {
    console.error('❌ Get platforms error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch platforms' },
      { status: 500 }
    );
  }
}

// Create or update platform (Station Manager only)
export async function POST(request: NextRequest) {
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
    const { platformNumber, platformName, dimensions, totalShops, shopLayout } = body;

    // Get station for this station manager
    const station = await Station.findOne({ stationManagerId: auth.userId });
    
    if (!station) {
      return NextResponse.json(
        { error: 'No station assigned to this station manager' },
        { status: 404 }
      );
    }

    // Check if platform already exists
    let platform = await Platform.findOne({
      stationId: station._id,
      platformNumber
    });

    if (platform) {
      // Update existing platform
      platform.platformName = platformName;
      platform.dimensions = dimensions;
      platform.totalShops = totalShops;
      if (shopLayout && shopLayout.length > 0) {
        platform.shops = shopLayout;
      }
      platform.updateShopCounts();
      await platform.save();
    } else {
      // Create new platform with shop layout
      const shops = shopLayout || [];
      
      platform = await Platform.create({
        stationId: station._id,
        platformNumber,
        platformName,
        dimensions,
        totalShops,
        shops,
        occupiedShops: 0,
        availableShops: totalShops,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Platform saved successfully',
      platform
    });

  } catch (error: any) {
    console.error('❌ Create platform error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create platform' },
      { status: 500 }
    );
  }
}
