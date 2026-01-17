import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Vendor from '@/models/Vendor';
import License from '@/models/License';
import Document from '@/models/Document';
import { requireRole } from '@/middleware/auth';

async function handler(req: NextRequest, userId: string, role: string) {
  try {
    await connectDB();

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor profile not found' },
        { status: 404 }
      );
    }

    // Support vendorId stored either as Vendor._id or as the linked User._id (vendor.userId)
    const vendorIdCandidates = [vendor._id];
    if (vendor.userId) vendorIdCandidates.push(vendor.userId);
    const licenses = await License.find({ vendorId: { $in: vendorIdCandidates } })
      .sort({ createdAt: -1 })
      .populate('createdByAdminId', 'name email');

    // Fetch documents for the vendor
    const documents = await Document.find({ vendorId: vendor._id });

    // Attach documents to each license
    const licensesWithData = licenses.map(license => ({
      ...license.toObject(),
      documents: documents,
      qrCodeUrl: license.qrCodeUrl,
      qrCodeData: license.qrCodeData,
    }));

    return NextResponse.json({ licenses: licensesWithData });
  } catch (error: any) {
    console.error('Get license error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get license' },
      { status: 500 }
    );
  }
}

export const GET = requireRole(['VENDOR'])(handler);

