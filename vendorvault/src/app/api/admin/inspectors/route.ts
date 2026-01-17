import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Inspector from '@/models/Inspector';
import User from '@/models/User';
import Station from '@/models/Station';
import mongoose from 'mongoose';
import { verifyAuthToken } from '@/middleware/auth';

// GET: list inspectors (admin) or POST: create inspector record
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request);
    if (!auth.success || !auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Only railway admin or station manager may list; station manager limited to their station
    if (auth.user.role !== 'RAILWAY_ADMIN' && auth.user.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const url = new URL(request.url);
    const stationId = url.searchParams.get('stationId');
    const status = url.searchParams.get('status');

    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    if (auth.user.role === 'STATION_MANAGER') {
      // limit to station managed by this user
      const station = await Station.findOne({ stationManagerId: auth.user.id });
      if (!station) return NextResponse.json({ error: 'Station not assigned' }, { status: 400 });
      query.stationId = station._id;
    } else if (stationId) {
      query.stationId = stationId;
    }

    const inspectors = await Inspector.find(query)
      .populate('userId', 'fullName email phone')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, inspectors, count: inspectors.length });
  } catch (err) {
    console.error('Error listing inspectors:', err);
    return NextResponse.json({ error: 'Failed to list inspectors', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request);
    if (!auth.success || !auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Only railway admin or station manager can create/assign inspectors
    if (auth.user.role !== 'RAILWAY_ADMIN' && auth.user.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { userId: userIdFromBody, name, zone, employeeId, designation, stationId: stationIdFromBody, contactNumber, email, password } = body;
    let userId = userIdFromBody;

    if (!employeeId || !designation) {
      return NextResponse.json({ error: 'employeeId and designation are required' }, { status: 400 });
    }

    // If no userId provided, create a user using provided name/email/password
    let user: typeof User.prototype | null = null;
    if (!userId) {
      if (!email || !password || !name) {
        return NextResponse.json({ error: 'name, email and password are required to create a user' }, { status: 400 });
      }
      // check existing
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        user = existing;
      } else {
        const { hashPassword } = await import('@/lib/auth');
        const hashed = await hashPassword(password);
        const newUser = new User({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone: contactNumber || '',
          password: hashed,
          role: 'INSPECTOR',
          status: 'ACTIVE',
        });
        await newUser.save();
        user = newUser;
      }
      userId = user._id.toString();
    } else {
      // Validate user exists
      user = await User.findById(userId);
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine stationId if station manager creating
    let targetStationId = stationIdFromBody;
    if (!targetStationId && auth.user.role === 'STATION_MANAGER') {
      const station = await Station.findOne({ stationManagerId: auth.user.id });
      if (!station) return NextResponse.json({ error: 'Station not assigned' }, { status: 400 });
      targetStationId = station._id;
    }
    if (!targetStationId) return NextResponse.json({ error: 'stationId is required' }, { status: 400 });

    // Ensure not already an inspector
    const exists = await Inspector.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (exists) return NextResponse.json({ error: 'Inspector already exists for this user' }, { status: 400 });

    const inspector = new Inspector({
      userId: new mongoose.Types.ObjectId(userId),
      stationId: new mongoose.Types.ObjectId(targetStationId),
      employeeId: employeeId.trim(),
      designation: designation.trim(),
      assignedBy: new mongoose.Types.ObjectId(auth.user.id),
      assignedDate: new Date(),
      status: 'ACTIVE',
      contactNumber: contactNumber || user.phone || undefined,
      email: email || user.email || undefined,
      zone: zone || undefined,
    });

    await inspector.save();

    // Ensure user's role is INSPECTOR
    if (user.role !== 'INSPECTOR') {
      user.role = 'INSPECTOR';
      await user.save();
    }

    return NextResponse.json({ success: true, inspector });
  } catch (err) {
    console.error('Error creating inspector:', err);
    return NextResponse.json({ error: 'Failed to create inspector', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
