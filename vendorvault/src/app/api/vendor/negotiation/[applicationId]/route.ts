import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import NegotiationRoom from '@/models/NegotiationRoom';
import ShopApplication from '@/models/ShopApplication';
import Vendor from '@/models/Vendor';
import User from '@/models/User';
import { getAuthUser } from '@/middleware/auth';

// GET /api/vendor/negotiation/[applicationId] - Get negotiation room details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { applicationId } = await params;

    // Get vendor profile
    const vendor = await Vendor.findOne({ userId: user.userId });
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 });
    }

    // Verify application belongs to vendor
    const application = await ShopApplication.findOne({
      _id: applicationId,
      vendorId: vendor._id
    }).populate('stationId', 'name location');

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Get or create negotiation room
    let negotiationRoom = await NegotiationRoom.findOne({ applicationId })
      .populate('participants.userId', 'name email role')
      .populate('messages.senderId', 'name email role')
      .sort({ 'messages.timestamp': -1 });

    if (!negotiationRoom) {
      // Create negotiation room if it doesn't exist
      negotiationRoom = new NegotiationRoom({
        applicationId,
        participants: [
          {
            userId: vendor.userId,
            role: 'VENDOR',
            joinedAt: new Date(),
          }
        ],
        status: 'ACTIVE',
        currentRentOffer: application.quotedRent,
        messages: [],
      });
      await negotiationRoom.save();
    }

    return NextResponse.json({
      success: true,
      negotiation: negotiationRoom,
      application: {
        _id: application._id,
        shopId: application.shopId,
        stationName: application.stationName,
        platformName: application.platformName,
        quotedRent: application.quotedRent,
        securityDeposit: application.securityDeposit,
        status: application.status,
      },
    });
  } catch (error) {
    console.error('Error fetching negotiation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch negotiation' },
      { status: 500 }
    );
  }
}

// POST /api/vendor/negotiation/[applicationId] - Send message or rent proposal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { applicationId } = await params;

    // Get vendor profile
    const vendor = await Vendor.findOne({ userId: user.userId })
      .populate('userId', 'name email');
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 });
    }

    // Verify application belongs to vendor
    const application = await ShopApplication.findOne({
      _id: applicationId,
      vendorId: vendor._id
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const body = await request.json();
    const { message, proposedRent } = body;

    if (!message && !proposedRent) {
      return NextResponse.json(
        { error: 'Message or rent proposal is required' },
        { status: 400 }
      );
    }

    // Get or create negotiation room
    let negotiationRoom = await NegotiationRoom.findOne({ applicationId });
    
    if (!negotiationRoom) {
      negotiationRoom = new NegotiationRoom({
        applicationId,
        participants: [
          {
            userId: vendor.userId,
            role: 'VENDOR',
            joinedAt: new Date(),
          }
        ],
        status: 'ACTIVE',
        currentRentOffer: application.quotedRent,
        messages: [],
      });
    }

    // Add message to negotiation
    const newMessage = {
      senderId: vendor.userId,
      senderRole: 'VENDOR',
      message: message || `Rent proposal: ₹${proposedRent}`,
      proposedRent: proposedRent ? parseFloat(proposedRent) : undefined,
      timestamp: new Date(),
    };

    negotiationRoom.messages.push(newMessage);
    
    // Update current rent offer if provided
    if (proposedRent) {
      negotiationRoom.currentRentOffer = parseFloat(proposedRent);
    }

    negotiationRoom.lastActivity = new Date();
    await negotiationRoom.save();

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      negotiation: negotiationRoom,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
        proposedRent: license.proposedRent,
        agreedRent: license.agreedRent,
        monthlyRent: license.monthlyRent,
        negotiationStatus: license.negotiationStatus,
        negotiationMessages: license.negotiationMessages || [],
        shopId: license.shopId,
        shopWidth: license.shopWidth,
      },
      vendor: {
        businessName: vendor.businessName,
        stationName: vendor.stationName,
        stationCode: vendor.stationCode,
        platformNumber: vendor.platformNumber,
      },
    });
  } catch (error: unknown) {
    console.error('GET Negotiation error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch negotiation' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const auth = getAuthUser(req);
    if (!auth || auth.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { applicationId } = await params;

    // Optimized query with specific field selection and lean populate
    const license = await License.findById(applicationId)
      .select('negotiationMessages proposedRent negotiationStatus vendorId')
      .populate({
        path: 'vendorId',
        select: 'userId businessName'
      });
    
    if (!license) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Verify vendor owns this license
    const vendor = license.vendorId as unknown as { userId: { toString: () => string }; businessName: string };
    if (vendor.userId.toString() !== auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { message, proposedRent } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Add message to negotiation
    const negotiationMessage = {
      senderId: auth.userId,
      senderRole: 'VENDOR' as const,
      senderName: vendor.businessName || 'Vendor',
      message,
      proposedRent: proposedRent ? parseFloat(proposedRent) : undefined,
      timestamp: new Date(),
    };

    if (!license.negotiationMessages) {
      license.negotiationMessages = [];
    }
    license.negotiationMessages.push(negotiationMessage);

    // Update proposed rent if provided
    if (proposedRent) {
      license.proposedRent = parseFloat(proposedRent);
    }

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
  } catch (error: unknown) {
    console.error('POST Negotiation error:', error);
    return NextResponse.json(
      { error: 'Failed to process negotiation' },
      { status: 500 }
    );
  }
}

