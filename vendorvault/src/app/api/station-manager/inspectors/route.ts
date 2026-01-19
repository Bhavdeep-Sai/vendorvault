import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Inspector from '@/models/Inspector';
import Station from '@/models/Station';
import User from '@/models/User';
import { verifyAuthToken } from '@/middleware/auth';

// GET: Fetch all inspectors for station manager's station
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || authResult.user?.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const station = await Station.findOne({ stationManagerId: authResult.user.id });
    if (!station) {
      return NextResponse.json({ error: 'Station not assigned' }, { status: 400 });
    }

    const inspectors = await Inspector.find({ 
      stationId: station._id 
    })
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ 
      success: true, 
      inspectors,
      count: inspectors.length 
    });

  } catch (error) {
    console.error('Error fetching inspectors:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch inspectors',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// POST: Add a new inspector (simplified version - in production would need proper user creation flow)
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || authResult.user?.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    let { userId, name, email, password, employeeId, designation, contactNumber } = body;

    // If userId not provided, allow creating a user using name/email/password
    if (!userId) {
      if (!email || !password || !name) {
        return NextResponse.json({ error: 'name, email and password are required to create inspector' }, { status: 400 });
      }
      // check if user exists by email
      let existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        userId = existing._id.toString();
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
        userId = newUser._id.toString();
      }
    }

    if (!userId || !employeeId) {
      return NextResponse.json({ 
        error: 'User ID and Employee ID are required' 
      }, { status: 400 });
    }

    const station = await Station.findOne({ stationManagerId: authResult.user.id });
    if (!station) {
      return NextResponse.json({ error: 'Station not assigned' }, { status: 400 });
    }

    // Check if inspector already exists
    const existingInspector = await Inspector.findOne({ userId });
    if (existingInspector) {
      return NextResponse.json({ 
        error: 'Inspector already exists for this user' 
      }, { status: 400 });
    }

    const newInspector = new Inspector({
      userId,
      stationId: station._id,
      employeeId,
      designation: designation || 'Inspector',
      contactNumber,
      assignedBy: authResult.user.id,
      status: 'ACTIVE',
    });

    await newInspector.save();

    // Update user role to INSPECTOR if needed
    try {
      const user = await User.findById(userId);
      if (user && user.role !== 'INSPECTOR') {
        user.role = 'INSPECTOR';
        await user.save();
      }
    } catch (e) {
      console.warn('Failed to update user role for inspector:', e?.message || e);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Inspector added successfully',
      inspector: newInspector 
    });

  } catch (error) {
    console.error('Error updating inspector:', error);
    return NextResponse.json({ 
      error: 'Failed to update inspector',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
