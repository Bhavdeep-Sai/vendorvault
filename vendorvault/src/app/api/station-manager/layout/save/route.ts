/**
 * API Route: Save Station Layout
 * POST /api/station-manager/layout/save
 * 
 * Saves or updates the station layout to the database
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StationLayout from '@/models/StationLayout';
import Station from '@/models/Station';
import { getAuthUser } from '@/middleware/auth';

export async function POST(request: NextRequest) {
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

    // Check if user is a station manager
    if (role !== 'STATION_MANAGER') {
      return NextResponse.json(
        { error: 'Access denied. Station Manager role required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const layoutData = await request.json();

    if (!layoutData.stationId || !layoutData.stationCode) {
      return NextResponse.json(
        { error: 'Station ID and code are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify station exists and belongs to this manager
    const station = await Station.findById(layoutData.stationId);
    if (!station) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }

    if (station.stationManagerId.toString() !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this station layout' },
        { status: 403 }
      );
    }

    // Check if layout already exists
    const existingLayout = await StationLayout.findOne({ stationId: layoutData.stationId });

    // Server-side validation: enforce max units and max area
    const MAX_AREA_M2 = 10; // 10 square meters

    // Enforced linear range (units)
    const MIN_UNITS = 50;
    const MAX_UNITS = 200; // user requested 200 units == 10 m^2

    // Default unitToMeters so that 200 units == 10 m^2
    // Solve: (200 * utm)^2 = 10 -> utm = sqrt(10) / 200
    const DEFAULT_UNIT_TO_METERS = Math.sqrt(10) / 200;
    // For validation, prefer the pricing supplied in the request. If absent, use the new DEFAULT_UNIT_TO_METERS
    // (this prevents legacy saved layouts with older unitToMeters from silently causing stricter caps)
    const unitToMetersFromRequest = layoutData.pricing?.unitToMeters ?? DEFAULT_UNIT_TO_METERS;
    // Derive a linear-unit cap from the max area and clamp to [MIN_UNITS, MAX_UNITS]
    const maxLinearUnitsFromArea = Math.floor(Math.sqrt(MAX_AREA_M2) / (Number(unitToMetersFromRequest) || DEFAULT_UNIT_TO_METERS));
    const effectiveMaxUnits = Math.min(MAX_UNITS, Math.max(MIN_UNITS, maxLinearUnitsFromArea));

    const findOversizedShops = (platforms: any[] = []) => {
      const offenders: Array<{ platformId?: string; platformNumber?: string; shopId?: string; shopIndex?: number; width?: number; height?: number; areaM2?: number }> = [];
      platforms.forEach((platform) => {
        const pId = platform.id || platform._id;
        const pNumber = platform.platformNumber;
        const shops = platform.shops || [];
        shops.forEach((shop: any, idx: number) => {
          const width = shop.size?.width ?? shop.width ?? shop.w ?? 0;
          const height = shop.size?.height ?? shop.height ?? shop.h ?? width; // fallback to square if height missing
          const utm = Number(unitToMetersFromRequest) || DEFAULT_UNIT_TO_METERS;
          const areaM2 = (width * height) * utm * utm;
          const exceedsArea = areaM2 > MAX_AREA_M2;
          const exceedsLinear = (width < MIN_UNITS) || (height < MIN_UNITS) || (width > effectiveMaxUnits) || (height > effectiveMaxUnits);
          if (exceedsLinear || exceedsArea) {
            offenders.push({ platformId: pId, platformNumber: pNumber, shopId: shop.id || shop._id || null, shopIndex: idx, width, height, areaM2 });
          }
        });
      });
      return offenders;
    };

    // Check new-style platforms
    const oversizedFromPlatforms = findOversizedShops(layoutData.platforms || []);
    // Fallback: check tracks->platforms if present
    let oversizedFromTracks: any[] = [];
    if ((!layoutData.platforms || layoutData.platforms.length === 0) && Array.isArray(layoutData.tracks)) {
      const platformsFromTracks: any[] = [];
      layoutData.tracks.forEach((track: any) => {
        if (Array.isArray(track.platforms)) platformsFromTracks.push(...track.platforms);
      });
      oversizedFromTracks = findOversizedShops(platformsFromTracks);
    }

    const allOffenders = [...oversizedFromPlatforms, ...oversizedFromTracks];
    if (allOffenders.length > 0) {
      const samples = allOffenders.slice(0, 5).map(o => `platform:${o.platformNumber ?? o.platformId} shopIndex:${o.shopIndex} w:${o.width} h:${o.height} area:${o.areaM2.toFixed(2)}m2`);
      return NextResponse.json({ error: `Layout validation failed: ${allOffenders.length} oversized shop(s) found. Examples: ${samples.join('; ')}. Effective max linear units: ${effectiveMaxUnits}, Max area: ${MAX_AREA_M2} m².` }, { status: 400 });
    }

    if (existingLayout) {
      // Check if layout is locked
      if (existingLayout.metadata.isLocked) {
        return NextResponse.json(
          { error: 'Layout is locked and cannot be modified' },
          { status: 403 }
        );
      }

      // Update existing layout
      existingLayout.tracks = layoutData.tracks;
      existingLayout.platforms = layoutData.platforms || [];
      existingLayout.infrastructureBlocks = layoutData.infrastructureBlocks;
      existingLayout.canvasSettings = layoutData.canvasSettings;
      existingLayout.metadata.version = layoutData.metadata?.version || existingLayout.metadata.version;
      // Persist pricing settings if provided
      if (layoutData.pricing) {
        existingLayout.pricing = {
          unitToMeters: layoutData.pricing.unitToMeters ?? existingLayout.pricing?.unitToMeters ?? DEFAULT_UNIT_TO_METERS,
          pricePer100x100Single: layoutData.pricing.pricePer100x100Single ?? existingLayout.pricing?.pricePer100x100Single ?? 0,
          pricePer100x100Dual: layoutData.pricing.pricePer100x100Dual ?? existingLayout.pricing?.pricePer100x100Dual ?? 0,
          securityDepositRate: layoutData.pricing.securityDepositRate ?? existingLayout.pricing?.securityDepositRate ?? 0,
        };
      }
      
      await existingLayout.save();

      // Update station layoutCompleted status
      if (!station.layoutCompleted) {
        station.layoutCompleted = true;
        // Ensure entryGates has a valid value (required minimum 1)
        if (!station.entryGates || station.entryGates < 1) {
          station.entryGates = 1;
        }
        await station.save();
      }

      return NextResponse.json({
        success: true,
        message: 'Layout updated successfully',
        layout: existingLayout,
      });
    } else {
      // Create new layout
      const newLayout = new StationLayout({
        stationId: layoutData.stationId,
        stationName: layoutData.stationName,
        stationCode: layoutData.stationCode,
        tracks: layoutData.tracks,
        platforms: layoutData.platforms || [],
        infrastructureBlocks: layoutData.infrastructureBlocks,
        canvasSettings: layoutData.canvasSettings,
        pricing: layoutData.pricing || {},
        metadata: {
          version: layoutData.metadata?.version || '1.0.0',
          createdBy: userId,
          isLocked: false,
        },
      });

      await newLayout.save();

      // Update station layoutCompleted status
      station.layoutCompleted = true;
      // Ensure entryGates has a valid value (required minimum 1)
      if (!station.entryGates || station.entryGates < 1) {
        station.entryGates = 1;
      }
      await station.save();

      return NextResponse.json({
        success: true,
        message: 'Layout created successfully',
        layout: newLayout,
      }, { status: 201 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
