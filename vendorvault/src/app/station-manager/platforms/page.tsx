'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
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
  dimensions: { length: number; width: number };
}

export default function PlatformManagementPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [loading, setLoading] = useState(true);
  const [stationInfo, setStationInfo] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const res = await fetch('/api/station-manager/platforms', {
        credentials: 'same-origin',
      });
      const data = await res.json();

      if (data.success) {
        setPlatforms(data.platforms);
        setStationInfo(data.stationInfo);
        if (data.platforms.length > 0) {
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

  const getShopColor = (status: string) => {
    switch (status) {
      case 'OCCUPIED':
        return 'bg-red-500 border-red-600';
      case 'AVAILABLE':
        return 'bg-green-500 border-green-600';
      case 'RESERVED':
        return 'bg-yellow-500 border-yellow-600';
      case 'MAINTENANCE':
        return 'bg-gray-500 border-gray-600';
      default:
        return 'bg-blue-500 border-blue-600';
    }
  };

  const getGridSize = (platform: Platform) => {
    // Calculate grid size based on platform dimensions
    const maxX = Math.max(...platform.shops.map(s => s.position.x + s.size.width), 10);
    const maxY = Math.max(...platform.shops.map(s => s.position.y + s.size.height), 3);
    return { cols: maxX, rows: maxY };
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
                    {stationInfo.stationName} ({stationInfo.stationCode}) - {stationInfo.totalPlatforms} Platforms
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
          {/* Platform Selection & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Platform Selector */}
            <div className="md:col-span-4">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Platform</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
                        Platform {platform.platformNumber}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {platform.occupiedShops}/{platform.totalShops} Occupied
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            {selectedPlatform && (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Shops</p>
                      <p className="text-3xl font-bold text-gray-900">{selectedPlatform.totalShops}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Occupied</p>
                      <p className="text-3xl font-bold text-red-600">{selectedPlatform.occupiedShops}</p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-full">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Available</p>
                      <p className="text-3xl font-bold text-green-600">{selectedPlatform.availableShops}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Occupancy Rate</p>
                      <p className="text-3xl font-bold text-indigo-600">
                        {selectedPlatform.totalShops > 0
                          ? Math.round((selectedPlatform.occupiedShops / selectedPlatform.totalShops) * 100)
                          : 0}%
                      </p>
                    </div>
                    <div className="p-3 bg-indigo-100 rounded-full">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Platform Visual Layout */}
          {selectedPlatform && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Platform {selectedPlatform.platformNumber} - {selectedPlatform.platformName}
                </h2>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 border-2 border-green-600 rounded"></div>
                    <span className="text-sm text-gray-600">Available</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 border-2 border-red-600 rounded"></div>
                    <span className="text-sm text-gray-600">Occupied</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-yellow-500 border-2 border-yellow-600 rounded"></div>
                    <span className="text-sm text-gray-600">Reserved</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gray-500 border-2 border-gray-600 rounded"></div>
                    <span className="text-sm text-gray-600">Maintenance</span>
                  </div>
                </div>
              </div>

              {/* Platform Layout Grid */}
              <div className="bg-gray-100 p-8 rounded-lg overflow-x-auto">
                <div className="relative" style={{ minWidth: '800px' }}>
                  {/* Platform Base (Railway Track) */}
                  <div className="mb-4 text-center">
                    <div className="inline-block bg-gray-800 text-white px-4 py-2 rounded text-sm font-medium">
                      ← Railway Track →
                    </div>
                  </div>

                  {/* Platform Rectangle */}
                  <div 
                    className="relative border-4 border-gray-400 bg-gray-200 rounded-lg"
                    style={{ 
                      height: `${getGridSize(selectedPlatform).rows * 100 + 40}px`,
                      minHeight: '300px'
                    }}
                  >
                    {/* Platform Label */}
                    <div className="absolute top-2 left-2 bg-white px-3 py-1 rounded shadow text-sm font-semibold text-gray-700">
                      Platform {selectedPlatform.platformNumber}
                    </div>

                    {/* Dimension Labels */}
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
                      {selectedPlatform.dimensions.length}m length
                    </div>
                    <div className="absolute top-1/2 -left-16 transform -translate-y-1/2 -rotate-90 text-xs text-gray-600">
                      {selectedPlatform.dimensions.width}m width
                    </div>

                    {/* Shop Blocks */}
                    {selectedPlatform.shops.map((shop) => (
                      <div
                        key={shop.shopNumber}
                        className={`absolute ${getShopColor(shop.status)} border-2 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-all group`}
                        style={{
                          left: `${shop.position.x * 80 + 20}px`,
                          top: `${shop.position.y * 100 + 40}px`,
                          width: `${shop.size.width * 70}px`,
                          height: `${shop.size.height * 90}px`,
                        }}
                        title={`${shop.shopNumber} - ${shop.status}${shop.vendorName ? ` - ${shop.vendorName}` : ''}`}
                      >
                        <div className="p-2 h-full flex flex-col justify-between">
                          <div className="text-white text-xs font-bold">
                            {shop.shopNumber}
                          </div>
                          {shop.businessName && (
                            <div className="text-white text-[10px] truncate">
                              {shop.businessName}
                            </div>
                          )}
                          <div className="text-white text-[9px] opacity-90">
                            {shop.stallType}
                          </div>
                        </div>

                        {/* Tooltip on Hover */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                          <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap shadow-lg">
                            <div className="font-semibold">{shop.shopNumber}</div>
                            <div>Status: {shop.status}</div>
                            {shop.vendorName && <div>Vendor: {shop.vendorName}</div>}
                            {shop.businessName && <div>Business: {shop.businessName}</div>}
                            {shop.monthlyRent && <div>Rent: ₹{shop.monthlyRent}/month</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Platform End Label */}
                  <div className="mt-4 text-center text-sm text-gray-600">
                    Platform End
                  </div>
                </div>
              </div>

              {/* Shop List Table */}
              <div className="mt-8">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Shop Details</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rent</th>
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
                            {shop.monthlyRent ? `₹${shop.monthlyRent}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {platforms.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No platforms configured</h3>
              <p className="mt-1 text-sm text-gray-500">
                Contact the railway administrator to set up platforms for your station.
              </p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

