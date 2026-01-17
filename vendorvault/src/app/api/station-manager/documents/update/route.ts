import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/middleware/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);

    if (!user || user.role !== 'STATION_MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { documentType, url } = await req.json();

    if (!documentType || !url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const validDocuments = ['aadhaarCard', 'panCard', 'railwayIdCard', 'photograph'];
    if (!validDocuments.includes(documentType)) {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      );
    }

    // Update user document
    const updatedUser = await User.findByIdAndUpdate(
      user.userId,
      {
        [`documents.${documentType}`]: url,
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Document updated successfully',
      document: { type: documentType, url },
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
