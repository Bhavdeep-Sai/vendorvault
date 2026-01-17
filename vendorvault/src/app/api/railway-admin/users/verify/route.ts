import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUser } from '@/middleware/auth';

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== 'RAILWAY_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, verificationStatus } = await request.json();

    if (!userId || !verificationStatus) {
      return NextResponse.json(
        { error: 'User ID and verification status required' },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        verificationStatus,
        status: verificationStatus === 'VERIFIED' ? 'ACTIVE' : 'REJECTED'
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      message: `User ${verificationStatus.toLowerCase()} successfully`,
      user
    });
  } catch (error) {
    console.error('Verify user error:', error);
    return NextResponse.json(
      { error: 'Failed to verify user' },
      { status: 500 }
    );
  }
}
