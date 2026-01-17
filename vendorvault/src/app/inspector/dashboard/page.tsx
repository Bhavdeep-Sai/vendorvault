'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { 
  UserIcon,
  LogoutIcon, 
  DashboardIcon, 
  SearchIcon,
  CheckIcon,
  ClockIcon,
  AlertIcon
} from '@/components/Icons';
import { getStatusColor, formatDate } from '@/lib/helpers';
import toast from 'react-hot-toast';

interface Inspection {
  _id: string;
  licenseNumber: string;
  vendor: {
    businessName: string;
    ownerName: string;
    stationName: string;
    stallType: string;
  };
  complianceStatus: string;
  lastInspectionDate: string;
  totalInspections: number;
  lastInspection?: {
    inspectorName: string;
    inspectionDate: string;
    notes?: string;
    complianceStatus: string;
  };
}

interface Stats {
  totalActiveLicenses: number;
  compliantLicenses: number;
  nonCompliantLicenses: number;
  requiresAttentionLicenses: number;
  myTotalInspections: number;
}

export default function InspectorDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [complianceStatus, setComplianceStatus] = useState<'COMPLIANT' | 'NON_COMPLIANT' | 'REQUIRES_ATTENTION'>('COMPLIANT');
  const [notes, setNotes] = useState('');
  const [logging, setLogging] = useState(false);
  const [filterCompliance, setFilterCompliance] = useState('all');

  useEffect(() => {
    fetchAllData();
  }, [filterCompliance]);

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchStats(),
        fetchInspections()
      ]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/inspector/stats', { credentials: 'same-origin' });
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchInspections = async () => {
    try {
      const url = `/api/inspector/inspections?compliance=${filterCompliance}`;
      const response = await fetch(url, { credentials: 'same-origin' });
      if (response.ok) {
        const data = await response.json();
        setInspections(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch inspections:', error);
    }
  };

  const handleLogInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseNumber.trim()) {
      toast.error('Please enter a license number');
      return;
    }

    setLogging(true);
    try {
      const res = await fetch('/api/inspector/log-inspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          licenseNumber: licenseNumber.trim(),
          complianceStatus,
          notes: notes.trim(),
        }),
      });

      if (res.ok) {
        toast.success('Inspection logged successfully');
        setLicenseNumber('');
        setNotes('');
        setComplianceStatus('COMPLIANT');
        fetchAllData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to log inspection');
      }
    } catch (error) {
      toast.error('Failed to log inspection');
    } finally {
      setLogging(false);
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return 'bg-green-100 text-green-800';
      case 'NON_COMPLIANT':
        return 'bg-red-100 text-red-800';
      case 'REQUIRES_ATTENTION':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['INSPECTOR']}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['INSPECTOR']}>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <DashboardIcon className="text-blue-600" size={24} />
                <h1 className="text-xl font-bold text-gray-900">Inspector Dashboard</h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <UserIcon className="text-gray-600" size={16} />
                  <span className="text-sm text-gray-900 font-medium">{user?.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center space-x-1 text-sm text-gray-700 hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
                >
                  <LogoutIcon size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Welcome, {user?.name}</h2>
            <p className="text-gray-600 mt-2">Inspect vendor licenses and ensure compliance</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Active Licenses</p>
                  <p className="text-3xl font-bold text-blue-600">{stats?.totalActiveLicenses || 0}</p>
                </div>
                <SearchIcon className="text-blue-500" size={32} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Compliant</p>
                  <p className="text-3xl font-bold text-green-600">{stats?.compliantLicenses || 0}</p>
                </div>
                <CheckIcon className="text-green-500" size={32} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Non-Compliant</p>
                  <p className="text-3xl font-bold text-red-600">{stats?.nonCompliantLicenses || 0}</p>
                </div>
                <AlertIcon className="text-red-500" size={32} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Needs Attention</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats?.requiresAttentionLicenses || 0}</p>
                </div>
                <ClockIcon className="text-yellow-500" size={32} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">My Inspections</p>
                  <p className="text-3xl font-bold text-purple-600">{stats?.myTotalInspections || 0}</p>
                </div>
                <UserIcon className="text-purple-500" size={32} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold text-gray-900">Log Inspection</h3>
                  <Link href="/inspector/scan" className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Scan QR</Link>
                </div>
                <form onSubmit={handleLogInspection} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Number
                    </label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter license number"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Compliance Status
                    </label>
                    <select
                      value={complianceStatus}
                      onChange={(e) => setComplianceStatus(e.target.value as typeof complianceStatus)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="COMPLIANT">Compliant</option>
                      <option value="NON_COMPLIANT">Non-Compliant</option>
                      <option value="REQUIRES_ATTENTION">Requires Attention</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter inspection notes..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={logging}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                  >
                    {logging ? 'Logging...' : 'Log Inspection'}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-900">Inspection History</h3>
                  <select
                    value={filterCompliance}
                    onChange={(e) => setFilterCompliance(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="COMPLIANT">Compliant</option>
                    <option value="NON_COMPLIANT">Non-Compliant</option>
                    <option value="REQUIRES_ATTENTION">Requires Attention</option>
                  </select>
                </div>

                {inspections.length === 0 ? (
                  <div className="text-center py-12">
                    <SearchIcon className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-600 text-lg">No inspections found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                    {inspections.map((inspection) => (
                      <div key={inspection._id} className="p-6 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-mono font-medium text-blue-600">
                                {inspection.licenseNumber}
                              </span>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getComplianceColor(inspection.complianceStatus)}`}>
                                {inspection.complianceStatus.replace('_', ' ')}
                              </span>
                            </div>
                            <h4 className="font-semibold text-gray-900">
                              {inspection.vendor.businessName}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {inspection.vendor.ownerName} • {inspection.vendor.stationName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Last Inspected</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDate(inspection.lastInspectionDate)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {inspection.totalInspections} total inspection{inspection.totalInspections !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        {inspection.lastInspection?.notes && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Notes:</span> {inspection.lastInspection.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}


