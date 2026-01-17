import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUser } from '@/middleware/auth';
import { createNotification } from '@/lib/notifications';

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== 'RAILWAY_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, documentType, reason } = await request.json();

    if (!userId || !documentType || !reason) {
      return NextResponse.json(
        { error: 'User ID, document type, and reason required' },
        { status: 400 }
      );
    }

    // Remove the rejected document from user's documents
    const updatePath = `documents.${documentType}`;
    const user = await User.findByIdAndUpdate(
      userId,
      { $unset: { [updatePath]: "" } },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create notification for user
    await createNotification({
      userId: user._id,
      title: 'Document Rejected',
      message: `Your ${documentType.replace(/([A-Z])/g, ' $1').trim()} has been rejected. Reason: ${reason}. Please re-upload a valid document.`,
      type: 'DOCUMENT_REJECTED',
      actionUrl: '/station-manager/documents',
      metadata: { documentType, reason }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Document rejected and notification sent'
    });
  } catch (error) {
    console.error('Reject document error:', error);
    return NextResponse.json(
      { error: 'Failed to reject document' },
      { status: 500 }
    );
  }
}
