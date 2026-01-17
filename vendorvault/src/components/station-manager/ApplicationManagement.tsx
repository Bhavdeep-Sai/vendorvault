'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface ApplicationManagementProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

interface Application {
  _id: string;
  vendorId: {
    _id: string;
    fullName: string;
    email: string;
    contactNumber: string;
  };
  shopId: string;
  quotedRent: number;
  securityDeposit: number;
  status: string;
  submittedAt: string;
  verificationStatus?: {
    allVerified: boolean;
  };
  riskLevel?: string;
}

export function ApplicationManagement({ refreshTrigger, onRefresh }: ApplicationManagementProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('SUBMITTED');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, filter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/station-manager/applications?status=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      } else {
        toast.error('Failed to load applications');
      }
    } catch {
      toast.error('Error loading applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId: string) => {
    if (!confirm('Are you sure you want to approve this application?')) return;

    // Ask station manager for expiry months and security deposit override
    const monthsInput = prompt('Set license validity (months). Leave blank to use default 12:', '12');
    if (monthsInput === null) return; // cancelled
    const months = monthsInput.trim() === '' ? 12 : parseInt(monthsInput, 10);
    if (isNaN(months) || months <= 0) {
      toast.error('Expiry months must be a positive number');
      return;
    }

    // Find current application to suggest deposit
    const app = applications.find((a) => a._id === applicationId);
    const suggested = app ? app.securityDeposit : 0;
    const depositInput = prompt(`Set security deposit amount. Current: ₹${suggested}`, String(suggested));
    if (depositInput === null) return;
    const deposit = parseFloat(depositInput);
    if (isNaN(deposit) || deposit < 0) {
      toast.error('Security deposit must be a non-negative number');
      return;
    }

    setProcessing(applicationId);
    try {
      const response = await fetch('/api/station-manager/applications/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, action: 'APPROVED', expiryMonths: months, securityDeposit: deposit }),
      });

      if (response.ok) {
        toast.success('Application approved successfully!');
        fetchApplications();
        onRefresh?.();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to approve application');
      }
    } catch {
      toast.error('Error approving application');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (applicationId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason || reason.trim() === '') {
      toast.error('Rejection reason is required');
      return;
    }

    setProcessing(applicationId);
    try {
      const response = await fetch('/api/station-manager/applications/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, action: 'REJECTED', rejectionReason: reason }),
      });

      if (response.ok) {
        toast.success('Application rejected');
        fetchApplications();
        onRefresh?.();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to reject application');
      }
    } catch {
      toast.error('Error rejecting application');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      SUBMITTED: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      NEGOTIATION: 'bg-purple-100 text-purple-800',
      ACTIVE: 'bg-green-100 text-green-800',
      DRAFT: 'bg-gray-100 text-gray-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getRiskBadge = (riskLevel?: string) => {
    if (!riskLevel) return null;
    
    const badges: Record<string, string> = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-red-100 text-red-800',
    };
    
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${badges[riskLevel]}`}>
        {riskLevel} Risk
      </span>
    );
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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Vendor Applications
          </h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="SUBMITTED">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ACTIVE">Active</option>
            <option value="NEGOTIATION">In Negotiation</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Shop ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rent/Deposit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submitted
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Verification
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Risk
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
            {applications.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  No applications found
                </td>
              </tr>
            ) : (
              applications.map((app) => (
                <tr key={app._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {app.vendorId.fullName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {app.vendorId.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      {app.vendorId.contactNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {app.shopId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      Rent: ₹{app.quotedRent.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      Deposit: ₹{app.securityDeposit.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(app.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {app.verificationStatus?.allVerified ? (
                      <span className="text-green-600 text-sm">✓ Verified</span>
                    ) : (
                      <span className="text-orange-600 text-sm">⚠️ Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRiskBadge(app.riskLevel)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(app.status)}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {app.status === 'SUBMITTED' && (
                      <>
                        <button
                          onClick={() => handleApprove(app._id)}
                          disabled={processing === app._id}
                          className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(app._id)}
                          disabled={processing === app._id}
                          className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <a
                      href={`/station-manager/applications/${app._id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

