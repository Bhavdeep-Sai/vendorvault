import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Station from '@/models/Station';
import StationLayout from '@/models/StationLayout';
import User from '@/models/User';
import VendorPayment from '@/models/VendorPayment';
import ShopApplication from '@/models/ShopApplication';
import Vendor from '@/models/Vendor';
import { getAuthUser } from '@/middleware/auth';

// Get platforms data directly from StationLayout (live sync)
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

    // Get the station layout (this is the source of truth)
    const layout = await StationLayout.findOne({ stationId: station._id });

    if (!layout || !layout.platforms || layout.platforms.length === 0) {
      return NextResponse.json({
        success: true,
        platforms: [],
        stationInfo: {
          stationName: station.stationName,
          stationCode: station.stationCode,
        }
      });
    }

    console.log(`📊 Found ${layout.platforms.length} platforms in StationLayout for station ${station.stationCode}`);
    layout.platforms.forEach((p: any, idx: number) => {
      console.log(`  Platform ${idx + 1}: platformNumber="${p.platformNumber}", shops=${p.shops?.length || 0}`);
    });

    // Get all vendor IDs from allocated shops
    const vendorIds = layout.platforms
      .flatMap((p: any) => p.shops || [])
      .filter((s: any) => s.isAllocated && s.vendorId)
      .map((s: any) => s.vendorId);

    // Convert vendorIds to ObjectIds and fetch vendor details
    const vendorObjectIds = vendorIds.map((id: string) => new mongoose.Types.ObjectId(id));
    const vendors = await User.find({ _id: { $in: vendorObjectIds } }).select('_id name email').lean();
    const vendorMap = new Map(vendors.map(v => [v._id.toString(), v]));

    // Fetch vendor business details from Vendor collection
    const vendorBusinesses = await Vendor.find({ userId: { $in: vendorObjectIds } }).lean();
    const businessMap = new Map(vendorBusinesses.map((b: any) => [b.userId.toString(), b]));

    // Fetch all payments for this station
    const payments = await VendorPayment.find({ stationId: station._id }).lean();
    
    // Fetch all shop applications for this station
    const shopApplications = await ShopApplication.find({
      stationId: station._id,
      status: 'APPROVED'
    }).lean();

    // Create payment map by vendor
    const paymentsByVendor = new Map();
    payments.forEach(payment => {
      const vendorId = payment.vendorId?.toString();
      if (vendorId) {
        if (!paymentsByVendor.has(vendorId)) {
          paymentsByVendor.set(vendorId, []);
        }
        paymentsByVendor.get(vendorId).push(payment);
      }
    });

    // Transform layout platforms to API format with financial data
    const platforms = await Promise.all(layout.platforms.map(async (layoutPlatform: any, index: number) => {
      console.log(`  Processing platform ${index}: platformNumber="${layoutPlatform.platformNumber}", shops=${layoutPlatform.shops?.length || 0}`);
      
      // Count shops by status
      const occupiedShops = layoutPlatform.shops.filter((s: any) => s.isAllocated).length;
      const totalShops = layoutPlatform.shops.length;

      let totalRevenue = 0;
      let totalBalance = 0;
      let overdueAmount = 0;

      // Map shops with vendor details
      const shops = layoutPlatform.shops.map((shop: any, shopIndex: number) => {
        let vendorName = '-';
        let businessName = '-';
        let businessType = '-';
        
        if (shop.isAllocated && shop.vendorId) {
          const vendor = vendorMap.get(shop.vendorId);
          vendorName = vendor?.name || '-';

          // Get business details from Vendor collection
          const business = businessMap.get(shop.vendorId);
          if (business) {
            businessName = business.businessName || '-';
            businessType = business.businessType || '-';
          }

          // Calculate revenue for this vendor
          const vendorPayments = paymentsByVendor.get(shop.vendorId) || [];
          vendorPayments.forEach((payment: any) => {
            totalRevenue += payment.paidAmount || 0;
            totalBalance += payment.balanceAmount || 0;
            if (payment.status === 'OVERDUE' || (payment.status === 'PENDING' && payment.dueDate && new Date(payment.dueDate) < new Date())) {
              overdueAmount += payment.balanceAmount || 0;
            }
          });
        }

        return {
          shopNumber: `P${layoutPlatform.platformNumber}-S${shopIndex + 1}`,
          status: shop.isAllocated ? 'OCCUPIED' : 'AVAILABLE',
          position: {
            x: shop.x || 0,
            y: 0,
          },
          size: {
            width: shop.width || 50,
            height: shop.height || shop.width || 50,
          },
          vendorId: shop.vendorId,
          vendorName,
          businessName,
          stallType: businessType,
          monthlyRent: shop.rent || 0,
        };
      });

      return {
        _id: `${station._id}-P${layoutPlatform.platformNumber}`,
        platformNumber: parseInt(layoutPlatform.platformNumber) || (index + 1),
        platformName: `Platform ${layoutPlatform.platformNumber}`,
        totalShops,
        occupiedShops,
        availableShops: totalShops - occupiedShops,
        shops,
        financialMetrics: {
          totalRevenue,
          totalBalance,
          overdueAmount,
          occupancy: totalShops > 0 ? Math.round((occupiedShops / totalShops) * 100) : 0
        }
      };
    }));

    // Calculate station-wide summary
    const summary = {
      totalRevenue: platforms.reduce((sum, p) => sum + (p.financialMetrics?.totalRevenue || 0), 0),
      totalBalance: platforms.reduce((sum, p) => sum + (p.financialMetrics?.totalBalance || 0), 0),
      totalOverdue: platforms.reduce((sum, p) => sum + (p.financialMetrics?.overdueAmount || 0), 0),
      totalPlatforms: platforms.length,
      totalShops: platforms.reduce((sum, p) => sum + p.totalShops, 0),
      occupiedShops: platforms.reduce((sum, p) => sum + p.occupiedShops, 0),
    };

    console.log(`✅ Returning ${platforms.length} platforms to frontend`);
    console.log(`   Platform numbers: ${platforms.map(p => p.platformNumber).join(', ')}`);
    console.log(`   Total shops: ${summary.totalShops}, Occupied: ${summary.occupiedShops}`);

    return NextResponse.json({
      success: true,
      platforms,
      summary,
      stationInfo: {
        stationName: station.stationName,
        stationCode: station.stationCode,
      }
    });

  } catch (error: any) {
    console.error('❌ Get live platforms error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch platforms' },
      { status: 500 }
    );
  }
}
