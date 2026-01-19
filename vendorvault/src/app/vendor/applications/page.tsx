'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { VendorLayout, StatusBadge, Alert } from '@/components/vendor';
import EmptyState from '@/components/EmptyState';
import { formatDate } from '@/lib/helpers';
import { 
  ClipboardDocumentListIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  BuildingStorefrontIcon,
  CurrencyRupeeIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  QrCodeIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface License {
  _id: string;
  licenseNumber: string;
  status: string;
  issuedAt?: string;
  expiresAt?: string;
  qrCodeUrl?: string;
  qrCodeData?: string;
  monthlyRent?: number;
  shopId?: string;
}

interface Application {
  _id: string;
  shopId: string;
  shopName?: string;
  stationName: string;
  platformNumber: string;
  quotedRent: number;
  securityDeposit: number;
  proposedStartDate: string;
  proposedEndDate: string;
  status: string;
  submittedAt: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  finalAgreedRent?: number;
  finalSecurityDeposit?: number;
  businessPlan?: string;
  specialRequests?: string;
  licenseNumber?: string;
  license?: License;
}

const statusFilters = [
  { value: 'ALL', label: 'All Applications' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'NEGOTIATION', label: 'In Negotiation' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'LICENSED', label: 'Licensed' },
];

export default function VendorApplicationsPage() {
  const { } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editingShopName, setEditingShopName] = useState('');
  const [savingShopName, setSavingShopName] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    filterApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applications, searchQuery, statusFilter]);

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/vendor/applications', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
      } else {
        console.error('Failed to fetch applications');
      }
    } catch (error) {
      console.error('Applications fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = applications;

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app => 
        app.shopId.toLowerCase().includes(query) ||
        (app.shopName && app.shopName.toLowerCase().includes(query)) ||
        app.stationName.toLowerCase().includes(query) ||
        app.platformNumber.toLowerCase().includes(query)
      );
    }

    setFilteredApplications(filtered);
  };

  const handleEditShopName = (application: Application) => {
    setEditingShopId(application._id);
    setEditingShopName(application.shopName || `Shop ${application.shopId}`);
  };

  const handleSaveShopName = async (applicationId: string) => {
    if (!editingShopName.trim()) return;
    
    setSavingShopName(true);
    try {
      const res = await fetch(`/api/vendor/applications/${applicationId}/shop-name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopName: editingShopName.trim() }),
        credentials: 'same-origin',
      });

      if (res.ok) {
        // Update local state
        setApplications(prev => prev.map(app => 
          app._id === applicationId 
            ? { ...app, shopName: editingShopName.trim() }
            : app
        ));
        setEditingShopId(null);
        setEditingShopName('');
      } else {
        console.error('Failed to update shop name');
        alert('Failed to update shop name. Please try again.');
      }
    } catch (error) {
      console.error('Error updating shop name:', error);
      alert('Error updating shop name. Please try again.');
    } finally {
      setSavingShopName(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingShopId(null);
    setEditingShopName('');
  };

  const getActionButton = (application: Application) => {
    switch (application.status) {
      case 'NEGOTIATION':
        return (
          <Link
            href={`/vendor/negotiation/${application._id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
            View Negotiation
          </Link>
        );
      case 'DRAFT':
        return (
          <Link
            href={`/vendor/apply?applicationId=${application._id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-800"
          >
            Continue Application
          </Link>
        );
      case 'APPROVED':
      case 'LICENSED':
      case 'ACTIVE':
        if (application.license || application.licenseNumber) {
          return (
            <button
              onClick={() => {
                setSelectedLicense(application.license || {
                  _id: application._id,
                  licenseNumber: application.licenseNumber || '',
                  status: application.status,
                  qrCodeUrl: '',
                  qrCodeData: ''
                });
                setShowQRModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              <QrCodeIcon className="w-4 h-4" />
              View QR Code
            </button>
          );
        }
        return null;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorLayout title="Applications">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </VendorLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['VENDOR']}>
      <VendorLayout
        title="My Applications"
        subtitle="Track and manage your shop applications"
        actions={
          <Link
            href="/vendor/apply"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            New Application
          </Link>
        }
      >
        {applications.length === 0 ? (
          <EmptyState
            icon={<ClipboardDocumentListIcon className="w-16 h-16" />}
            title="No Applications Yet"
            description="You haven't submitted any shop applications. Start by browsing available shops and applying for the ones that suit your business."
            actionLabel="Apply for Shop"
            actionHref="/vendor/apply"
          />
        ) : (
          <>
            {/* Filters and Search */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by shop ID, station, or platform..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FunnelIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                  >
                    {statusFilters.map((filter) => (
                      <option key={filter.value} value={filter.value}>
                        {filter.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Results count */}
              <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {filteredApplications.length} of {applications.length} applications
                </span>
              </div>
            </div>

            {/* Applications Grid */}
            <div className="space-y-4">
              {filteredApplications.map((application) => (
                <div
                  key={application._id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="bg-blue-50 p-2 rounded-lg">
                          <BuildingStorefrontIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {editingShopId === application._id ? (
                              <div className="flex items-center gap-2 flex-1">
                                <input
                                  type="text"
                                  value={editingShopName}
                                  onChange={(e) => setEditingShopName(e.target.value)}
                                  className="flex-1 px-3 py-1 border border-blue-300 rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') handleSaveShopName(application._id);
                                    if (e.key === 'Escape') handleCancelEdit();
                                  }}
                                />
                                <button
                                  onClick={() => handleSaveShopName(application._id)}
                                  disabled={savingShopName}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                                  title="Save"
                                >
                                  <CheckIcon className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={savingShopName}
                                  className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors disabled:opacity-50"
                                  title="Cancel"
                                >
                                  <XMarkIcon className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {application.shopName || `Shop ${application.shopId}`}
                                </h3>
                                <button
                                  onClick={() => handleEditShopName(application)}
                                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Edit shop name"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <StatusBadge 
                              status={application.status} 
                              size="sm" 
                            />
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <BuildingStorefrontIcon className="w-4 h-4" />
                              {application.stationName}
                            </span>
                            <span>Platform {application.platformNumber}</span>
                            <span className="text-gray-400">Shop ID: {application.shopId}</span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <CurrencyRupeeIcon className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-700">
                              {application.finalAgreedRent ? 'Agreed Rent' : 'Quoted Rent'}
                            </span>
                          </div>
                          <p className="text-lg font-semibold text-gray-900">
                            ₹{(application.finalAgreedRent || application.quotedRent).toLocaleString()}
                            <span className="text-sm font-normal text-gray-500">/month</span>
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-700">Security Deposit</span>
                          </div>
                          <p className="text-lg font-semibold text-gray-900">
                            ₹{(application.finalSecurityDeposit || application.securityDeposit).toLocaleString()}
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <CalendarDaysIcon className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">Duration</span>
                          </div>
                          <p className="text-sm text-gray-900">
                            {formatDate(application.proposedStartDate)} - {formatDate(application.proposedEndDate)}
                          </p>
                        </div>
                      </div>

                      {/* Special Notes */}
                      {(application.businessPlan || application.specialRequests) && (
                        <div className="mb-4">
                          {application.businessPlan && (
                            <div className="mb-2">
                              <span className="text-sm font-medium text-gray-700">Business Plan: </span>
                              <span className="text-sm text-gray-600">{application.businessPlan}</span>
                            </div>
                          )}
                          {application.specialRequests && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Special Requests: </span>
                              <span className="text-sm text-gray-600">{application.specialRequests}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {application.status === 'REJECTED' && application.rejectionReason && (
                        <Alert
                          type="error"
                          title="Application Rejected"
                          message={application.rejectionReason}
                          className="mb-4"
                        />
                      )}

                      {/* Timeline */}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <span>Applied: {formatDate(application.submittedAt)}</span>
                          {application.reviewedAt && (
                            <span>Reviewed: {formatDate(application.reviewedAt)}</span>
                          )}
                          {application.approvedAt && (
                            <span>Approved: {formatDate(application.approvedAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="ml-4">
                      {getActionButton(application)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty filtered results */}
            {filteredApplications.length === 0 && applications.length > 0 && (
              <div className="text-center py-12">
                <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
                <p className="text-gray-600">
                  Try adjusting your search terms or filter criteria.
                </p>
              </div>
            )}
          </>
        )}

        {/* QR Code Modal */}
        {showQRModal && selectedLicense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">License QR Code</h2>
                <button
                  onClick={() => {
                    setShowQRModal(false);
                    setSelectedLicense(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* License Details */}
                <div className="mb-6 bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">License Number</p>
                      <p className="font-semibold text-gray-900">{selectedLicense.licenseNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Status</p>
                      <StatusBadge status={selectedLicense.status} size="sm" />
                    </div>
                    {selectedLicense.shopId && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Shop ID</p>
                        <p className="font-semibold text-gray-900">{selectedLicense.shopId}</p>
                      </div>
                    )}
                    {selectedLicense.expiresAt && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Expires On</p>
                        <p className="font-semibold text-gray-900">{formatDate(selectedLicense.expiresAt)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* QR Code Display */}
                {(selectedLicense.qrCodeUrl || selectedLicense.qrCodeData) ? (
                  <div className="bg-white rounded-xl p-6 text-center border-2 border-gray-200">
                    <div className="inline-block bg-white p-4 rounded-xl shadow-sm">
                      <img 
                        src={selectedLicense.qrCodeUrl || selectedLicense.qrCodeData} 
                        alt="License QR Code" 
                        className="w-64 h-64 mx-auto"
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-4">
                      Present this QR code to railway inspectors for instant verification
                    </p>
                    {selectedLicense.licenseNumber && (
                      <Link
                        href={`/verify/${selectedLicense.licenseNumber}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <QrCodeIcon className="w-4 h-4" />
                        View Public Verification Page
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <ExclamationTriangleIcon className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                    <p className="text-gray-700 font-medium mb-2">QR Code Not Available</p>
                    <p className="text-sm text-gray-600">
                      The QR code for this license hasn&apos;t been generated yet. Please contact the station manager.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowQRModal(false);
                    setSelectedLicense(null);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                {(selectedLicense.qrCodeUrl || selectedLicense.qrCodeData) && (
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedLicense.qrCodeUrl || selectedLicense.qrCodeData || '';
                      link.download = `license-${selectedLicense.licenseNumber}-qr.png`;
                      link.click();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Download QR Code
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </VendorLayout>
    </ProtectedRoute>
  );
}
