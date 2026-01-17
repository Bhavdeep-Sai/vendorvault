'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface AgreementManagementProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

interface Agreement {
  _id: string;
  vendorId: {
    _id: string;
    fullName: string;
    email: string;
    contactNumber: string;
  };
  applicationId: {
    _id: string;
    shopId: string;
  };
  agreementNumber: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  securityDepositPaid: boolean;
  status: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  renewalRequired: boolean;
}

export function AgreementManagement({ refreshTrigger, onRefresh }: AgreementManagementProps) {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ACTIVE');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);

  useEffect(() => {
    fetchAgreements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, filter, showExpiringOnly]);

  const fetchAgreements = async () => {
    setLoading(true);
    try {
      let url = `/api/station-manager/agreements?status=${filter}`;
      if (showExpiringOnly) {
        url += '&expiring=true';
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAgreements(data.agreements);
      } else {
        toast.error('Failed to load agreements');
      }
    } catch {
      toast.error('Error loading agreements');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateAgreement = async (agreementId: string) => {
    if (!confirm('Are you sure you want to activate this agreement?')) return;

    setProcessing(agreementId);
    try {
      const response = await fetch('/api/station-manager/agreements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId, action: 'ACTIVATE' }),
      });

      if (response.ok) {
        toast.success('Agreement activated successfully!');
        fetchAgreements();
        onRefresh?.();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to activate agreement');
      }
    } catch {
      toast.error('Error activating agreement');
    } finally {
      setProcessing(null);
    }
  };

  const handleTerminateAgreement = async (agreementId: string) => {
    const reason = prompt('Please provide a reason for termination:');
    if (!reason || reason.trim() === '') {
      toast.error('Termination reason is required');
      return;
    }

    setProcessing(agreementId);
    try {
      const response = await fetch('/api/station-manager/agreements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId, action: 'TERMINATE', reason }),
      });

      if (response.ok) {
        toast.success('Agreement terminated');
        fetchAgreements();
        onRefresh?.();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to terminate agreement');
      }
    } catch {
      toast.error('Error terminating agreement');
    } finally {
      setProcessing(null);
    }
  };

  const getDaysUntilExpiry = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getDaysUntilLicenseExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      DRAFT: 'bg-gray-100 text-gray-800',
      EXPIRED: 'bg-red-100 text-red-800',
      RENEWED: 'bg-blue-100 text-blue-800',
      TERMINATED: 'bg-orange-100 text-orange-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Agreement Management
          </h2>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showExpiringOnly}
                onChange={(e) => setShowExpiringOnly(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Expiring soon</span>
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="EXPIRED">Expired</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Agreement #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor/Shop
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Security Deposit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                License Expiry
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {agreements.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  No agreements found
                </td>
              </tr>
            ) : (
              agreements.map((agreement) => {
                const daysUntilExpiry = getDaysUntilExpiry(agreement.endDate);
                const daysUntilLicenseExpiry = getDaysUntilLicenseExpiry(agreement.licenseExpiryDate);
                
                return (
                  <tr key={agreement._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {agreement.agreementNumber}
                      </div>
                      <div className="text-xs text-gray-500">
                        License: {agreement.licenseNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {agreement.vendorId?.fullName || 'Vendor'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Shop: {agreement.applicationId?.shopId || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(agreement.startDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-900">
                        to {new Date(agreement.endDate).toLocaleDateString()}
                      </div>
                      {agreement.status === 'ACTIVE' && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
                        <div className="text-xs text-orange-600 mt-1">
                          ⚠️ Expires in {daysUntilExpiry} days
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{agreement.monthlyRent.toLocaleString()}/mo
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ₹{agreement.securityDeposit.toLocaleString()}
                      </div>
                      <div className="text-xs">
                        {agreement.securityDepositPaid ? (
                          <span className="text-green-600">✓ Paid</span>
                        ) : (
                          <span className="text-red-600">✗ Pending</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(agreement.licenseExpiryDate).toLocaleDateString()}
                      </div>
                      {agreement.status === 'ACTIVE' && daysUntilLicenseExpiry <= 30 && daysUntilLicenseExpiry > 0 && (
                        <div className="text-xs text-red-600 mt-1">
                          ⚠️ {daysUntilLicenseExpiry} days left
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(agreement.status)}`}>
                        {agreement.status}
                      </span>
                      {agreement.renewalRequired && (
                        <div className="text-xs text-orange-600 mt-1">
                          Renewal Required
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {agreement.status === 'DRAFT' && (
                        <button
                          onClick={() => handleActivateAgreement(agreement._id)}
                          disabled={processing === agreement._id}
                          className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                        >
                          Activate
                        </button>
                      )}
                      {agreement.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleTerminateAgreement(agreement._id)}
                          disabled={processing === agreement._id}
                          className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                        >
                          Terminate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

