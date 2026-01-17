'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { NotificationBell } from '@/components/NotificationBell';
import { TrainIcon, LogoutIcon } from '@/components/Icons';
import { StatsOverview } from '@/components/railway-admin/StatsOverview';
import { UsersManagement } from '@/components/railway-admin/UsersManagement';
import { StationsManagement } from '@/components/railway-admin/StationsManagement';
import { ReferenceStationsManagement } from '@/components/railway-admin/ReferenceStationsManagement';
import { PlatformsManagement } from '@/components/railway-admin/PlatformsManagement';
import { DocumentsModal } from '@/components/railway-admin/DocumentsModal';
import toast from 'react-hot-toast';

// Interfaces
interface AdminStats {
  totalUsers: number;
  totalStationManagers: number;
  pendingStationManagers: number;
  approvedStationManagers: number;
  totalVendors: number;
  totalInspectors: number;
  totalStations: number;
  pendingStations: number;
  totalReferenceStations: number;
  totalPlatforms: number;
  pendingDocuments: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  verificationStatus?: string;
  railwayEmployeeId?: string;
  documents?: {
    aadhaarCard?: string;
    panCard?: string;
    railwayIdCard?: string;
    photograph?: string;
    educationalCertificate?: string;
    experienceLetter?: string;
  };
  createdAt: string;
}

interface ReferenceStation {
  _id: string;
  stationName: string;
  stationCode: string;
  railwayZone: string;
  division?: string;
  stationCategory: string;
  platformsCount: number;
  dailyFootfallAvg: number;
  city?: string;
  state?: string;
  pincode?: string;
  address?: string;
}

interface Station {
  _id: string;
  stationName: string;
  stationCode: string;
  railwayZone: string;
  stationCategory: string;
  platformsCount: number;
  dailyFootfallAvg: number;
  approvalStatus: string;
  operationalStatus: string;
  stationManagerId?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

interface Platform {
  _id: string;
  platformNumber: number;
  platformType: string;
  platformLength: number;
  platformWidth: number;
  stationId: {
    stationName: string;
    stationCode: string;
  };
}

export default function RailwayAdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'stations' | 'referenceStations' | 'platforms'>('overview');
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalStationManagers: 0,
    pendingStationManagers: 0,
    approvedStationManagers: 0,
    totalVendors: 0,
    totalInspectors: 0,
    totalStations: 0,
    pendingStations: 0,
    totalReferenceStations: 0,
    totalPlatforms: 0,
    pendingDocuments: 0,
  });

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [referenceStations, setReferenceStations] = useState<ReferenceStation[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Document modal
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, activeTab]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const statsRes = await fetch('/api/railway-admin/stats');
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }

      // Fetch data based on active tab
      if (activeTab === 'users') {
        const usersRes = await fetch('/api/railway-admin/users');
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data.users);
        }
      } else if (activeTab === 'stations') {
        const stationsRes = await fetch('/api/railway-admin/stations/applications');
        if (stationsRes.ok) {
          const data = await stationsRes.json();
          setStations(data.stations);
        }
      } else if (activeTab === 'referenceStations') {
        const refStationsRes = await fetch('/api/railway-admin/reference-stations');
        if (refStationsRes.ok) {
          const data = await refStationsRes.json();
          setReferenceStations(data.stations);
        }
      } else if (activeTab === 'platforms') {
        const platformsRes = await fetch('/api/railway-admin/platforms');
        if (platformsRes.ok) {
          const data = await platformsRes.json();
          setPlatforms(data.platforms);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocuments = (user: User) => {
    setSelectedUser(user);
    setShowDocumentModal(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['RAILWAY_ADMIN']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-cyan-600 p-2 rounded-lg">
                    <TrainIcon className="text-white" size={24} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Railway Admin</h1>
                    <p className="text-sm text-gray-500">Management Dashboard</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <NotificationBell />
                <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogoutIcon size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6">
            <div className="flex space-x-1 border-b border-gray-200">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'users', label: 'Users' },
                { id: 'stations', label: 'Station Applications' },
                { id: 'referenceStations', label: 'Reference Stations' },
                { id: 'platforms', label: 'Platforms' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-cyan-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-6 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && <StatsOverview stats={stats} />}
              {activeTab === 'users' && (
                <UsersManagement 
                  users={users} 
                  onRefresh={fetchDashboardData}
                  onViewDocuments={handleViewDocuments}
                />
              )}
              {activeTab === 'stations' && (
                <StationsManagement 
                  stations={stations} 
                  onRefresh={fetchDashboardData}
                />
              )}
              {activeTab === 'referenceStations' && (
                <ReferenceStationsManagement 
                  stations={referenceStations} 
                  onRefresh={fetchDashboardData}
                />
              )}
              {activeTab === 'platforms' && (
                <PlatformsManagement platforms={platforms} />
              )}
            </>
          )}
        </main>

        {/* Document Modal */}
        {showDocumentModal && selectedUser && (
          <DocumentsModal
            user={selectedUser}
            onClose={() => {
              setShowDocumentModal(false);
              setSelectedUser(null);
            }}
            onRefresh={fetchDashboardData}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
