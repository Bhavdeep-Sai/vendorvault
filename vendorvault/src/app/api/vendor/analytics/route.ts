import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyTokenString } from '@/lib/auth';
import ShopApplication from '@/models/ShopApplication';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyTokenString(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    // Get all applications for this vendor
    const applications = await ShopApplication.find({ vendorId: decoded.userId })
      .populate('stationId', 'name code')
      .sort({ createdAt: -1 });

    // Calculate analytics
    const totalApplications = applications.length;
    const activeApplications = applications.filter(app => app.status === 'APPROVED').length;
    
    // Calculate revenue (sum of all agreed rents)
    const totalRevenue = applications
      .filter(app => app.status === 'APPROVED' && app.finalAgreedRent)
      .reduce((sum, app) => sum + (app.finalAgreedRent || app.quotedRent), 0);

    // Calculate pending payments (assume monthly payments for active applications)
    const pendingPayments = applications
      .filter(app => app.status === 'APPROVED')
      .reduce((sum, app) => sum + (app.finalAgreedRent || app.quotedRent), 0);

    // Find next payment due date (assume monthly payments)
    const nextPaymentDue = applications
      .filter(app => app.status === 'APPROVED')
      .map(app => {
        const startDate = new Date(app.proposedStartDate);
        const nextMonth = new Date(startDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      })
      .sort((a, b) => a.getTime() - b.getTime())[0];

    // Calculate monthly trend (simplified calculation)
    const currentMonth = new Date().getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    
    const currentMonthApplications = applications.filter(app => 
      new Date(app.createdAt).getMonth() === currentMonth
    ).length;
    
    const lastMonthApplications = applications.filter(app => 
      new Date(app.createdAt).getMonth() === lastMonth
    ).length;

    const monthlyTrend = lastMonthApplications === 0 ? 0 : 
      ((currentMonthApplications - lastMonthApplications) / lastMonthApplications) * 100;

    const analytics = {
      totalApplications,
      activeApplications,
      totalRevenue,
      pendingPayments,
      nextPaymentDue: nextPaymentDue?.toISOString(),
      monthlyTrend: Math.round(monthlyTrend * 100) / 100
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}