import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Vendor from '@/models/Vendor';
import License from '@/models/License';
import { requireRole } from '@/middleware/auth';
import { generateLicenseNumber } from '@/lib/utils';

async function handler(req: NextRequest, userId: string, role: string) {
  try {
    await connectDB();

    const body = await req.json();
    const { licenseId } = body;

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor profile not found' },
        { status: 404 }
      );
    }

    // Find current license
    const currentLicense = await License.findOne({
      _id: licenseId,
      vendorId: vendor._id,
    });

    if (!currentLicense) {
      return NextResponse.json(
        { error: 'License not found' },
        { status: 404 }
      );
    }

    if (currentLicense.status !== 'APPROVED' && currentLicense.status !== 'EXPIRED') {
      return NextResponse.json(
        { error: 'Only approved or expired licenses can be renewed' },
        { status: 400 }
      );
    }

    // Check if there's already a pending renewal
    const pendingRenewal = await License.findOne({
      vendorId: vendor._id,
      status: 'PENDING',
    });

    if (pendingRenewal) {
      return NextResponse.json(
        { error: 'You already have a pending application' },
        { status: 400 }
      );
    }

    // Create renewal application
    const licenseNumber = generateLicenseNumber();
    const renewal = await License.create({
      vendorId: vendor._id,
      licenseNumber,
      status: 'PENDING',
    });

    return NextResponse.json(
      {
        message: 'Renewal application submitted successfully',
        license: {
          id: renewal._id,
          licenseNumber: renewal.licenseNumber,
          status: renewal.status,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Renewal error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit renewal' },
      { status: 500 }
    );
  }
}

export const POST = requireRole(['VENDOR'])(handler);

