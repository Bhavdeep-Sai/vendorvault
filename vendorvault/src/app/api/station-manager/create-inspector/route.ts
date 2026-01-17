import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAuthToken } from '@/middleware/auth';
import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '@/lib/constants';

// Create inspector (Station Manager only)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request);
    
    // Only station managers can create inspectors
    if (!auth.success || auth.user?.role !== 'STATION_MANAGER' || auth.user?.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Unauthorized - Only active station managers can create inspectors' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { name, email, phone, password } = body;

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate phone number (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
      return NextResponse.json(
        { error: 'Phone number must be 10 digits' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if user with email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create inspector user
    const inspector = await User.create({
      name,
      email: email.toLowerCase().trim(),
      phone,
      password: hashedPassword,
      role: 'INSPECTOR',
      status: 'ACTIVE',
      // Optional: Link inspector to the station manager
      approvedBy: auth.user?.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Inspector created successfully',
      inspector: {
        id: inspector._id,
        name: inspector.name,
        email: inspector.email,
        phone: inspector.phone,
        role: inspector.role,
        status: inspector.status,
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create inspector error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create inspector' },
      { status: 500 }
    );
  }
}

// Get all inspectors created by the station manager
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request);
    
    if (!auth.success || auth.user?.role !== 'STATION_MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized - Station Manager access required' },
        { status: 403 }
      );
    }

    await connectDB();

    // Fetch inspectors created by this station manager
    const inspectors = await User.find({
      role: 'INSPECTOR',
      approvedBy: auth.user.id
    })
    .select('-password')
    .sort({ createdAt: -1 })
    .lean();

    return NextResponse.json({
      success: true,
      inspectors
    });

  } catch (error: any) {
    console.error('Get inspectors error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch inspectors' },
      { status: 500 }
    );
  }
}
