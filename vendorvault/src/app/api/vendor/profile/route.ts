import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import Vendor from '@/models/Vendor';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get user details (personal information)
    const user = await User.findById(authUser.userId).lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get vendor details (business information)
    let vendor = await Vendor.findOne({ userId: authUser.userId }).lean();

    // If vendor profile doesn't exist, create a default one
    if (!vendor) {
      const newVendor = await Vendor.create({
        userId: authUser.userId,
        businessName: '',
        gstNumber: '',
        businessType: '',
        profileCompleted: false,
      });
      
      vendor = await Vendor.findById(newVendor._id).lean();
    }

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor profile could not be created' },
        { status: 500 }
      );
    }

    // Return separate user and vendor data
    return NextResponse.json({ 
      user: {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        photo: user.photo || '',
        aadhaarNumber: user.aadhaarNumber || '',
        panNumber: user.panNumber || '',
        dateOfBirth: user.dateOfBirth || '',
        address: user.address || '',
        emergencyContact: user.emergencyContact || '',
        emergencyRelation: user.emergencyRelation || '',
      },
      vendor: {
        businessName: vendor.businessName || '',
        gstNumber: vendor.gstNumber || '',
        businessType: vendor.businessType || '',
        customBusinessType: vendor.customBusinessType || '',
        profileCompleted: vendor.profileCompleted || false,
      }
    });
  } catch (error) {
    console.error('Error fetching vendor profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const {
      // User fields (personal information)
      name,
      email,
      phone,
      photo,
      aadhaarNumber,
      panNumber,
      dateOfBirth,
      address,
      emergencyContact,
      emergencyRelation,
      
      // Vendor fields (business information)
      businessName,
      gstNumber,
      businessType,
      customBusinessType,
    } = data;

    // Validation for required fields
    const requiredUserFields = {
      name,
      email,
      phone,
      aadhaarNumber,
      panNumber,
      dateOfBirth,
      address,
      emergencyContact,
      emergencyRelation,
    };

    const requiredVendorFields = {
      businessName,
      businessType,
    };

    // Check for missing user fields
    const missingUserFields = Object.entries(requiredUserFields)
      .filter(([_, value]) => !value?.toString().trim())
      .map(([key]) => key);

    if (missingUserFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingUserFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Check for missing vendor fields
    const missingVendorFields = Object.entries(requiredVendorFields)
      .filter(([_, value]) => !value?.toString().trim())
      .map(([key]) => key);

    if (missingVendorFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingVendorFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate phone number
    const phoneRegex = /^\+?\d{10,15}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return NextResponse.json(
        { error: 'Please enter a valid phone number' },
        { status: 400 }
      );
    }

    // Validate Aadhaar number (12 digits)
    if (!/^\d{12}$/.test(aadhaarNumber.replace(/\s/g, ''))) {
      return NextResponse.json(
        { error: 'Aadhaar number must be 12 digits' },
        { status: 400 }
      );
    }

    // Validate PAN number (e.g., ABCDE1234F)
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(panNumber.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid PAN format (e.g., ABCDE1234F)' },
        { status: 400 }
      );
    }

    await connectDB();

    // Update User model with personal information
    const updatedUser = await User.findByIdAndUpdate(
      authUser.userId,
      {
        name,
        email,
        photo: photo || undefined,
        phone,
        aadhaarNumber,
        panNumber,
        dateOfBirth,
        address,
        emergencyContact,
        emergencyRelation,
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update or create Vendor model with business information
    let vendor = await Vendor.findOne({ userId: authUser.userId });
    if (!vendor) {
      vendor = new Vendor({
        userId: authUser.userId,
        businessName,
        gstNumber: gstNumber || '',
        businessType,
        customBusinessType: customBusinessType || '',
        profileCompleted: true,
      });
    } else {
      vendor.set({
        businessName,
        gstNumber: gstNumber || '',
        businessType,
        customBusinessType: customBusinessType || '',
        profileCompleted: true,
      });
    }

    await vendor.save();

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        photo: updatedUser.photo,
        phone: updatedUser.phone,
        aadhaarNumber: updatedUser.aadhaarNumber,
        panNumber: updatedUser.panNumber,
        dateOfBirth: updatedUser.dateOfBirth,
        address: updatedUser.address,
        emergencyContact: updatedUser.emergencyContact,
        emergencyRelation: updatedUser.emergencyRelation,
      },
      vendor: {
        businessName: vendor.businessName,
        gstNumber: vendor.gstNumber,
        businessType: vendor.businessType,
        customBusinessType: vendor.customBusinessType,
        profileCompleted: vendor.profileCompleted,
      },
    });
  } catch (error) {
    console.error('Error updating vendor profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// Keep the existing PATCH method for backward compatibility
export async function PATCH(request: NextRequest) {
  return PUT(request);
}
