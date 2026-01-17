import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Vendor from '@/models/Vendor';
import User from '@/models/User';
import Document from '@/models/Document';
import { getAuthUser } from '@/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== 'VENDOR') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile (personal information)
    const user = await User.findById(authUser.userId);
    if (!user) {
      return NextResponse.json(
        { 
          isValid: false,
          profileComplete: false,
          documentsComplete: false,
          missingProfileFields: ['All profile fields'],
          missingDocuments: ['AADHAAR', 'PAN', 'BANK_STATEMENT', 'POLICE_VERIFICATION', 'RAILWAY_DECLARATION'],
          message: 'User profile not found'
        },
        { status: 200 }
      );
    }

    // Get vendor profile (business information)
    const vendor = await Vendor.findOne({ userId: authUser.userId });
    if (!vendor) {
      return NextResponse.json(
        { 
          isValid: false,
          profileComplete: false,
          documentsComplete: false,
          missingProfileFields: ['All business fields'],
          missingDocuments: ['AADHAAR', 'PAN', 'BANK_STATEMENT', 'POLICE_VERIFICATION', 'RAILWAY_DECLARATION'],
          message: 'Please create your vendor profile first'
        },
        { status: 200 }
      );
    }

    // Check profile completeness - User fields
    const requiredUserFields = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      aadhaarNumber: user.aadhaarNumber,
      panNumber: user.panNumber,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      emergencyContact: user.emergencyContact,
      emergencyRelation: user.emergencyRelation,
    };

    // Check profile completeness - Vendor fields
    const requiredVendorFields = {
      businessName: vendor.businessName,
      businessType: vendor.businessType,
    };

    const missingUserFields = Object.entries(requiredUserFields)
      .filter(([, value]) => !value || (typeof value === 'string' && value.trim() === ''))
      .map(([key]) => key);

    const missingVendorFields = Object.entries(requiredVendorFields)
      .filter(([, value]) => !value || (typeof value === 'string' && value.trim() === ''))
      .map(([key]) => key);

    const missingProfileFields = [...missingUserFields, ...missingVendorFields];
    const profileComplete = missingProfileFields.length === 0;

    // Check required documents
    const documents = await Document.find({ vendorId: vendor._id });
    const requiredDocTypes: ('AADHAAR' | 'PAN' | 'BANK_STATEMENT' | 'POLICE_VERIFICATION' | 'RAILWAY_DECLARATION')[] = ['AADHAAR', 'PAN', 'BANK_STATEMENT', 'POLICE_VERIFICATION', 'RAILWAY_DECLARATION'];
    const uploadedDocTypes = documents.map(doc => doc.type);
    
    const missingDocuments = requiredDocTypes.filter(
      type => !uploadedDocTypes.includes(type)
    );

    const documentsComplete = missingDocuments.length === 0;

    // Update profileCompleted flag
    if (profileComplete && documentsComplete && !vendor.profileCompleted) {
      vendor.profileCompleted = true;
      await vendor.save();
    } else if ((!profileComplete || !documentsComplete) && vendor.profileCompleted) {
      vendor.profileCompleted = false;
      await vendor.save();
    }

    return NextResponse.json({
      isValid: profileComplete && documentsComplete,
      profileComplete,
      documentsComplete,
      missingProfileFields,
      missingDocuments,
      message: profileComplete && documentsComplete 
        ? 'Profile and documents are complete' 
        : 'Please complete your profile and upload required documents',
    });
  } catch (error) {
    console.error('Validation check error:', error);
    return NextResponse.json(
      { error: 'Failed to check validation' },
      { status: 500 }
    );
  }
}
