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
  businessName: string;
  stationName: string;
  stationCode: string;
  platformNumber: string;
}

export default function VendorNegotiationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const applicationId = params.applicationId as string;

  const [license, setLicense] = useState<License | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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
      const res = await fetch(`/api/vendor/negotiation/${applicationId}`, {
        credentials: 'same-origin',
      });
      const data = await res.json();

      if (data.success) {
        const newMessageCount = data.license.negotiationMessages?.length || 0;
        
        // Only update state if data has changed to prevent unnecessary re-renders
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
        router.push('/vendor/dashboard');
      }
    } catch (error) {
      console.error('Fetch negotiation error:', error);
      if (isInitial) {
        toast.error('Failed to load negotiation');
        router.push('/vendor/dashboard');
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
      
      // Longer polling interval (10 seconds instead of 5) to reduce server load
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
      const res = await fetch(`/api/vendor/negotiation/${applicationId}`, {
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
        // Immediately fetch to show new message
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

  // Memoize expensive computations
  const isAgreed = useMemo(() => license?.negotiationStatus === 'AGREED', [license?.negotiationStatus]);
  const isApproved = useMemo(() => license?.status === 'APPROVED', [license?.status]);

  // Memoize message rendering
  const renderedMessages = useMemo(() => {
    if (!license?.negotiationMessages || license.negotiationMessages.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">No messages yet. Start the conversation!</p>
        </div>
      );
    }

    return license.negotiationMessages.map((msg, idx) => {
      const isVendor = msg.senderRole === 'VENDOR';
      return (
        <div
          key={idx}
          className={`flex ${isVendor ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`max-w-md ${isVendor ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-lg p-4`}>
            <div className="flex items-center mb-1">
              <p className={`text-sm font-semibold ${isVendor ? 'text-indigo-100' : 'text-gray-700'}`}>
                {msg.senderName}
              </p>
              <span className={`text-xs ml-2 ${isVendor ? 'text-indigo-200' : 'text-gray-500'}`}>
                {formatDate(msg.timestamp)}
              </span>
            </div>
            <p className="text-sm">{msg.message}</p>
            {msg.proposedRent && (
              <div className={`mt-2 pt-2 border-t ${isVendor ? 'border-indigo-400' : 'border-gray-300'}`}>
                <p className={`text-xs ${isVendor ? 'text-indigo-200' : 'text-gray-600'}`}>
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
      <ProtectedRoute allowedRoles={['VENDOR']}>
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
    <ProtectedRoute allowedRoles={['VENDOR']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Price Negotiation</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Application ID: <span className="font-mono">{license.licenseNumber}</span>
                </p>
              </div>
              <button
                onClick={() => router.push('/vendor/dashboard')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Application Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Business Name</p>
                <p className="font-medium text-gray-900">{vendor.businessName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Station</p>
                <p className="font-medium text-gray-900">{vendor.stationName}</p>
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
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-green-900">Agreement Reached!</p>
                  <p className="text-sm text-green-700">
                    Agreed rent: ₹{license.agreedRent}/month. Waiting for station manager approval.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isApproved && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-blue-900">Application Approved!</p>
                  <p className="text-sm text-blue-700">
                    Your license has been approved. Check your dashboard for details.
                  </p>
                </div>
              </div>
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
            {!isAgreed && !isApproved && (
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proposed Monthly Rent (₹)
                  </label>
                  <input
                    type="number"
                    value={proposedRent}
                    onChange={(e) => setProposedRent(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter proposed rent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Type your message..."
                    rows={3}
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
