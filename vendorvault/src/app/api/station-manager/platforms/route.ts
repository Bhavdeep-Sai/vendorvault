import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Platform from '@/models/Platform';
import Station from '@/models/Station';
import VendorPayment from '@/models/VendorPayment';
import VendorAgreement from '@/models/VendorAgreement';
import ShopApplication from '@/models/ShopApplication';
import User from '@/models/User';
import { getAuthUser } from '@/middleware/auth';

// Get all platforms for a station (Station Manager only)
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthUser(request);
    
    if (!auth || auth.role !== 'STATION_MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized - Station Manager access required' },
        { status: 403 }
      );
    }

    await connectDB();

    // Get station for this station manager
    const station = await Station.findOne({ stationManagerId: auth.userId });
    
    if (!station) {
      return NextResponse.json(
        { error: 'No station assigned to this station manager' },
        { status: 404 }
      );
    }

    // Get all platforms for this station
    const platforms = await Platform.find({ stationId: station._id })
      .populate('shops.vendorId', 'name email phone')
      .sort({ platformNumber: 1 })
      .lean();

    // Fetch all shop applications for this station
    const shopApplications = await ShopApplication.find({
      stationId: station._id,
      status: 'APPROVED'
    });

    // Fetch all payments for this station
    const payments = await VendorPayment.find({
      stationId: station._id
    });

    // Calculate payment statistics per platform
    const platformData = await Promise.all(
      platforms.map(async (platform) => {
        const platformShops = shopApplications.filter(
          (shop) => shop.platformId?.toString() === platform._id.toString()
        );

        // Get all payments for this platform's shops
        const shopIds = platformShops.map((shop) => shop._id.toString());
        const platformPayments = payments.filter((payment) =>
          shopIds.includes(payment.shopApplicationId?.toString())
        );

        // Calculate revenue metrics
        const totalRevenue = platformPayments.reduce(
          (sum, p) => sum + (p.paidAmount || 0),
          0
        );
        const totalDue = platformPayments.reduce(
          (sum, p) => sum + (p.amount || 0),
          0
        );
        const totalBalance = platformPayments.reduce(
          (sum, p) => sum + (p.balanceAmount || 0),
          0
        );

        // Check overdue payments (payments with PENDING or OVERDUE status)
        const overduePayments = platformPayments.filter(
          (p) => p.status === 'OVERDUE' || (p.status === 'PENDING' && p.dueDate && new Date(p.dueDate) < new Date())
        );
        const overdueAmount = overduePayments.reduce(
          (sum, p) => sum + (p.balanceAmount || 0),
          0
        );

        // Get vendor payment details
        const vendorPaymentDetails = await Promise.all(
          platformShops.map(async (shop) => {
            const shopPayments = payments.filter(
              (p) => p.shopApplicationId?.toString() === shop._id.toString()
            );

            const vendorUser = await User.findOne({ userId: shop.vendorId });

            const totalPaid = shopPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
            const totalDue = shopPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const balance = shopPayments.reduce((sum, p) => sum + (p.balanceAmount || 0), 0);

            // Determine payment status
            const hasOverdue = shopPayments.some(
              (p) => p.status === 'OVERDUE' || (p.status === 'PENDING' && p.dueDate && new Date(p.dueDate) < new Date())
            );
            const allPaid = shopPayments.every((p) => p.status === 'PAID');

            let paymentStatus = 'ON_TIME';
            if (hasOverdue) {
              paymentStatus = 'OVERDUE';
            } else if (balance > 0) {
              paymentStatus = 'PENDING';
            } else if (allPaid) {
              paymentStatus = 'PAID';
            }

            // Get last payment date
            const paidPayments = shopPayments.filter((p) => p.paidDate);
            const lastPaymentDate = paidPayments.length > 0
              ? paidPayments.sort((a, b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime())[0].paidDate
              : null;

            return {
              shopNumber: shop.shopNumber,
              vendorName: vendorUser?.name || 'Unknown',
              businessName: shop.businessDetails?.businessName || 'N/A',
              shopType: shop.shopType,
              totalPaid,
              totalDue,
              balance,
              paymentStatus,
              lastPaymentDate,
              shopId: shop._id
            };
          })
        );

        // Count vendors by payment status
        const onTimeVendors = vendorPaymentDetails.filter(
          (v) => v.paymentStatus === 'ON_TIME' || v.paymentStatus === 'PAID'
        ).length;
        const lateVendors = vendorPaymentDetails.filter(
          (v) => v.paymentStatus === 'OVERDUE'
        ).length;
        const pendingVendors = vendorPaymentDetails.filter(
          (v) => v.paymentStatus === 'PENDING'
        ).length;

        return {
          ...platform,
          financialMetrics: {
            totalRevenue,
            totalDue,
            totalBalance,
            overdueAmount,
            onTimeVendors,
            lateVendors,
            pendingVendors,
            totalPayments: platformPayments.length
          },
          vendorPaymentDetails
        };
      })
    );

    return NextResponse.json({
      success: true,
      platforms: platformData,
      stationInfo: {
        stationName: station.stationName,
        stationCode: station.stationCode,
        totalPlatforms: station.platformsCount,
      },
      summary: {
        totalRevenue: platformData.reduce((sum, p) => sum + p.financialMetrics.totalRevenue, 0),
        totalBalance: platformData.reduce((sum, p) => sum + p.financialMetrics.totalBalance, 0),
        totalOverdue: platformData.reduce((sum, p) => sum + p.financialMetrics.overdueAmount, 0),
        totalOnTimeVendors: platformData.reduce((sum, p) => sum + p.financialMetrics.onTimeVendors, 0),
        totalLateVendors: platformData.reduce((sum, p) => sum + p.financialMetrics.lateVendors, 0)
      }
    });

  } catch (error: any) {
    console.error('❌ Get platforms error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch platforms' },
      { status: 500 }
    );
  }
}

// Create or update platform (Station Manager only)
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthUser(request);
    
    if (!auth || auth.role !== 'STATION_MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized - Station Manager access required' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { platformNumber, platformName, dimensions, totalShops, shopLayout } = body;

    // Get station for this station manager
    const station = await Station.findOne({ stationManagerId: auth.userId });
    
    if (!station) {
      return NextResponse.json(
        { error: 'No station assigned to this station manager' },
        { status: 404 }
      );
    }

    // Check if platform already exists
    let platform = await Platform.findOne({
      stationId: station._id,
      platformNumber
    });

    if (platform) {
      // Update existing platform
      platform.platformName = platformName;
      platform.dimensions = dimensions;
      platform.totalShops = totalShops;
      if (shopLayout && shopLayout.length > 0) {
        platform.shops = shopLayout;
      }
      platform.updateShopCounts();
      await platform.save();
    } else {
      // Create new platform with shop layout
      const shops = shopLayout || [];
      
      platform = await Platform.create({
        stationId: station._id,
        platformNumber,
        platformName,
        dimensions,
        totalShops,
        shops,
        occupiedShops: 0,
        availableShops: totalShops,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Platform saved successfully',
      platform
    });

  } catch (error: any) {
    console.error('❌ Create platform error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create platform' },
      { status: 500 }
    );
  }
}
