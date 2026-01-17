'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { VendorLayout, Alert } from '@/components/vendor';
import { 
  ChatBubbleLeftRightIcon,
  CurrencyRupeeIcon,
  CheckCircleIcon,
  BuildingStorefrontIcon,
  PaperAirplaneIcon,
  UserIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/helpers';
import Link from 'next/link';

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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (applicationId) {
      fetchNegotiation();
      
      // Poll for updates every 5 seconds
      const interval = setInterval(() => {
        fetchNegotiation();
      }, 5000);
      
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  useEffect(() => {
    scrollToBottom();
  }, [license?.negotiationMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchNegotiation = async () => {
    try {
      const res = await fetch(`/api/vendor/negotiation/${applicationId}`, {
        credentials: 'same-origin',
      });
      const data = await res.json();

      if (data.success) {
        setLicense(data.license);
        setVendor(data.vendor);
        // Only set initial rent once, don't override user input on polling
        if (data.license.proposedRent && !initialRentSet.current) {
          setProposedRent(data.license.proposedRent.toString());
          initialRentSet.current = true;
        }
      } else {
        toast.error(data.error || 'Failed to load negotiation');
        router.push('/vendor/dashboard');
      }
    } catch (error) {
      toast.error('Failed to load negotiation');
      router.push('/vendor/dashboard');
    } finally {
      setLoading(false);
    }
  };

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
        // Don't clear proposedRent to keep it visible
        await fetchNegotiation();
      } else {
        toast.error(data.error || 'Failed to send message');
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorLayout title="Negotiation">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </VendorLayout>
      </ProtectedRoute>
    );
  }

  if (!license || !vendor) {
    return (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorLayout title="Negotiation">
          <Alert
            type="error"
            title="Negotiation Not Found"
            message="The requested negotiation could not be found."
            actions={
              <Link
                href="/vendor/applications"
                className="text-sm font-medium text-red-800 underline hover:text-red-900"
              >
                Back to Applications
              </Link>
            }
          />
        </VendorLayout>
      </ProtectedRoute>
    );
  }

  const isAgreed = license.negotiationStatus === 'AGREED';
  const isApproved = license.status === 'APPROVED';

  return (
    <ProtectedRoute allowedRoles={['VENDOR']}>
      <VendorLayout
        title="Negotiation Chat"
        subtitle={`Shop ${license.shopId} • ${vendor?.stationName}`}
        actions={
          <Link
            href="/vendor/applications"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Applications
          </Link>
        }
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Application Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BuildingStorefrontIcon className="w-5 h-5 text-blue-600 mr-2" />
              Application Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Shop ID</p>
                <p className="font-semibold text-gray-900">{license.shopId}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Station</p>
                <p className="font-semibold text-gray-900">{vendor?.stationName}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Platform</p>
                <p className="font-semibold text-gray-900">Platform {vendor?.platformNumber}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Shop Width</p>
                <p className="font-semibold text-gray-900">{license.shopWidth || 'N/A'} units</p>
              </div>
            </div>
          </div>

          {/* Status Alerts */}
          {isAgreed && !isApproved && (
            <Alert
              type="success"
              title="Agreement Reached!"
              message={`Agreed rent: ₹${license.agreedRent}/month. Waiting for station manager approval.`}
            />
          )}

          {isApproved && (
            <Alert
              type="success"
              title="Application Approved!"
              message="Your license has been approved. Check your dashboard for details."
              actions={
                <Link
                  href="/vendor/dashboard"
                  className="text-sm font-medium text-green-800 underline hover:text-green-900"
                >
                  View Dashboard
                </Link>
              }
            />
          )}

          {/* Negotiation Chat */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600 mr-2" />
                Negotiation Chat
                {!isAgreed && !isApproved && (
                  <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Discuss terms with the station manager
              </p>
            </div>
            
            {/* Messages Container */}
            <div className="h-96 overflow-y-auto p-6 bg-gray-50">
              {(!license.negotiationMessages || license.negotiationMessages.length === 0) ? (
                <div className="text-center py-12">
                  <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No messages yet</p>
                  <p className="text-gray-400 text-sm">Start the conversation by sending a message below</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {license.negotiationMessages.map((msg, idx) => {
                    const isVendor = msg.senderRole === 'VENDOR';
                    return (
                      <div
                        key={idx}
                        className={`flex ${isVendor ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-md rounded-lg p-4 ${
                          isVendor 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <UserIcon className={`w-4 h-4 ${isVendor ? 'text-blue-200' : 'text-gray-500'}`} />
                            <p className={`text-sm font-medium ${
                              isVendor ? 'text-blue-100' : 'text-gray-700'
                            }`}>
                              {msg.senderName}
                            </p>
                            <span className={`text-xs ${
                              isVendor ? 'text-blue-200' : 'text-gray-500'
                            }`}>
                              {formatDate(msg.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">{msg.message}</p>
                          {msg.proposedRent && (
                            <div className={`mt-3 pt-3 border-t ${
                              isVendor ? 'border-blue-500' : 'border-gray-200'
                            }`}>
                              <div className="flex items-center gap-2">
                                <CurrencyRupeeIcon className={`w-4 h-4 ${
                                  isVendor ? 'text-blue-200' : 'text-gray-500'
                                }`} />
                                <span className={`text-xs ${
                                  isVendor ? 'text-blue-200' : 'text-gray-600'
                                }`}>
                                  Proposed Rent:
                                </span>
                              </div>
                              <p className="text-lg font-bold mt-1">₹{msg.proposedRent}/month</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {!isAgreed && !isApproved && (
              <div className="border-t border-gray-200 p-6 bg-white">
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <CurrencyRupeeIcon className="w-4 h-4 inline mr-1" />
                      Proposed Monthly Rent
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                      <input
                        type="number"
                        value={proposedRent}
                        onChange={(e) => setProposedRent(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter proposed rent"
                        min="0"
                        step="1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Type your message..."
                      rows={3}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Disabled State */}
            {(isAgreed || isApproved) && (
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <div className="text-center">
                  <CheckCircleIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-gray-900">
                    {isApproved ? 'Application Approved' : 'Negotiation Complete'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {isApproved 
                      ? 'Your application has been approved and processed.' 
                      : 'Agreement reached. Waiting for final approval.'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </VendorLayout>
    </ProtectedRoute>
  );
}
