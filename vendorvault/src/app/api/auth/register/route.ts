import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Vendor from '@/models/Vendor';
import { hashPassword, generateToken } from '@/lib/auth';
import { COOKIE_MAX_AGE } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { 
      name, email, phone, password, role, 
      dateOfBirth, addressLine, state, pinCode,
      aadhaarNumber, panNumber,
      emergencyContact, emergencyRelation,
      vendorData 
    } = body;

    // Validate input
    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Only allow VENDOR role from frontend registration
    // ADMIN and INSPECTOR must be created manually in the backend
    const userRole = role === 'VENDOR' ? 'VENDOR' : 'VENDOR';
    
    // If someone tries to register as ADMIN or INSPECTOR, reject it
    if (role && role !== 'VENDOR') {
      return NextResponse.json(
        { error: 'Only vendor registration is allowed. Station Manager and Inspector accounts must be created through the application process.' },
        { status: 403 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Helper function to capitalize first letter of each word
    const capitalizeWords = (str: string) => {
      if (!str) return str;
      return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };

    // Process address components
    const processedName = capitalizeWords(name);
    const processedAddressLine = addressLine ? capitalizeWords(addressLine) : '';
    const processedState = state ? capitalizeWords(state) : '';
    const formattedAddress = (addressLine && state && pinCode) 
      ? `${processedAddressLine}, ${processedState} - ${pinCode}` 
      : '';

    // Create user (only VENDOR role allowed from frontend)
    const user = await User.create({
      name: processedName,
      email,
      phone,
      password: hashedPassword,
      role: 'VENDOR', // Force VENDOR role
      dateOfBirth,
      address: formattedAddress,
      aadhaarNumber,
      panNumber: panNumber?.toUpperCase(),
      emergencyContact,
      emergencyRelation,
    });

    // Create vendor profile with business info from registration
    // Station details will be added when they apply
    if (vendorData && (vendorData.businessName || vendorData.businessType)) {
      const vendorPayload = {
        userId: user._id,
        businessName: vendorData.businessName ? capitalizeWords(vendorData.businessName) : 'Not specified',
        ownerName: vendorData.ownerName ? capitalizeWords(vendorData.ownerName) : processedName,
        businessType: vendorData.businessType || 'other',
        gstNumber: vendorData.gstNumber?.toUpperCase() || '',
        address: vendorData.businessAddress ? capitalizeWords(vendorData.businessAddress) : '',
        email: vendorData.email || email,
        contactNumber: vendorData.contactNumber || phone,
        stationName: 'TBD', // Will be set during application
        stallLocationDescription: 'TBD', // Will be set during application
      };
      
      console.log('Creating vendor with payload:', vendorPayload);
      await Vendor.create(vendorPayload);
    }

    // Generate token
    const token = generateToken(user._id.toString(), user.role);

    const response = NextResponse.json(
      {
        message: 'User registered successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );

    // Set cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration failed' },
      { status: 500 }
    );
  }
}

