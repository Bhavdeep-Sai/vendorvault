import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import VendorPayment from '@/models/VendorPayment';
import Station from '@/models/Station';
import mongoose from 'mongoose';
import { verifyAuthToken } from '@/middleware/auth';

// GET: Fetch all payments for station manager's station
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || authResult.user?.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const vendorId = searchParams.get('vendorId');
    const paymentType = searchParams.get('paymentType');

    const station = await Station.findOne({ stationManagerId: authResult.user.id });
    if (!station) {
      return NextResponse.json({ error: 'Station not assigned' }, { status: 400 });
    }

    const query: Record<string, unknown> = { stationId: station._id };
    if (status) query.status = status;
    if (vendorId) query.vendorId = vendorId;
    if (paymentType) query.paymentType = paymentType;
    
    // Debug logging
    console.log('💳 Payments Query:', {
      stationName: station.stationName,
      stationId: station._id.toString(),
      query: JSON.stringify(query),
    });

    let payments = await VendorPayment.find(query)
      .populate('vendorId', 'fullName email contactNumber')
      .populate('applicationId', 'shopId licenseNumber')
      .sort({ dueDate: -1 })
      .lean();

    // Enrich payments: if populate missed vendor or application info (due to vendorId stored as Vendor._id), try fallback lookups
    const VendorModel = (await import('@/models/Vendor')).default;
    const ShopApplicationModel = (await import('@/models/ShopApplication')).default;

    payments = await Promise.all(payments.map(async (p: any) => {
      const out = { ...p };

      // Vendor info: if populated from User exists, use it; else try Vendor model
      if (!out.vendorId || !out.vendorId.fullName) {
        try {
          // Try treat vendorId as Vendor._id
          const v = await VendorModel.findById(out.vendorId).lean();
          if (v) {
            out.vendor = {
              _id: v._id,
              fullName: v.businessName || v.ownerName || 'Vendor',
              email: v.email || null,
              contactNumber: v.contactNumber || null,
            };
          } else {
            // Try treat vendorId as User._id and fetch user directly
            const user = await (await import('@/models/User')).default.findById(out.vendorId).select('fullName email phone').lean();
            if (user) {
              out.vendor = {
                _id: user._id,
                fullName: user.fullName || user.name || 'Vendor',
                email: user.email || null,
                contactNumber: user.phone || null,
              };
            }
          }
        } catch (e) {
          // ignore
        }
      } else {
        out.vendor = out.vendorId; // populated User
      }

      // Application info fallback
      if (!out.applicationId || !out.applicationId.shopId) {
        try {
          const app = await ShopApplicationModel.findById(out.applicationId).select('shopId licenseNumber').lean();
          if (app) {
            out.application = app;
          }
        } catch (e) {}
      } else {
        out.application = out.applicationId;
      }

      // Normalize date strings for the front-end
      out.dueDate = out.dueDate ? new Date(out.dueDate).toISOString() : null;
      return out;
    }));

    console.log('💰 Payments Result:', { found: payments.length });

    return NextResponse.json({ 
      success: true, 
      payments,
      count: payments.length 
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch payments',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// POST: Record a payment
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || authResult.user?.role !== 'STATION_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { 
      paymentId, 
      paidAmount, 
      paymentMode, 
      receiptNumber, 
      transactionReference,
      notes 
    } = body;

    if (!paymentId || !paidAmount || paidAmount <= 0) {
      return NextResponse.json({ 
        error: 'Payment ID and valid amount are required' 
      }, { status: 400 });
    }

    const payment = await VendorPayment.findById(paymentId);
    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // Add payment record
    payment.payments.push({
      amount: paidAmount,
      paidAmount: paidAmount,
      paymentDate: new Date(),
      receiptNumber,
      paymentMode,
      transactionReference,
      receivedBy: new mongoose.Types.ObjectId(authResult.user.id),
      notes,
    });

    // Update total paid amount
    payment.paidAmount += paidAmount;
    payment.updatedBy = new mongoose.Types.ObjectId(authResult.user.id);

    await payment.save();

    // If this was a security deposit payment and it's now fully paid,
    // mark the related agreement(s) as having received the security deposit.
    try {
      if (payment.paymentType === 'SECURITY_DEPOSIT' && payment.paidAmount >= payment.amount) {
        const VendorAgreement = (await import('@/models/VendorAgreement')).default;
        await VendorAgreement.updateMany(
          { applicationId: payment.applicationId, status: { $in: ['DRAFT', 'ACTIVE'] } },
          { $set: { securityDepositPaid: true, securityDepositDate: new Date() } }
        );
      }
    } catch (e) {
      console.warn('Failed to update agreement security deposit status:', e?.message || e);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Payment recorded successfully',
      payment 
    });

  } catch (error) {
    console.error('Error recording payment:', error);
    return NextResponse.json({ 
      error: 'Failed to record payment',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
