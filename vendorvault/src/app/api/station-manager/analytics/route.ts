import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import VendorPayment from '@/models/VendorPayment';
import VendorAgreement from '@/models/VendorAgreement';
import Platform from '@/models/Platform';
import StationLayout from '@/models/StationLayout';
import ShopApplication from '@/models/ShopApplication';
import Station from '@/models/Station';
import mongoose from 'mongoose';
import { verifyAuthToken } from '@/middleware/auth';

// GET: Fetch financial analytics for station manager's station
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

    const stationId = station._id;
    
    // Debug logging
    console.log('📊 Analytics Query for Station:', {
      stationName: station.stationName,
      stationCode: station.stationCode,
      stationId: stationId.toString(),
      managerId: authResult.user.id
    });

    // Count total applications for this station
    const totalApplications = await ShopApplication.countDocuments({ stationId });
    const activeApplications = await ShopApplication.countDocuments({ 
      stationId, 
      status: { $in: ['APPROVED', 'ACTIVE'] } 
    });
    
    console.log('📝 Applications:', { total: totalApplications, active: activeApplications });

    // Get total shops (from Platform documents if present, otherwise from StationLayout)
    const platforms = await Platform.find({ stationId });
    let totalShops = platforms.reduce((sum: number, p: {totalShops: number}) => sum + (p.totalShops || 0), 0);

    // If no Platform documents exist for this station, derive totalShops from StationLayout
    if (totalShops === 0) {
      try {
        const layout = await StationLayout.findOne({ stationId }).lean();
        if (layout && Array.isArray(layout.platforms) && layout.platforms.length > 0) {
          totalShops = 0;
          for (const pf of layout.platforms) {
            if (Array.isArray(pf.shops)) {
              totalShops += pf.shops.length;
            }
          }
        }
      } catch (e) {
        console.warn('Failed to derive total shops from StationLayout:', e?.message || e);
      }
    }

    // Compute occupied shops dynamically from active agreements to avoid needing seeded Platform state
    let occupiedShops = 0;
    try {
      occupiedShops = await VendorAgreement.countDocuments({ stationId, status: 'ACTIVE' });
    } catch (e) {
      console.warn('Failed to count active agreements for occupancy:', e?.message || e);
    }

    const availableShops = Math.max(0, totalShops - occupiedShops);
    
    console.log('🏪 Shops:', { total: totalShops, occupied: occupiedShops, available: availableShops });

    // Get active agreements
    const activeAgreements = await VendorAgreement.find({ 
      stationId, 
      status: 'ACTIVE' 
    });
    
    console.log('📄 Active Agreements:', activeAgreements.length);

    // Calculate expected monthly revenue
    const expectedMonthlyRevenue = activeAgreements.reduce(
      (sum, agreement) => sum + (agreement.monthlyRent || 0), 
      0
    );
    
    console.log('💰 Expected Monthly Revenue:', expectedMonthlyRevenue);

    // Get current month payments
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const currentMonthPayments = await VendorPayment.find({
      stationId,
      billingMonth: currentMonth,
      paymentType: 'RENT',
    });

    const collectedThisMonth = currentMonthPayments.reduce(
      (sum, payment) => sum + (payment.paidAmount || 0),
      0
    );

    const pendingThisMonth = currentMonthPayments
      .filter(p => p.status === 'PENDING' || p.status === 'OVERDUE' || p.status === 'PARTIAL')
      .reduce((sum, payment) => sum + (payment.balanceAmount || 0), 0);

    // Get overdue payments
    const overduePayments = await VendorPayment.find({
      stationId,
      status: 'OVERDUE',
    });

    const totalOverdue = overduePayments.reduce(
      (sum, payment) => sum + (payment.balanceAmount || 0),
      0
    );

    // Get security deposits
    const securityDeposits = await VendorPayment.find({
      stationId,
      paymentType: 'SECURITY_DEPOSIT',
    });

    const totalSecurityDeposits = securityDeposits.reduce(
      (sum, payment) => sum + (payment.paidAmount || 0),
      0
    );

    const pendingSecurityDeposits = securityDeposits
      .filter(p => p.status !== 'PAID')
      .reduce((sum, payment) => sum + (payment.balanceAmount || 0), 0);

    // Expiring agreements (within 30 days)
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringAgreements = await VendorAgreement.countDocuments({
      stationId,
      status: 'ACTIVE',
      endDate: { $gte: now, $lte: thirtyDaysLater },
    });

    // Expiring licenses (within 30 days)
    const expiringLicenses = await VendorAgreement.countDocuments({
      stationId,
      status: 'ACTIVE',
      licenseExpiryDate: { $gte: now, $lte: thirtyDaysLater },
    });

    // Payment statistics by status - use ObjectId for matching
    const paymentsByStatus = await VendorPayment.aggregate([
      { $match: { stationId: new mongoose.Types.ObjectId(stationId.toString()) } },
      { 
        $group: { 
          _id: '$status', 
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          paidAmount: { $sum: '$paidAmount' },
        } 
      },
    ]);
    
    console.log('💳 Payments by Status:', paymentsByStatus);

    // Monthly collection trend (last 6 months)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlyTrend = await VendorPayment.aggregate([
      { 
        $match: { 
          stationId: new mongoose.Types.ObjectId(stationId.toString()),
          paymentType: 'RENT',
          dueDate: { $gte: sixMonthsAgo },
        } 
      },
      { 
        $group: { 
          _id: '$billingMonth', 
          collected: { $sum: '$paidAmount' },
          expected: { $sum: '$amount' },
        } 
      },
      { $sort: { _id: 1 } },
    ]);

    return NextResponse.json({
      success: true,
      analytics: {
        shops: {
          total: totalShops,
          occupied: occupiedShops,
          available: availableShops,
          occupancyRate: totalShops > 0 ? ((occupiedShops / totalShops) * 100).toFixed(2) : 0,
        },
        revenue: {
          expectedMonthly: expectedMonthlyRevenue,
          collectedThisMonth,
          pendingThisMonth,
          collectionRate: expectedMonthlyRevenue > 0 
            ? ((collectedThisMonth / expectedMonthlyRevenue) * 100).toFixed(2) 
            : 0,
        },
        overdue: {
          count: overduePayments.length,
          totalAmount: totalOverdue,
        },
        securityDeposits: {
          total: totalSecurityDeposits,
          pending: pendingSecurityDeposits,
        },
        alerts: {
          expiringAgreements,
          expiringLicenses,
        },
        paymentsByStatus,
        monthlyTrend,
      },
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch analytics',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
