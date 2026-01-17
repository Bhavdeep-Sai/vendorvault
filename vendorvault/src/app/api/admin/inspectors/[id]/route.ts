import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Inspector from '@/models/Inspector';
import User from '@/models/User';
import mongoose from 'mongoose';
import { verifyAuthToken } from '@/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request);
    if (!auth.success || !auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.user.role !== 'RAILWAY_ADMIN' && auth.user.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const inspectorId = id || request.nextUrl.pathname.split('/').pop();
    if (!inspectorId) return NextResponse.json({ error: 'Inspector ID required' }, { status: 400 });

    const inspector = await Inspector.findById(inspectorId).populate('userId', 'fullName email phone').lean();
    if (!inspector) return NextResponse.json({ error: 'Inspector not found' }, { status: 404 });

    return NextResponse.json({ success: true, inspector });
  } catch (err) {
    console.error('Error fetching inspector:', err);
    return NextResponse.json({ error: 'Failed to fetch inspector', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request);
    if (!auth.success || !auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.user.role !== 'RAILWAY_ADMIN' && auth.user.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { inspectorId, designation, status, contactNumber, email } = body;
    if (!inspectorId) return NextResponse.json({ error: 'inspectorId required' }, { status: 400 });

    const inspector = await Inspector.findById(inspectorId);
    if (!inspector) return NextResponse.json({ error: 'Inspector not found' }, { status: 404 });

    if (designation) inspector.designation = designation;
    if (typeof status === 'string') inspector.status = status as any;
    if (contactNumber) inspector.contactNumber = contactNumber;
    if (email) inspector.email = email;

    await inspector.save();

    return NextResponse.json({ success: true, inspector });
  } catch (err) {
    console.error('Error updating inspector:', err);
    return NextResponse.json({ error: 'Failed to update inspector', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request);
    if (!auth.success || !auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.user.role !== 'RAILWAY_ADMIN' && auth.user.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const inspectorId = id || request.nextUrl.pathname.split('/').pop();
    if (!inspectorId) return NextResponse.json({ error: 'Inspector ID required' }, { status: 400 });

    // Soft-delete: mark INACTIVE
    const inspector = await Inspector.findById(inspectorId);
    if (!inspector) return NextResponse.json({ error: 'Inspector not found' }, { status: 404 });
    inspector.status = 'INACTIVE';
    await inspector.save();

    return NextResponse.json({ success: true, message: 'Inspector deactivated', inspector });
  } catch (err) {
    console.error('Error deleting inspector:', err);
    return NextResponse.json({ error: 'Failed to delete inspector', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
