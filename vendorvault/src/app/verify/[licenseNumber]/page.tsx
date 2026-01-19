'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatDate } from '@/lib/utils';

interface Document {
  _id: string;
  type: string;
  fileUrl: string;
  fileName?: string;
}

interface LicenseData {
  license: {
    licenseNumber: string;
    status: string;
    issuedAt?: string;
    expiresAt?: string;
    qrCodeUrl?: string;
    qrCodeData?: string;
    shopName?: string;
    shopId?: string;
    stationName?: string;
    platformName?: string;
    licenseType?: string;
    monthlyRent?: number;
    securityDeposit?: number;
    validityPeriod?: number;
    renewalEligible?: boolean;
    emergencyContact?: string;
    approvedAt?: string;
  };
  vendor: {
    businessName: string;
    businessType: string;
    ownerName: string;
    phone?: string;
    email?: string;
    stationName: string;
    platformNumber?: string;
  } | null;
  verification?: {
    documentsVerified: boolean;
    verifiedAt?: string;
    verifiedBy?: string;
  };
}

export default function VerifyPage() {
  const params = useParams();
  const licenseNumber = params.licenseNumber as string;
  const [data, setData] = useState<LicenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLicense();
  }, [licenseNumber]);

  const fetchLicense = async () => {
    try {
      const res = await fetch(`/api/verify/${licenseNumber}`);
      if (res.ok) {
        const licenseData = await res.json();
        setData(licenseData);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'License not found');
      }
    } catch (error) {
      setError('Failed to verify license');
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'ACTIVE':
      case 'LICENSED':
        return { text: 'Valid', color: 'text-green-600', bg: 'bg-green-100', icon: '✅' };
      case 'EXPIRED':
        return { text: 'Expired', color: 'text-red-600', bg: 'bg-red-100', icon: '❌' };
      case 'REVOKED':
      case 'SUSPENDED':
        return { text: 'Revoked', color: 'text-red-600', bg: 'bg-red-100', icon: '🚫' };
      case 'PENDING':
        return { text: 'Pending', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: '⏳' };
      case 'REJECTED':
        return { text: 'Rejected', color: 'text-red-600', bg: 'bg-red-100', icon: '❌' };
      default:
        return { text: status, color: 'text-gray-600', bg: 'bg-gray-100', icon: '❓' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Verifying license...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">License Not Found</h1>
          <p className="text-gray-600">{error || 'The license you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(data.license.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">License Verification</h1>
            <p className="text-gray-600">Verify Railway Vendor License</p>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <div className={`inline-block px-6 py-3 rounded-lg ${statusDisplay.bg} mb-2`}>
                <span className="text-2xl mr-2">{statusDisplay.icon}</span>
                <span className={`text-xl font-bold ${statusDisplay.color}`}>
                  {statusDisplay.text}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">License Status</p>
            </div>

            <div className="border-t border-b border-gray-200 py-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600">License Number</p>
                <p className="text-lg font-semibold text-gray-900">{data.license.licenseNumber}</p>
              </div>

              {data.vendor && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Business Name</p>
                      <p className="text-lg font-semibold text-gray-900">{data.vendor.businessName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Business Type</p>
                      <p className="text-lg font-semibold text-gray-900">{data.vendor.businessType}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Owner Name</p>
                      <p className="text-lg font-semibold text-gray-900">{data.vendor.ownerName}</p>
                    </div>
                    {data.vendor.phone && (
                      <div>
                        <p className="text-sm text-gray-600">Contact Number</p>
                        <p className="text-lg font-semibold text-gray-900">{data.vendor.phone}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Shop Name</p>
                      <p className="text-lg font-semibold text-gray-900">{data.license.shopName || 'N/A'}</p>
                    </div>
                    {data.license.shopId && data.license.shopId !== 'N/A' && (
                      <div>
                        <p className="text-sm text-gray-600">Shop ID</p>
                        <p className="text-base text-gray-700">{data.license.shopId}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Station</p>
                      <p className="text-lg font-semibold text-gray-900">{data.license.stationName || data.vendor.stationName}</p>
                    </div>
                    {data.license.platformName && data.license.platformName !== 'N/A' && (
                      <div>
                        <p className="text-sm text-gray-600">Platform</p>
                        <p className="text-lg font-semibold text-gray-900">{data.license.platformName}</p>
                      </div>
                    )}
                  </div>

                  {/* Financial Information */}
                  {(data.license.monthlyRent || data.license.securityDeposit) && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-900 mb-3">Financial Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.license.monthlyRent && (
                          <div>
                            <p className="text-sm text-blue-700">Monthly Rent</p>
                            <p className="text-lg font-semibold text-blue-900">₹{data.license.monthlyRent.toLocaleString()}</p>
                          </div>
                        )}
                        {data.license.securityDeposit && (
                          <div>
                            <p className="text-sm text-blue-700">Security Deposit</p>
                            <p className="text-lg font-semibold text-blue-900">₹{data.license.securityDeposit.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* License Details */}
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h4 className="text-sm font-semibold text-green-900 mb-3">License Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {data.license.licenseType && (
                        <div>
                          <p className="text-sm text-green-700">License Type</p>
                          <p className="text-base font-semibold text-green-900">{data.license.licenseType}</p>
                        </div>
                      )}
                      {data.license.validityPeriod && (
                        <div>
                          <p className="text-sm text-green-700">Validity Period</p>
                          <p className="text-base font-semibold text-green-900">{data.license.validityPeriod} months</p>
                        </div>
                      )}
                      {data.license.renewalEligible !== undefined && (
                        <div>
                          <p className="text-sm text-green-700">Renewal Eligible</p>
                          <p className="text-base font-semibold text-green-900">{data.license.renewalEligible ? 'Yes' : 'No'}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verification Status */}
                  {data.verification && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Verification Status</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-700">Documents Status</p>
                          <p className="text-base font-semibold text-green-600">✓ Verified</p>
                        </div>
                        {data.verification.verifiedAt && (
                          <div>
                            <p className="text-sm text-gray-700">Verified On</p>
                            <p className="text-base font-semibold text-gray-900">{formatDate(data.verification.verifiedAt)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {data.license.issuedAt && (
                <div>
                  <p className="text-sm text-gray-600">Issued On</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(data.license.issuedAt)}</p>
                </div>
              )}

              {data.license.expiresAt && (
                <div>
                  <p className="text-sm text-gray-600">Expires On</p>
                  <p className="text-lg font-semibold text-gray-900 text-red-600">{formatDate(data.license.expiresAt)}</p>
                </div>
              )}
            </div>

            {/* QR Code Section */}
            {data.license.status === 'APPROVED' && data.license.qrCodeData && (
              <div className="border-t border-gray-200 py-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">QR Code</h3>
                <div className="flex justify-center">
                  <img 
                    src={data.license.qrCodeData} 
                    alt="License QR Code" 
                    className="w-48 h-48 border-2 border-gray-300 rounded-lg p-2 bg-white"
                  />
                </div>
                <p className="text-center text-sm text-gray-600 mt-3">
                  Scan this QR code to verify the license
                </p>
              </div>
            )}

            <div className="text-center pt-4">
              <p className="text-xs text-gray-500">
                This is a public verification page. No login required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

