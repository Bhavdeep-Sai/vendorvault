'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardNav } from '@/components/DashboardNav';
import { FinancialOverview } from '@/components/station-manager/FinancialOverview';
import { PaymentManagement } from '@/components/station-manager/PaymentManagement';
import { AgreementManagement } from '@/components/station-manager/AgreementManagement';
import { ApplicationManagement } from '@/components/station-manager/ApplicationManagement';
import { InspectorManagement } from '@/components/station-manager/InspectorManagement';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface StationData {
  _id: string;
  stationName: string;
  stationCode: string;
  railwayZone: string;
  stationCategory: string;
  platformsCount: number;
  dailyFootfallAvg: number;
  operationalStatus: string;
  approvalStatus: string;
  layoutCompleted?: boolean;
}

interface UserData {
  status: string;
  verificationStatus: string;
  documents?: {
    aadhaarCard?: string;
    panCard?: string;
    railwayIdCard?: string;
    photograph?: string;
  };
}

type TabType = 'overview' | 'applications' | 'payments' | 'agreements' | 'inspectors';

export default function StationManagerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [station, setStation] = useState<StationData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch user data
      const userRes = await fetch('/api/auth/me', {
        credentials: 'same-origin',
      });
      
      if (userRes.ok) {
        const userData = await userRes.json();
        setUserData(userData.user);
      }

      // Fetch station data
      const stationRes = await fetch('/api/station-manager/station', { 
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (stationRes.ok) {
        const data = await stationRes.json();
        setStation(data.station);
      } else {
        const errorData = await stationRes.json();
        toast.error(errorData.error || 'Failed to fetch station data');
      }
    } catch {
      toast.error('Network error while fetching data');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview' as TabType, name: 'Financial Overview', icon: '📊' },
    { id: 'applications' as TabType, name: 'Applications', icon: '📝' },
    { id: 'payments' as TabType, name: 'Payments', icon: '💰' },
    { id: 'agreements' as TabType, name: 'Agreements', icon: '📄' },
    { id: 'inspectors' as TabType, name: 'Inspectors', icon: '👮' },
  ];

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['STATION_MANAGER']}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Show pending approval message
  if (station && station.approvalStatus !== 'APPROVED') {
    return (
      <ProtectedRoute allowedRoles={['STATION_MANAGER']}>
        <div className="min-h-screen bg-gray-50">
          <DashboardNav title="Station Manager Dashboard" />
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="mb-6">
                <div className="mx-auto w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Station Application Pending Approval
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Your station application for <span className="font-semibold text-blue-600">{station.stationName}</span> ({station.stationCode}) is currently under review by the Railway Administration.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <p className="text-sm text-gray-700">
                  <strong>Status:</strong> <span className="text-yellow-600 font-semibold">{station.approvalStatus}</span>
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  You will be notified once your application has been reviewed. You can access all dashboard features once approved.
                </p>
              </div>
              <button
                onClick={() => router.push('/station-manager/documents')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Update Documents
              </button>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  // Show setup requirement message if station is approved but layout not completed
  if (station && station.approvalStatus === 'APPROVED' && !station.layoutCompleted) {
    return (
      <ProtectedRoute allowedRoles={['STATION_MANAGER']}>
        <div className="min-h-screen bg-gray-50">
          <DashboardNav title="Station Manager Dashboard" />
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="mb-6">
                <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Complete Your Station Setup
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Congratulations! Your station <span className="font-semibold text-blue-600">{station.stationName}</span> ({station.stationCode}) has been approved.
              </p>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-md font-semibold text-gray-900 mb-2">
                      Next Step: Design Your Station Layout
                    </h3>
                    <p className="text-sm text-gray-700 mb-3">
                      Before you can access the full dashboard and manage operations, you need to set up your railway station layout. This includes:
                    </p>
                    <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
                      <li>Configure platforms and tracks</li>
                      <li>Define shop zones and vendor areas</li>
                      <li>Set up station infrastructure</li>
                      <li>Complete the layout design</li>
                    </ul>
                    <p className="text-sm text-gray-600 mt-3">
                      Once your layout is complete, you&apos;ll have full access to all dashboard features including financial overview, vendor applications, payments, and more.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => router.push('/station-manager/layout-builder')}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md transition-all hover:shadow-lg flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                  </svg>
                  <span>Setup Station Layout</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['STATION_MANAGER']}>
      <div className="min-h-screen bg-gray-50">
        <DashboardNav title="Station Manager Dashboard" />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Missing Documents Banner */}
          {userData && (() => {
            const docs = userData.documents || {};
            const requiredDocs = ['aadhaarCard', 'panCard', 'railwayIdCard', 'photograph'];
            const missingDocs = requiredDocs.filter(doc => !docs[doc as keyof typeof docs]);
            
            if (missingDocs.length > 0) {
              const docLabels: Record<string, string> = {
                aadhaarCard: 'Aadhaar Card',
                panCard: 'PAN Card',
                railwayIdCard: 'Railway ID Card',
                photograph: 'Photograph'
              };
              
              return (
                <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-red-800">
                        Missing Documents Required
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>The following documents need to be uploaded:</p>
                        <ul className="list-disc list-inside mt-1">
                          {missingDocs.map(doc => (
                            <li key={doc}>{docLabels[doc]}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-4">
                        <button
                          onClick={() => router.push('/station-manager/documents')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
                        >
                          Upload Documents Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  Welcome, {user?.name}
                </h2>
                {station ? (
                  <p className="text-gray-600 mt-2">
                    Managing <span className="font-semibold text-blue-600">{station.stationName}</span> ({station.stationCode})
                  </p>
                ) : (
                  <p className="text-gray-600 mt-2">Loading station information...</p>
                )}
              </div>
              <div className="flex space-x-3">
                <a
                  href="/station-manager/layout-builder"
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                  </svg>
                  <span>Layout Builder</span>
                </a>
                <a
                  href="/station-manager/platforms"
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>View Platforms</span>
                </a>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="space-y-6">
            {activeTab === 'overview' && (
              <FinancialOverview refreshTrigger={refreshTrigger} />
            )}

            {activeTab === 'applications' && (
              <ApplicationManagement 
                refreshTrigger={refreshTrigger}
                onRefresh={handleRefresh}
              />
            )}

            {activeTab === 'payments' && (
              <PaymentManagement 
                refreshTrigger={refreshTrigger}
                onRefresh={handleRefresh}
              />
            )}

            {activeTab === 'agreements' && (
              <AgreementManagement 
                refreshTrigger={refreshTrigger}
                onRefresh={handleRefresh}
              />
            )}

            {activeTab === 'inspectors' && (
              <InspectorManagement refreshTrigger={refreshTrigger} />
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

