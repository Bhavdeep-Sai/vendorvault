import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAuthToken } from '@/middleware/auth';
import License from '@/models/License';
import ShopApplication from '@/models/ShopApplication';
import VendorAgreement from '@/models/VendorAgreement';
import VendorPayment from '@/models/VendorPayment';
import InspectorModel from '@/models/Inspector';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request);
    if (!auth.success || !auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const body = await request.json();
    const { qr, licenseNumber } = body;
    if (!qr && !licenseNumber) return NextResponse.json({ error: 'qr or licenseNumber required' }, { status: 400 });

    // locate license by flexible matching
    const q = licenseNumber || qr;

    let license = await License.findOne({ licenseNumber: q })
      .populate('vendorId', 'fullName email phone')
      .populate('applicationId')
      .lean();

    if (!license) {
      // try exact matches on qrCodeData/qrCodeUrl or metadata fields
      license = await License.findOne({
        $or: [
          { qrCodeData: q },
          { qrCodeUrl: q },
          { 'qrCodeMetadata.stallId': q },
          { 'qrCodeMetadata.vendorId': q },
          { 'qrCodeMetadata.stationCode': q },
        ]
      }).populate('vendorId', 'fullName email phone').populate('applicationId').lean();
    }

    if (!license) {
      return NextResponse.json({ success: false, valid: false, message: 'License/QR not found' }, { status: 404 });
    }

    // Authorization: railway admin can view everything. Inspectors limited to their station unless marked otherwise.
    if (auth.user.role !== 'RAILWAY_ADMIN') {
      // require inspector record
      const inspector = await InspectorModel.findOne({ userId: auth.user.id }).lean();
      if (!inspector) return NextResponse.json({ error: 'Inspector profile not found' }, { status: 403 });
      // if inspector has a stationId, restrict to that station
      if (inspector.stationId && license.stationId.toString() !== inspector.stationId.toString()) {
        return NextResponse.json({ error: 'Forbidden - inspector not assigned to this station' }, { status: 403 });
      }
    }

    // Load related application and vendor details with comprehensive information
    const application = license.applicationId ? await ShopApplication.findById(license.applicationId).lean() : null;
    const vendor = license.vendorId ? await User.findById(license.vendorId).select('fullName email phone').lean() : null;

    // Get comprehensive vendor business details
    const Vendor = (await import('@/models/Vendor')).default;
    const vendorProfile = vendor ? await Vendor.findOne({ userId: license.vendorId }).lean() : null;
    
    const VendorBusiness = (await import('@/models/VendorBusiness')).default;
    const businessProfile = vendorProfile ? await VendorBusiness.findOne({ vendorId: license.vendorId }).lean() : null;
    
    const VendorFinancial = (await import('@/models/VendorFinancial')).default;
    const financialProfile = vendorProfile ? await VendorFinancial.findOne({ vendorId: license.vendorId }).lean() : null;
    
    const VendorBank = (await import('@/models/VendorBank')).default;
    const bankProfile = vendorProfile ? await VendorBank.findOne({ vendorId: license.vendorId }).lean() : null;
    
    // Get station details
    const Station = (await import('@/models/Station')).default;
    const station = await Station.findById(license.stationId).lean();

    // Agreement (if any)
    const agreement = await VendorAgreement.findOne({ applicationId: license.applicationId }).lean();

    // Payments summary for this application
    const payments = await VendorPayment.find({ applicationId: license.applicationId }).lean();
    const paymentSummary = payments.reduce((acc: any, p: any) => {
      acc.totalAmount = (acc.totalAmount || 0) + (p.amount || 0);
      acc.paidAmount = (acc.paidAmount || 0) + (p.paidAmount || 0);
      if (p.paymentType === 'SECURITY_DEPOSIT') acc.security = acc.security || { amount: 0, paid: 0 };
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      valid: true,
      license,
      application,
      vendor: vendor ? {
        // Basic Information
        _id: vendor._id,
        fullName: vendor.fullName,
        email: vendor.email,
        phone: vendor.phone,
        
        // Enhanced Business Details
        businessName: vendorProfile?.businessName || businessProfile?.businessName || 'N/A',
        businessType: vendorProfile?.businessType || businessProfile?.businessCategory || 'N/A',
        businessDescription: businessProfile?.description || 'N/A',
        businessRegistration: businessProfile?.registrationNumber || 'N/A',
        gstNumber: businessProfile?.gstNumber || financialProfile?.gstNumber || 'N/A',
        panNumber: financialProfile?.panNumber || 'N/A',
        
        // Address Details
        businessAddress: businessProfile?.address || vendorProfile?.address || 'N/A',
        city: businessProfile?.city || vendorProfile?.city || 'N/A',
        state: businessProfile?.state || vendorProfile?.state || 'N/A',
        pincode: businessProfile?.pincode || vendorProfile?.pincode || 'N/A',
        
        // Bank Details
        bankName: bankProfile?.bankName || 'N/A',
        accountHolderName: bankProfile?.accountHolderName || 'N/A',
        ifscCode: bankProfile?.ifscCode || 'N/A',
        
        // Experience
        experienceYears: businessProfile?.experienceYears || 0,
        previousExperience: businessProfile?.previousExperience || false,
      } : null,
      shop: {
        name: license.shopName || application?.shopName || 'N/A',
        id: license.shopId || application?.shopId || 'N/A',
        description: license.shopDescription || application?.businessPlan || 'N/A',
        location: {
          station: station?.stationName || station?.name || 'N/A',
          stationCode: station?.stationCode || license.stationCode || 'N/A',
          platform: application?.platformNumber ? `Platform ${application.platformNumber}` : 'N/A',
        }
      },
      financial: {
        monthlyRent: license.monthlyRent || 0,
        securityDeposit: license.securityDeposit || 0,
        proposedRent: license.proposedRent || application?.quotedRent || 0,
        agreedRent: license.agreedRent || license.monthlyRent || 0,
        rentStatus: license.status === 'ACTIVE' ? 'CURRENT' : 'INACTIVE',
        depositStatus: license.securityDeposit ? 'PAID' : 'PENDING',
      },
      agreement,
      payments,
      paymentSummary,
      scanInfo: {
        scannedAt: new Date().toISOString(),
        scannedBy: auth.user.name || 'Inspector',
        inspectorId: auth.user.id,
        dataFormat: license.qrCodeMetadata?.dataFormat || 'UNKNOWN'
      }
    });

  } catch (err) {
    console.error('Inspector scan error:', err);
    return NextResponse.json({ error: 'Failed to validate QR', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
