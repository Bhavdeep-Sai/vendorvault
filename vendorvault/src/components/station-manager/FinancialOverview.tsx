'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface FinancialOverviewProps {
  refreshTrigger?: number;
}

interface Analytics {
  shops: {
    total: number;
    occupied: number;
    available: number;
    occupancyRate: string;
  };
  revenue: {
    expectedMonthly: number;
    collectedThisMonth: number;
    pendingThisMonth: number;
    collectionRate: string;
  };
  overdue: {
    count: number;
    totalAmount: number;
  };
  securityDeposits: {
    total: number;
    pending: number;
  };
  alerts: {
    expiringAgreements: number;
    expiringLicenses: number;
  };
  paymentsByStatus: Array<{
    _id: string;
    count: number;
    totalAmount: number;
    paidAmount: number;
  }>;
  monthlyTrend: Array<{
    _id: string;
    collected: number;
    expected: number;
  }>;
}

export function FinancialOverview({ refreshTrigger }: FinancialOverviewProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [refreshTrigger]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/station-manager/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      } else {
        toast.error('Failed to load analytics');
      }
    } catch {
      toast.error('Error loading analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-center text-gray-500">No analytics data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Shops */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Shops</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {analytics.shops.total}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {analytics.shops.occupied} occupied • {analytics.shops.available} available
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600">Occupancy</span>
              <span className="font-semibold text-blue-600">{analytics.shops.occupancyRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${analytics.shops.occupancyRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Revenue</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                ₹{(analytics.revenue.expectedMonthly / 1000).toFixed(1)}k
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Expected per month
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600">Collected</span>
              <span className="font-semibold text-green-600">₹{(analytics.revenue.collectedThisMonth / 1000).toFixed(1)}k ({analytics.revenue.collectionRate}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${analytics.revenue.collectionRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Pending Collections */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending This Month</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                ₹{(analytics.revenue.pendingThisMonth / 1000).toFixed(1)}k
              </p>
              <p className="text-sm text-gray-500 mt-1">
                To be collected
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          {analytics.overdue.count > 0 && (
            <div className="mt-4 p-2 bg-red-50 rounded text-xs">
              <span className="text-red-600 font-semibold">
                {analytics.overdue.count} overdue payment{analytics.overdue.count > 1 ? 's' : ''}
              </span>
              <span className="text-red-500 ml-2">
                ₹{(analytics.overdue.totalAmount / 1000).toFixed(1)}k
              </span>
            </div>
          )}
        </div>

        {/* Security Deposits */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Security Deposits</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                ₹{(analytics.securityDeposits.total / 1000).toFixed(1)}k
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Total collected
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          {analytics.securityDeposits.pending > 0 && (
            <div className="mt-4 p-2 bg-yellow-50 rounded text-xs">
              <span className="text-yellow-600">
                ₹{(analytics.securityDeposits.pending / 1000).toFixed(1)}k pending
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Alerts Section */}
      {(analytics.alerts.expiringAgreements > 0 || analytics.alerts.expiringLicenses > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-semibold text-yellow-800">
                Renewal Alerts
              </h3>
              <div className="mt-2 space-y-1 text-sm text-yellow-700">
                {analytics.alerts.expiringAgreements > 0 && (
                  <p>• {analytics.alerts.expiringAgreements} agreement{analytics.alerts.expiringAgreements > 1 ? 's' : ''} expiring within 30 days</p>
                )}
                {analytics.alerts.expiringLicenses > 0 && (
                  <p>• {analytics.alerts.expiringLicenses} license{analytics.alerts.expiringLicenses > 1 ? 's' : ''} expiring within 30 days</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Trend Chart */}
      {analytics.monthlyTrend.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Collection Trend (Last 6 Months)
          </h3>
          <div className="space-y-3">
            {analytics.monthlyTrend.map((month) => {
              const collectionRate = month.expected > 0 
                ? ((month.collected / month.expected) * 100).toFixed(0) 
                : 0;
              return (
                <div key={month._id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{month._id}</span>
                    <span className="font-semibold">
                      ₹{(month.collected / 1000).toFixed(1)}k / ₹{(month.expected / 1000).toFixed(1)}k
                      <span className="text-xs ml-2 text-gray-500">({collectionRate}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${collectionRate}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

