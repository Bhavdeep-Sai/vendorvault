import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import License from '@/models/License';
import Station from '@/models/Station';
import User from '@/models/User';
import { getAuthUser } from '@/middleware/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const auth = getAuthUser(request);
    if (!auth || auth.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { applicationId } = await params;

    // Find station with only needed fields
    const station = await Station.findOne({
      stationManagerId: auth.userId,
      approvalStatus: "APPROVED",
    }).select('stationName stationCode').lean();

    if (!station) {
      return NextResponse.json(
        { error: 'No approved station found' },
        { status: 404 }
      );
    }

    // Optimized license query
    const license = await License.findById(applicationId)
      .select('licenseNumber status proposedRent agreedRent monthlyRent negotiationStatus negotiationMessages shopId shopWidth vendorId')
      .populate({
        path: 'vendorId',
        select: 'userId businessName businessType stationName stationCode platformNumber'
      })
      .lean();
    
    if (!license) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Verify application belongs to this station
    const vendor = license.vendorId as any;
    if (vendor.stationCode !== station.stationCode) {
      return NextResponse.json(
        { error: 'This application does not belong to your station' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      license: {
        _id: license._id,
        licenseNumber: license.licenseNumber,
        status: license.status,
        proposedRent: license.proposedRent,
        agreedRent: license.agreedRent,
        monthlyRent: license.monthlyRent,
        negotiationStatus: license.negotiationStatus,
        negotiationMessages: license.negotiationMessages || [],
        shopId: license.shopId,
        shopWidth: license.shopWidth,
      },
      vendor: {
        _id: vendor._id,
        userId: vendor.userId,
        businessName: vendor.businessName,
        businessType: vendor.businessType,
        stationName: vendor.stationName,
        stationCode: vendor.stationCode,
        platformNumber: vendor.platformNumber,
      },
    });
  } catch (error) {
    console.error('Negotiation fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const auth = getAuthUser(request);
    if (!auth || auth.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { applicationId } = await params;

    // Find station with minimal fields
    const station = await Station.findOne({
      stationManagerId: auth.userId,
      approvalStatus: "APPROVED",
    }).select('stationName stationCode').lean();

    if (!station) {
      return NextResponse.json(
        { error: 'No approved station found' },
        { status: 404 }
      );
    }

    const license = await License.findById(applicationId)
      .select('negotiationMessages proposedRent agreedRent monthlyRent negotiationStatus vendorId')
      .populate({
        path: 'vendorId',
        select: 'stationCode'
      });
    
    if (!license) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Verify application belongs to this station
    const vendor = license.vendorId as any;
    if (vendor.stationCode !== station.stationCode) {
      return NextResponse.json(
        { error: 'This application does not belong to your station' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { message, proposedRent, action } = body;

    // Get station manager name only when needed
    const user = await User.findById(auth.userId).select('name').lean();
    const managerName = user?.name || 'Station Manager';

    if (action === 'AGREE') {
      // Station manager agrees to terms
      if (!proposedRent) {
        return NextResponse.json(
          { error: 'Agreed rent is required' },
          { status: 400 }
        );
      }

      license.agreedRent = parseFloat(proposedRent);
      license.monthlyRent = parseFloat(proposedRent);
      license.negotiationStatus = 'AGREED';

      const agreementMessage = {
        senderId: auth.userId,
        senderRole: 'STATION_MANAGER' as const,
        senderName: managerName,
        message: message || `Agreement reached. Monthly rent set at ₹${proposedRent}.`,
        proposedRent: parseFloat(proposedRent),
        timestamp: new Date(),
      };

      if (!license.negotiationMessages) {
        license.negotiationMessages = [];
      }
      license.negotiationMessages.push(agreementMessage);

      await license.save();

      return NextResponse.json({
        success: true,
        message: 'Agreement reached successfully',
        license: {
          negotiationMessages: license.negotiationMessages,
          negotiationStatus: license.negotiationStatus,
          agreedRent: license.agreedRent,
        },
      });
    }

    // Regular message
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const negotiationMessage = {
      senderId: auth.userId,
      senderRole: 'STATION_MANAGER' as const,
      senderName: managerName,
      message,
      proposedRent: proposedRent ? parseFloat(proposedRent) : undefined,
      timestamp: new Date(),
    };

    if (!license.negotiationMessages) {
      license.negotiationMessages = [];
    }
    license.negotiationMessages.push(negotiationMessage);

    // Update negotiation status
    if (license.negotiationStatus === 'PENDING') {
      license.negotiationStatus = 'IN_PROGRESS';
    }

    await license.save();

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      license: {
        negotiationMessages: license.negotiationMessages,
        negotiationStatus: license.negotiationStatus,
      },
    });
  } catch (error) {
    console.error('Negotiation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
