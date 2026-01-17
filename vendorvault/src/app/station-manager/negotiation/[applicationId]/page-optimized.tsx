'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/helpers';

interface NegotiationMessage {
  senderId: string;
  senderRole: 'VENDOR' | 'STATION_MANAGER';
  senderName: string;
  message: string;
  proposedRent?: number;
  timestamp: string;
}

interface License {
  _id: string;
  licenseNumber: string;
  status: string;
  proposedRent?: number;
  agreedRent?: number;
  monthlyRent?: number;
  negotiationStatus?: string;
  negotiationMessages?: NegotiationMessage[];
  shopId?: string;
  shopWidth?: number;
}

interface Vendor {
  _id: string;
  userId: string;
  businessName: string;
  stallType: string;
  stationName: string;
  stationCode: string;
  platformNumber: string;
}

export default function StationManagerNegotiationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const applicationId = params.applicationId as string;

  const [license, setLicense] = useState<License | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [approving, setApproving] = useState(false);

  const [message, setMessage] = useState('');
  const [proposedRent, setProposedRent] = useState('');
  const initialRentSet = useRef(false);
  const lastMessageCount = useRef(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchNegotiation = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch(`/api/station-manager/negotiation/${applicationId}`, {
        credentials: 'same-origin',
      });
      const data = await res.json();

      if (data.success) {
        const newMessageCount = data.license.negotiationMessages?.length || 0;
        
        // Only update state if data has changed
        if (isInitial || newMessageCount !== lastMessageCount.current) {
          setLicense(data.license);
          setVendor(data.vendor);
          lastMessageCount.current = newMessageCount;
          
          // Only set initial rent once
          if (data.license.proposedRent && !initialRentSet.current) {
            setProposedRent(data.license.proposedRent.toString());
            initialRentSet.current = true;
          }
        }
      } else {
        toast.error(data.error || 'Failed to load negotiation');
        router.push('/station-manager/dashboard');
      }
    } catch (error) {
      console.error('Fetch negotiation error:', error);
      if (isInitial) {
        toast.error('Failed to load negotiation');
        router.push('/station-manager/dashboard');
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, [applicationId, router]);

  useEffect(() => {
    if (applicationId) {
      fetchNegotiation(true);
      
      // Longer polling interval (10 seconds) to reduce server load
      pollInterval.current = setInterval(() => {
        fetchNegotiation(false);
      }, 10000);
      
      return () => {
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
        }
      };
    }
  }, [applicationId, fetchNegotiation]);

  useEffect(() => {
    scrollToBottom();
  }, [license?.negotiationMessages, scrollToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() && !proposedRent) {
      toast.error('Please enter a message or proposed rent');
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/station-manager/negotiation/${applicationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          message: message.trim(),
          proposedRent: proposedRent ? parseFloat(proposedRent) : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Message sent');
        setMessage('');
        await fetchNegotiation(false);
      } else {
        toast.error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleAgreeAndApprove = async () => {
    if (!proposedRent || parseFloat(proposedRent) <= 0) {
      toast.error('Please enter a valid agreed rent amount');
      return;
    }

    if (!confirm(`Agree to rent of ₹${proposedRent}/month and approve this application?`)) {
      return;
    }

    setApproving(true);
    try {
      // First, mark as agreed
      const agreeRes = await fetch(`/api/station-manager/negotiation/${applicationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'AGREE',
          proposedRent: parseFloat(proposedRent),
          message: `Agreement reached. Monthly rent set at ₹${proposedRent}.`,
        }),
      });

      if (!agreeRes.ok) {
        throw new Error('Failed to mark agreement');
      }

      // Then approve the license
      const approveRes = await fetch('/api/station-manager/approve-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          licenseId: applicationId,
          action: 'APPROVED',
        }),
      });

      if (approveRes.ok) {
        toast.success('Application approved successfully!');
        router.push('/station-manager/dashboard');
      } else {
        const data = await approveRes.json();
        toast.error(data.error || 'Failed to approve');
      }
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Failed to approve application');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setApproving(true);
    try {
      const res = await fetch('/api/station-manager/approve-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          licenseId: applicationId,
          action: 'REJECTED',
          rejectionReason: reason,
        }),
      });

      if (res.ok) {
        toast.success('Application rejected');
        router.push('/station-manager/dashboard');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to reject');
      }
    } catch (error) {
      toast.error('Failed to reject application');
    } finally {
      setApproving(false);
    }
  };

  // Memoize expensive computations
  const isAgreed = useMemo(() => license?.negotiationStatus === 'AGREED', [license?.negotiationStatus]);
  const isApproved = useMemo(() => license?.status === 'APPROVED', [license?.status]);

  // Memoize message rendering
  const renderedMessages = useMemo(() => {
    if (!license?.negotiationMessages || license.negotiationMessages.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">No messages yet</p>
        </div>
      );
    }

    return license.negotiationMessages.map((msg, idx) => {
      const isManager = msg.senderRole === 'STATION_MANAGER';
      return (
        <div
          key={idx}
          className={`flex ${isManager ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`max-w-md ${isManager ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-lg p-4`}>
            <div className="flex items-center mb-1">
              <p className={`text-sm font-semibold ${isManager ? 'text-green-100' : 'text-gray-700'}`}>
                {msg.senderName}
              </p>
              <span className={`text-xs ml-2 ${isManager ? 'text-green-200' : 'text-gray-500'}`}>
                {formatDate(msg.timestamp)}
              </span>
            </div>
            <p className="text-sm">{msg.message}</p>
            {msg.proposedRent && (
              <div className={`mt-2 pt-2 border-t ${isManager ? 'border-green-400' : 'border-gray-300'}`}>
                <p className={`text-xs ${isManager ? 'text-green-200' : 'text-gray-600'}`}>
                  Proposed Rent:
                </p>
                <p className="text-lg font-bold">₹{msg.proposedRent}/month</p>
              </div>
            )}
          </div>
        </div>
      );
    });
  }, [license?.negotiationMessages]);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['STATION_MANAGER']}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-600">Loading negotiation...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (!license || !vendor) {
    return null;
  }

  return (
    <ProtectedRoute allowedRoles={['STATION_MANAGER']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Vendor Negotiation</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Application ID: <span className="font-mono">{license.licenseNumber}</span>
                </p>
              </div>
              <button
                onClick={() => router.push('/station-manager/dashboard')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Vendor Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Vendor Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Business Name</p>
                <p className="font-medium text-gray-900">{vendor.businessName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Stall Type</p>
                <p className="font-medium text-gray-900">{vendor.stallType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Platform</p>
                <p className="font-medium text-gray-900">Platform {vendor.platformNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Shop Width</p>
                <p className="font-medium text-gray-900">{license.shopWidth || 'N/A'} units</p>
              </div>
            </div>
          </div>

          {/* Status Banner */}
          {isAgreed && !isApproved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-900 font-semibold">
                Agreement reached at ₹{license.agreedRent}/month. Ready to approve.
              </p>
            </div>
          )}

          {/* Messages */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Negotiation Chat</h2>
            </div>
            
            <div className="h-96 overflow-y-auto p-4 space-y-4">
              {renderedMessages}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {!isApproved && (
              <div className="p-4 border-t border-gray-200">
                <form onSubmit={handleSendMessage} className="mb-4">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Counter Offer / Agreed Rent (₹/month)
                    </label>
                    <input
                      type="number"
                      value={proposedRent}
                      onChange={(e) => setProposedRent(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter rent amount"
                      min="0"
                      step="1"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Type your message..."
                      rows={3}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? 'Sending...' : 'Send Message'}
                  </button>
                </form>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleAgreeAndApprove}
                    disabled={approving || !proposedRent}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {approving ? 'Processing...' : `Agree & Approve (₹${proposedRent || '—'}/mo)`}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={approving}
                    className="px-6 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
