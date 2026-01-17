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

    const { userId, documentType, verified } = await request.json();

    if (!userId || !documentType || typeof verified !== 'boolean') {
      return NextResponse.json(
        { error: 'User ID, document type, and verified status required' },
        { status: 400 }
      );
    }

    const updateField: any = {};
    
    if (documentType === 'aadhaar') {
      updateField.aadhaarVerified = verified;
    } else if (documentType === 'pan') {
      updateField.panVerified = verified;
    } else {
      return NextResponse.json(
        { error: 'Invalid document type. Use "aadhaar" or "pan"' },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateField,
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      message: `${documentType.toUpperCase()} ${verified ? 'verified' : 'rejected'} successfully`,
      user
    });
  } catch (error) {
    console.error('Verify document error:', error);
    return NextResponse.json(
      { error: 'Failed to verify document' },
      { status: 500 }
    );
  }
}
