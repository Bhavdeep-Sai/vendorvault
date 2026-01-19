'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import toast from 'react-hot-toast';

interface Shop {
  shopNumber: string;
  vendorId?: string;
  vendorName?: string;
  businessName?: string;
  stallType?: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  position: { x: number; y: number };
  size: { width: number; height: number };
  monthlyRent?: number;
}

interface Platform {
  _id: string;
  platformNumber: number;
  platformName: string;
  totalShops: number;
  occupiedShops: number;
  availableShops: number;
  shops: Shop[];
  financialMetrics?: {
    totalRevenue: number;
    totalBalance: number;
    overdueAmount: number;
    occupancy: number;
  };
}

interface Summary {
  totalRevenue: number;
  totalBalance: number;
  totalOverdue: number;
  totalPlatforms: number;
  totalShops: number;
  occupiedShops: number;
}

export default function PlatformManagementPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [loading, setLoading] = useState(true);
  const [stationInfo, setStationInfo] = useState<any>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const res = await fetch('/api/station-manager/platforms/live', {
        credentials: 'same-origin',
      });
      const data = await res.json();

      if (data.success) {
        setPlatforms(data.platforms || []);
        setStationInfo(data.stationInfo);
        setSummary(data.summary);
        if (data.platforms && data.platforms.length > 0) {
          setSelectedPlatform(data.platforms[0]);
        }
      } else {
        toast.error(data.error || 'Failed to fetch platforms');
      }
    } catch (error) {
      console.error('Fetch platforms error:', error);
      toast.error('Failed to load platform data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['STATION_MANAGER']}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading platform data...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['STATION_MANAGER']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Platform Management</h1>
                {stationInfo && (
                  <p className="text-sm text-gray-600 mt-1">
                    {stationInfo.stationName} ({stationInfo.stationCode})
                  </p>
                )}
              </div>
              <button
                onClick={() => router.push('/station-manager/dashboard')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!platforms || platforms.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 sm:p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Platforms Configured</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 max-w-md mx-auto">
                Platform layouts have not been created yet for {stationInfo?.stationName || 'this station'}.
              </p>
              <p className="text-xs sm:text-sm text-gray-500 max-w-lg mx-auto">
                Go to <strong>Layout Editor</strong> to create platforms and configure shops. Once saved, they will automatically appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Station-wide Financial Summary */}
              {summary && (
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Station Financial Overview</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg p-4 text-white">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-[10px] opacity-90 uppercase truncate">Revenue</p>
                          <p className="text-lg font-bold mt-1 truncate">{formatCurrency(summary.totalRevenue)}</p>
                        </div>
                        <svg className="w-6 h-6 opacity-80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg shadow-lg p-4 text-white">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-[10px] opacity-90 uppercase truncate">Pending</p>
                          <p className="text-lg font-bold mt-1 truncate">{formatCurrency(summary.totalBalance)}</p>
                        </div>
                        <svg className="w-6 h-6 opacity-80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-lg shadow-lg p-4 text-white">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-[10px] opacity-90 uppercase truncate">Overdue</p>
                          <p className="text-lg font-bold mt-1 truncate">{formatCurrency(summary.totalOverdue)}</p>
                        </div>
                        <svg className="w-6 h-6 opacity-80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg p-4 text-white">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-[10px] opacity-90 uppercase truncate">Platforms</p>
                          <p className="text-lg font-bold mt-1">{summary.totalPlatforms}</p>
                        </div>
                        <svg className="w-6 h-6 opacity-80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg shadow-lg p-4 text-white">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-[10px] opacity-90 uppercase truncate">Total Shops</p>
                          <p className="text-lg font-bold mt-1">{summary.totalShops}</p>
                        </div>
                        <svg className="w-6 h-6 opacity-80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-lg p-4 text-white">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-[10px] opacity-90 uppercase truncate">Occupied</p>
                          <p className="text-lg font-bold mt-1">{summary.occupiedShops}</p>
                        </div>
                        <svg className="w-6 h-6 opacity-80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Platform Selector */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Platform</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {platforms.map((platform) => (
                    <button
                      key={platform._id}
                      onClick={() => setSelectedPlatform(platform)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedPlatform?._id === platform._id
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900">
                        P{platform.platformNumber}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {platform.occupiedShops}/{platform.totalShops}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform Stats & Financial Metrics */}
              {selectedPlatform && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600">Total Shops</p>
                          <p className="text-2xl font-bold text-gray-900">{selectedPlatform.totalShops}</p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-full">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600">Occupied</p>
                          <p className="text-2xl font-bold text-red-600">{selectedPlatform.occupiedShops}</p>
                        </div>
                        <div className="p-2 bg-red-100 rounded-full">
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600">Available</p>
                          <p className="text-2xl font-bold text-green-600">{selectedPlatform.availableShops}</p>
                        </div>
                        <div className="p-2 bg-green-100 rounded-full">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600">Occupancy</p>
                          <p className="text-2xl font-bold text-indigo-600">
                            {selectedPlatform.totalShops > 0
                              ? Math.round((selectedPlatform.occupiedShops / selectedPlatform.totalShops) * 100)
                              : 0}%
                          </p>
                        </div>
                        <div className="p-2 bg-indigo-100 rounded-full">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics */}
                  {selectedPlatform.financialMetrics && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm opacity-90">Revenue Collected</p>
                            <p className="text-3xl font-bold mt-1">
                              {formatCurrency(selectedPlatform.financialMetrics.totalRevenue)}
                            </p>
                          </div>
                          <div className="p-3 bg-white bg-opacity-20 rounded-full">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm opacity-90">Pending Payments</p>
                            <p className="text-3xl font-bold mt-1">
                              {formatCurrency(selectedPlatform.financialMetrics.totalBalance)}
                            </p>
                          </div>
                          <div className="p-3 bg-white bg-opacity-20 rounded-full">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className={`bg-gradient-to-br ${
                        selectedPlatform.financialMetrics.overdueAmount > 0 
                          ? 'from-red-500 to-red-600' 
                          : 'from-gray-400 to-gray-500'
                      } rounded-lg shadow-lg p-6 text-white`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm opacity-90">Overdue Amount</p>
                            <p className="text-3xl font-bold mt-1">
                              {formatCurrency(selectedPlatform.financialMetrics.overdueAmount)}
                            </p>
                          </div>
                          <div className="p-3 bg-white bg-opacity-20 rounded-full">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Shop Details Table */}
              {selectedPlatform && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Platform {selectedPlatform.platformNumber} - Shop Details
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop #</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Rent</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedPlatform.shops.map((shop) => (
                          <tr key={shop.shopNumber} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {shop.shopNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                shop.status === 'OCCUPIED' ? 'bg-red-100 text-red-800' :
                                shop.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                                shop.status === 'RESERVED' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {shop.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {shop.vendorName || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {shop.businessName || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {shop.stallType || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {shop.monthlyRent ? `₹${shop.monthlyRent.toLocaleString('en-IN')}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

