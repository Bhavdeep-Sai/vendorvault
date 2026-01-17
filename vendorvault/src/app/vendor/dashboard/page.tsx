'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { formatDate, isLicenseExpiringSoon } from '@/lib/helpers';
import EmptyState from '@/components/EmptyState';
import { 
  CurrencyRupeeIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  QrCodeIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { VendorLayout, StatCard, StatusBadge, Alert } from '@/components/vendor';
import toast from 'react-hot-toast';

interface Document {
  _id: string;
  type: string;
  fileUrl: string;
  fileName?: string;
}

interface Application {
  _id: string;
  shopId: string;
  stationName: string;
  platformNumber: string;
  quotedRent: number;
  status: string;
  submittedAt: string;
  finalAgreedRent?: number;
  license?: {
    _id: string;
    licenseNumber?: string;
    status?: string;
    issuedAt?: string;
    expiresAt?: string;
    qrCodeUrl?: string;
    qrCodeData?: string;
    monthlyRent?: number;
    shopId?: string;
  } | null;
}

interface License {
  _id: string;
  licenseNumber: string;
  status: string;
  issuedAt?: string;
  expiresAt?: string;
  rejectionReason?: string;
  qrCodeUrl?: string;
  qrCodeData?: string;
  documents?: Document[];
}

interface Analytics {
  totalApplications: number;
  activeApplications: number;
  totalRevenue: number;
  pendingPayments: number;
  nextPaymentDue?: string;
  monthlyTrend: number;
}

export default function VendorDashboard() {
  const { user, vendor } = useAuth();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [vendorShopCount, setVendorShopCount] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    profileComplete: boolean;
    documentsComplete: boolean;
    missingProfileFields: string[];
    missingDocuments: string[];
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetchLicenses(),
      fetchApplications(),
      fetchAnalytics(),
      checkValidation()
    ]).finally(() => setLoading(false));
  }, []);

  const checkValidation = async () => {
    try {
      const res = await fetch('/api/vendor/validation', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        setValidationStatus(data);
      }
    } catch (error) {
      console.error('Validation check error:', error);
    }
  };

  const fetchLicenses = async () => {
    try {
      const res = await fetch('/api/vendor/license', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        setLicenses(data.licenses || []);
      }
    } catch (error) {
      console.error('Failed to fetch licenses:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/vendor/applications', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
        if (typeof data.shopCount === 'number') setVendorShopCount(data.shopCount);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/vendor/analytics', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const handleRenew = async (licenseId: string) => {
    try {
      const res = await fetch('/api/vendor/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ licenseId }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Renewal application submitted');
        fetchLicenses();
      } else {
        toast.error(data.error || 'Renewal failed');
      }
    } catch {
      toast.error('Renewal failed');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorLayout>
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </VendorLayout>
      </ProtectedRoute>
    );
  }

  const currentLicense = licenses.find((l) => l.status === 'APPROVED' || l.status === 'EXPIRED');
  const approvedApplications = applications.filter((a) => a.status === 'APPROVED');

  return (
    <ProtectedRoute allowedRoles={['VENDOR']}>
      <VendorLayout
        title={`Welcome back, ${user?.name}!`}
        subtitle={vendor ? `${vendor.businessName} • ${vendor.stationName}` : undefined}
        actions={
          validationStatus?.isValid ? (
            <Link
              href="/vendor/apply"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Apply for Shop
            </Link>
          ) : undefined
        }
      >
        {/* Validation Warning */}
        {validationStatus && !validationStatus.isValid && (
          <Alert
            type="warning"
            title="Complete your profile to apply for licenses"
            className="mb-6"
            message={
              !validationStatus.profileComplete 
                ? `Missing profile fields: ${validationStatus.missingProfileFields.join(', ')}`
                : `Required documents: ${validationStatus.missingDocuments.join(', ')}`
            }
            actions={
              <div className="flex gap-3">
                {!validationStatus.profileComplete && (
                  <Link
                    href="/vendor/profile"
                    className="text-sm font-medium text-yellow-800 underline hover:text-yellow-900"
                  >
                    Complete Profile
                  </Link>
                )}
                {!validationStatus.documentsComplete && (
                  <Link
                    href="/vendor/documents"
                    className="text-sm font-medium text-yellow-800 underline hover:text-yellow-900"
                  >
                    Upload Documents
                  </Link>
                )}
              </div>
            }
          />
        )}

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Applications"
            value={applications.length}
            subtitle="All time applications"
            icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
            color="blue"
          />
          <StatCard
            title="Active Shops"
            value={approvedApplications.length}
            subtitle="Currently operating"
            icon={<BuildingStorefrontIcon className="w-6 h-6" />}
            color="green"
          />
          <StatCard
            title="Monthly Revenue"
            value={analytics?.totalRevenue ? `₹${analytics.totalRevenue.toLocaleString()}` : '₹0'}
            subtitle="This month"
            icon={<CurrencyRupeeIcon className="w-6 h-6" />}
            color="purple"
            trend={analytics?.monthlyTrend ? { value: analytics.monthlyTrend, isPositive: analytics.monthlyTrend > 0 } : undefined}
          />
          <StatCard
            title="Pending Payments"
            value={analytics?.pendingPayments ? `₹${analytics.pendingPayments.toLocaleString()}` : '₹0'}
            subtitle={analytics?.nextPaymentDue ? `Due: ${formatDate(analytics.nextPaymentDue)}` : 'No pending payments'}
            icon={<CalendarDaysIcon className="w-6 h-6" />}
            color="yellow"
          />
        </div>

        {/* Current License Section */}
        {currentLicense && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <QrCodeIcon className="w-6 h-6 text-green-600 mr-3" />
              Current License
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">License Number</p>
                <p className="font-bold text-lg text-blue-600">{currentLicense.licenseNumber}</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <StatusBadge status={currentLicense.status} />
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Expires On</p>
                <p className="font-semibold text-gray-900">
                  {currentLicense.expiresAt ? formatDate(currentLicense.expiresAt) : '-'}
                </p>
                {currentLicense.expiresAt && isLicenseExpiringSoon(currentLicense.expiresAt) && (
                  <div className="flex items-center mt-2 text-yellow-600 text-sm">
                    <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                    <span>Expiring soon!</span>
                  </div>
                )}
              </div>
            </div>

            {currentLicense.status === 'APPROVED' && (currentLicense.qrCodeUrl || currentLicense.qrCodeData) && (
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">QR Code for Verification</h4>
                <div className="bg-gray-50 rounded-xl p-6 text-center max-w-md mx-auto">
                  <div className="inline-block bg-white p-4 rounded-xl shadow-sm border">
                    <img 
                      src={currentLicense.qrCodeUrl || currentLicense.qrCodeData} 
                      alt="License QR Code" 
                      className="w-48 h-48"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-4">
                    Present this QR code to railway inspectors for instant verification
                  </p>
                </div>
              </div>
            )}

            {(currentLicense.status === 'APPROVED' || currentLicense.status === 'EXPIRED') && (
              <div className="border-t border-gray-200 pt-6 flex justify-between items-center">
                <Link
                  href={`/verify/${currentLicense.licenseNumber}`}
                  className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
                >
                  <QrCodeIcon className="w-4 h-4" />
                  View Public Verification
                </Link>
                
                <button
                  onClick={() => handleRenew(currentLicense._id)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Renew License
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recent Applications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Recent Applications</h3>
            <Link
              href="/vendor/applications"
              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              View All
            </Link>
          </div>

          {applications.length === 0 ? (
            <EmptyState
              icon={<ClipboardDocumentListIcon className="w-12 h-12" />}
              title="No Applications Yet"
              description="You haven't submitted any shop applications. Start by browsing available shops and applying."
              actionLabel={validationStatus?.isValid ? "Apply for Shop" : undefined}
              actionHref={validationStatus?.isValid ? "/vendor/apply" : undefined}
            />
          ) : (
            <div className="space-y-4">
              {applications.slice(0, 5).map((application) => (
                <div key={application._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900">Shop {application.shopId}</h4>
                        <StatusBadge status={application.status} size="sm" />
                      </div>
                      <p className="text-sm text-gray-600">
                        {application.stationName} • Platform {application.platformNumber} • ₹{application.quotedRent.toLocaleString()}/month
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Applied on {formatDate(application.submittedAt)}
                      </p>

                      {application.license && application.license.status === 'APPROVED' && (
                        <div className="mt-3 bg-gray-50 rounded-md p-3">
                          <div className="flex items-center gap-4">
                            {(application.license.qrCodeUrl || application.license.qrCodeData) && (
                              <img src={application.license.qrCodeUrl || application.license.qrCodeData} alt="qr" className="w-20 h-20 rounded-md border" />
                            )}
                            <div>
                              <p className="text-sm text-gray-600">Expires on <span className="font-medium text-gray-900">{application.license.expiresAt ? formatDate(application.license.expiresAt) : '-'}</span></p>
                              <p className="text-sm text-gray-600">Monthly Rent: <span className="font-medium">₹{application.license.monthlyRent?.toLocaleString() || application.quotedRent.toLocaleString()}</span></p>
                              <p className="text-sm text-gray-600">Shop ID: <span className="font-medium">{application.license.shopId || application.shopId}</span></p>
                              {vendorShopCount !== null && (
                                <p className="text-sm text-gray-600">Total Shops Allocated: <span className="font-medium">{vendorShopCount}</span></p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {application.status === 'NEGOTIATION' && (
                        <Link
                          href={`/vendor/negotiation/${application._id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          View Negotiation
                        </Link>
                      )}
                      <ChartBarIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/vendor/profile"
              className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-all group"
            >
              <UserIcon className="w-8 h-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">Update Profile</p>
              <p className="text-sm text-gray-600">Manage your business information</p>
            </Link>
            
            <Link
              href="/vendor/documents"
              className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-all group"
            >
              <DocumentTextIcon className="w-8 h-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">Manage Documents</p>
              <p className="text-sm text-gray-600">Upload and verify documents</p>
            </Link>
            
            <Link
              href="/vendor/applications"
              className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-all group"
            >
              <ArrowTrendingUpIcon className="w-8 h-8 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">View Analytics</p>
              <p className="text-sm text-gray-600">Track your business performance</p>
            </Link>
          </div>
        </div>
      </VendorLayout>
    </ProtectedRoute>
  );
}


