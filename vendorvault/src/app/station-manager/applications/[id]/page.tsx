'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import toast from 'react-hot-toast';
import {
  CheckIcon,
  DocumentIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  EyeIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

interface VendorInfo {
  _id: string;
  userId: string;
  businessName: string;
  ownerName: string;
  email: string;
  contactNumber: string;
  address: string;
  gstNumber: string;
  stallType: string;
  panNumber?: string;
  user?: {
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
}

interface DocumentInfo {
  _id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  verified: boolean;
  verificationNotes?: string;
  uploadedAt: string;
}

interface ApplicationDetails {
  _id: string;
  vendor: VendorInfo;
  application: {
    _id: string;
    shopId: string;
    quotedRent: number;
    status: string;
    submittedAt: string;
  };
  license: {
    _id: string;
    licenseNumber?: string;
    status: string;
    proposedRent: number;
    createdAt: string;
  };
  documents: DocumentInfo[];
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;

  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingDoc, setProcessingDoc] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [expiryMonths, setExpiryMonths] = useState<number>(12);
  const [securityDepositInput, setSecurityDepositInput] = useState<number>(0);

  useEffect(() => {
    fetchApplicationDetails();
  }, [applicationId]);

  const fetchApplicationDetails = async () => {
    try {
      const res = await fetch(`/api/station-manager/applications/${applicationId}`, {
        credentials: 'same-origin',
      });

      if (res.ok) {
        const data = await res.json();
        setApplication(data.application);
        // initialize inputs from returned data if available
        try {
          const months = data.application?.license?.validityMonths || 12;
          const deposit = data.application?.application?.securityDeposit ?? data.application?.finalSecurityDeposit ?? 0;
          setExpiryMonths(Number(months));
          setSecurityDepositInput(Number(deposit));
        } catch {}
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to load application details');
        router.push('/station-manager/dashboard');
      }
    } catch (error) {
      toast.error('Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentVerify = async (documentId: string, verified: boolean) => {
    const notes = !verified ? prompt('Please provide reason for rejection:') : '';
    if (!verified && !notes) {
      toast.error('Rejection reason is required');
      return;
    }

    setProcessingDoc(documentId);
    try {
      const res = await fetch('/api/station-manager/documents/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          documentId,
          verified,
          verificationNotes: notes,
        }),
      });

      if (res.ok) {
        toast.success(verified ? 'Document verified!' : 'Document rejected');
        await fetchApplicationDetails();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to verify document');
      }
    } catch (error) {
      toast.error('Failed to verify document');
    } finally {
      setProcessingDoc(null);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this application?')) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/station-manager/approve-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ 
          licenseId: application?.license._id,
          action: 'APPROVED',
          expiryMonths: expiryMonths,
          securityDeposit: securityDepositInput,
        }),
      });

      if (res.ok) {
        toast.success('Application approved successfully!');
        router.push('/station-manager/dashboard');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to approve application');
      }
    } catch (error) {
      toast.error('Failed to approve application');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdate = async () => {
    if (!confirm('Save changes to license expiry and security deposit?')) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/station-manager/applications/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          applicationId: application?._id,
          expiryMonths: expiryMonths,
          securityDeposit: securityDepositInput,
        }),
      });

      if (res.ok) {
        toast.success('Application updated successfully');
        await fetchApplicationDetails();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update');
      }
    } catch (err) {
      toast.error('Failed to update');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Please provide reason for rejection:');
    if (!reason || reason.trim() === '') {
      toast.error('Rejection reason is required');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/station-manager/approve-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          licenseId: application?.license._id,
          action: 'REJECTED',
          rejectionReason: reason,
        }),
      });

      if (res.ok) {
        toast.success('Application rejected');
        router.push('/station-manager/dashboard');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to reject application');
      }
    } catch (error) {
      toast.error('Failed to reject application');
    } finally {
      setProcessing(false);
    }
  };

  const allDocumentsVerified = application?.documents.every(doc => doc.verified) || false;
  const hasRejectedDocuments = application?.documents.some(doc => doc.verified === false) || false;

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['STATION_MANAGER']}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!application) {
    return null;
  }

  return (
    <ProtectedRoute allowedRoles={['STATION_MANAGER']}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Application Review</h1>
            <p className="text-gray-600 mt-2">
              Review vendor details and documents before approval
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Vendor Info & Application Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Vendor Information */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <UserIcon className="w-6 h-6 mr-2 text-blue-600" />
                  Vendor Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Full Name</label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {application.vendor.ownerName || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Business Name</label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {application.vendor.businessName || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Owner Name</label>
                    <p className="text-lg text-gray-900 mt-1">
                      {application.vendor.ownerName || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">PAN Number</label>
                    <p className="text-lg text-gray-900 mt-1 font-mono">
                      {application.vendor.panNumber || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center">
                      <EnvelopeIcon className="w-4 h-4 mr-1" />
                      Email
                    </label>
                    <p className="text-gray-900 mt-1">
                      {application.vendor.user?.email || application.vendor.email || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center">
                      <PhoneIcon className="w-4 h-4 mr-1" />
                      Contact Number
                    </label>
                    <p className="text-gray-900 mt-1">
                      {application.vendor.user?.phone || application.vendor.contactNumber || 'N/A'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500 flex items-center">
                      <BuildingOfficeIcon className="w-4 h-4 mr-1" />
                      Address
                    </label>
                    <p className="text-gray-900 mt-1">
                      {application.vendor.address}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">GST Number</label>
                    <p className="text-gray-900 mt-1 font-mono">
                      {application.vendor.gstNumber || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Stall Type</label>
                    <p className="text-gray-900 mt-1 capitalize">
                      {application.vendor.stallType}
                    </p>
                  </div>
                </div>
              </div>

              {/* Application Details */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <DocumentIcon className="w-6 h-6 mr-2 text-green-600" />
                  Application Details
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Shop ID</label>
                    <p className="text-lg font-mono font-semibold text-gray-900 mt-1">
                      {application.application.shopId}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center">
                      <BanknotesIcon className="w-4 h-4 mr-1" />
                      Proposed Rent
                    </label>
                    <p className="text-lg font-semibold text-green-600 mt-1">
                      ₹{application.license.proposedRent.toLocaleString()}/month
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <span className="inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                      {application.license.status}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Submitted On</label>
                    <p className="text-gray-900 mt-1">
                      {new Date(application.application.submittedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <DocumentIcon className="w-6 h-6 mr-2 text-purple-600" />
                  Vendor Documents ({application.documents?.length || 0})
                </h2>

                {application.documents.length === 0 ? (
                  <div className="text-center py-12">
                    <DocumentIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No documents uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {application.documents.map((doc) => (
                      <div 
                        key={doc._id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900">
                                {doc.type.replace(/_/g, ' ')}
                              </h3>
                              {doc.verified === true ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircleIcon className="w-4 h-4 mr-1" />
                                  Verified
                                </span>
                              ) : doc.verified === false ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <XMarkIcon className="w-4 h-4 mr-1" />
                                  Rejected
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Pending Review
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              {doc.fileName}
                            </p>
                            <p className="text-xs text-gray-500">
                              Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                            {doc.verificationNotes && (
                              <p className="text-sm text-red-600 mt-2 italic">
                                Note: {doc.verificationNotes}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-2 ml-4">
                            <button
                              onClick={() => window.open(`/station-manager/vendor-documents/${doc._id}`, '_blank')}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                              <EyeIcon className="w-4 h-4" />
                              View
                            </button>
                            
                            {doc.verified !== true && (
                              <button
                                onClick={() => handleDocumentVerify(doc._id, true)}
                                disabled={processingDoc === doc._id}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                              >
                                <CheckIcon className="w-4 h-4" />
                                {processingDoc === doc._id ? 'Processing...' : 'Verify'}
                              </button>
                            )}
                            
                            {doc.verified !== false && (
                              <button
                                onClick={() => handleDocumentVerify(doc._id, false)}
                                disabled={processingDoc === doc._id}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                              >
                                <XMarkIcon className="w-4 h-4" />
                                {processingDoc === doc._id ? 'Processing...' : 'Reject'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Actions */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Application Actions
                </h2>

                {/* Document Verification Status */}
                <div className="mb-6 p-4 rounded-lg bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Document Verification Status
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Documents:</span>
                      <span className="font-semibold text-gray-900">
                        {application.documents.length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Verified:</span>
                      <span className="font-semibold text-green-600">
                        {application.documents.filter(d => d.verified === true).length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pending:</span>
                      <span className="font-semibold text-yellow-600">
                        {application.documents.filter(d => d.verified === undefined || d.verified === null).length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Rejected:</span>
                      <span className="font-semibold text-red-600">
                        {application.documents.filter(d => d.verified === false).length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Warning Messages */}
                {hasRejectedDocuments && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      ⚠️ Some documents have been rejected. The application will be automatically rejected.
                    </p>
                  </div>
                )}

                {!allDocumentsVerified && !hasRejectedDocuments && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Please verify all documents before approving the application.
                    </p>
                  </div>
                )}

                {allDocumentsVerified && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✅ All documents verified! You can approve this application.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Expiry months and security deposit inputs */}
                  <div className="p-3 bg-white border rounded-lg">
                    <label className="text-sm font-medium text-gray-700">License Validity (months)</label>
                    <input
                      type="number"
                      min={1}
                      value={expiryMonths}
                      onChange={(e) => setExpiryMonths(Number(e.target.value))}
                      className="mt-2 w-full px-3 py-2 border rounded-lg"
                    />

                    <label className="text-sm font-medium text-gray-700 mt-3">Security Deposit (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={securityDepositInput}
                      onChange={(e) => setSecurityDepositInput(Number(e.target.value))}
                      className="mt-2 w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleApprove}
                      disabled={!allDocumentsVerified || processing || hasRejectedDocuments}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      {processing ? 'Processing...' : 'Approve Application'}
                    </button>

                    <button
                      onClick={handleReject}
                      disabled={processing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                      {processing ? 'Processing...' : 'Reject Application'}
                    </button>

                    <button
                      onClick={handleUpdate}
                      disabled={processing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {processing ? 'Processing...' : 'Save Expiry & Deposit'}
                    </button>
                  </div>

                  <button
                    onClick={() => router.push(`/station-manager/negotiation/${application.license._id}`)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Negotiate Rent
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
