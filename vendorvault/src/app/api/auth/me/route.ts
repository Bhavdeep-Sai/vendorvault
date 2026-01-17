import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Vendor from '@/models/Vendor';
import { getAuthUser } from '@/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(auth.userId).select('-password');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let vendor = null;
    if (user.role === 'VENDOR') {
      vendor = await Vendor.findOne({ userId: user._id });
    }

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        photo: user.photo,
        role: user.role,
        status: user.status,
        verificationStatus: user.verificationStatus,
        documents: user.documents || {},
      },
      vendor: vendor ? {
        id: vendor._id,
        businessName: vendor.businessName,
        businessType: vendor.businessType,
        stationName: vendor.stationName,
        platformNumber: vendor.platformNumber,
        stallLocationDescription: vendor.stallLocationDescription,
      } : null,
    });
  } catch (error: unknown) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get user' },
      { status: 500 }
    );
  }
}

