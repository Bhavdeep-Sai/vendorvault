import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import License from '@/models/License';
import Vendor from '@/models/Vendor';
import User from '@/models/User';
import Document from '@/models/Document';
import { requireRole } from '@/middleware/auth';
import { getPaginationParams, createPaginationResult } from '@/lib/pagination';

async function handler(req: NextRequest, userId: string, role: string) {
  try {
    await connectDB();

    // Check if admin is active
    const adminUser = await User.findById(userId);
    if (!adminUser || adminUser.role !== 'RAILWAY_ADMIN' || adminUser.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Access denied. Super admin account required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const { skip, limit, page } = getPaginationParams(searchParams, 10, 100);

    const query: any = {};
    if (status) {
      query.status = status;
    }

    // Get total count for pagination
    const totalItems = await License.countDocuments(query);

    const licenses = await License.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'vendorId',
        populate: {
          path: 'userId',
          select: 'name email phone',
        },
      })
      .populate('createdByAdminId', 'name email');

    const result = createPaginationResult(licenses, totalItems, page, limit);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Get applications error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get applications' },
      { status: 500 }
    );
  }
}

export const GET = requireRole(['RAILWAY_ADMIN'])(handler);

