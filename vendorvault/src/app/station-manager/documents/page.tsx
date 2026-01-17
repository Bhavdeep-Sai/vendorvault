'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardNav } from '@/components/DashboardNav';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface DocumentStatus {
  aadhaarCard?: string;
  panCard?: string;
  railwayIdCard?: string;
  photograph?: string;
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [documents, setDocuments] = useState<DocumentStatus>({});
  const [loading, setLoading] = useState(true);
  const [rejectionReasons, setRejectionReasons] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchUserDocuments();
    fetchRejectionReasons();
  }, []);

  const fetchRejectionReasons = async () => {
    try {
      const res = await fetch('/api/notifications', {
        credentials: 'same-origin',
      });
      if (res.ok) {
        const data = await res.json();
        const reasons: { [key: string]: string } = {};
        
        // Extract rejection reasons from notifications
        data.notifications.forEach((notif: any) => {
          if (notif.type === 'DOCUMENT_REJECTED' && notif.metadata?.documentType && notif.metadata?.reason) {
            reasons[notif.metadata.documentType] = notif.metadata.reason;
          }
        });
        
        setRejectionReasons(reasons);
      }
    } catch (error) {
      console.error('Error fetching rejection reasons:', error);
    }
  };

  const fetchUserDocuments = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'same-origin',
      });
      if (res.ok) {
        const data = await res.json();
        console.log('User documents from API:', data.user.documents);
        setDocuments(data.user.documents || {});
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMissingDocuments = () => {
    const required = ['aadhaarCard', 'panCard', 'railwayIdCard', 'photograph'];
    const missing = required.filter(doc => !documents[doc as keyof DocumentStatus]);
    console.log('Current documents state:', documents);
    console.log('Missing documents:', missing);
    return missing;
  };

  const handleFileUpload = async (documentType: string, file: File) => {
    if (!file) return;

    // Validate file type based on document type
    if (documentType === 'photograph') {
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validImageTypes.includes(file.type)) {
        toast.error('Photograph must be JPG or PNG format');
        return;
      }
    } else {
      // For all other documents (Aadhaar, PAN, Railway ID)
      if (file.type !== 'application/pdf') {
        toast.error('Documents must be in PDF format only');
        return;
      }
    }

    // Validate file size (1MB max)
    if (file.size > 1 * 1024 * 1024) {
      toast.error('File size must not exceed 1MB');
      return;
    }

    setUploading({ ...uploading, [documentType]: true });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', documentType);
      formData.append('folder', `railway-vendors/registration/${documentType}`);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadRes.json();

      // Update user document
      const updateRes = await fetch('/api/station-manager/documents/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          url: uploadData.url,
        }),
      });

      if (!updateRes.ok) {
        throw new Error('Failed to update document');
      }

      toast.success('Document uploaded successfully');
      fetchUserDocuments();
    } catch (error) {
      toast.error('Failed to upload document');
      console.error(error);
    } finally {
      setUploading({ ...uploading, [documentType]: false });
    }
  };

  const documentFields = [
    { key: 'aadhaarCard', label: 'Aadhaar Card', required: true },
    { key: 'panCard', label: 'PAN Card', required: true },
    { key: 'railwayIdCard', label: 'Railway ID Card', required: true },
    { key: 'photograph', label: 'Photograph', required: true },
  ];

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['STATION_MANAGER']}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading documents...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['STATION_MANAGER']}>
      <div className="min-h-screen bg-gray-50">
        <DashboardNav title="Upload Documents" />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {getMissingDocuments().length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="mb-4">
                <svg className="mx-auto h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">All Documents Uploaded</h2>
              <p className="text-gray-600 mb-6">You have successfully uploaded all required documents.</p>
              <button
                onClick={() => router.push('/station-manager/dashboard')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[600px]">
                {/* Left Side - Warning & Reasons */}
                <div className="lg:col-span-1 bg-gradient-to-br from-red-50 to-orange-50 p-6 border-r border-red-200">
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className="mb-4 bg-red-100 rounded-full p-4">
                      <svg className="h-16 w-16 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-red-900 mb-2">Document Re-upload Required</h2>
                    <p className="text-sm text-red-700">
                      Railway Admin has requested you to re-upload some documents. Please review the reasons and upload correct documents.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-red-900 text-sm uppercase tracking-wide">Rejection Reasons:</h3>
                    {getMissingDocuments().map((docKey) => {
                      const docLabels: Record<string, string> = {
                        aadhaarCard: 'Aadhaar Card',
                        panCard: 'PAN Card',
                        railwayIdCard: 'Railway ID Card',
                        photograph: 'Photograph'
                      };
                      const reason = rejectionReasons[docKey] || 'Please re-upload this document';
                      
                      return (
                        <div key={docKey} className="bg-white rounded-lg p-4 border border-red-200 shadow-sm">
                          <h4 className="font-semibold text-gray-900 text-sm mb-2 flex items-center">
                            <span className="text-red-600 mr-2">•</span>
                            {docLabels[docKey]}
                          </h4>
                          <p className="text-xs text-gray-700 pl-4 italic">"{reason}"</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-800">
                      <strong>Note:</strong> PDF format for documents, JPG/PNG for photograph. Max 1MB.
                    </p>
                  </div>
                </div>

                {/* Right Side - Upload Forms */}
                <div className="lg:col-span-2 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Upload Required Documents</h3>
                  
                  <div className="space-y-4">
                    {documentFields
                      .filter(field => !documents[field.key as keyof DocumentStatus])
                      .map((field) => {
                        return (
                          <div 
                            key={field.key} 
                            className="border-2 border-red-300 bg-red-50 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="text-base font-bold text-gray-900 flex items-center">
                                  <span className="text-red-600 mr-2">⚠️</span>
                                  {field.label}
                                  <span className="text-red-600 ml-2 text-sm font-bold">* REQUIRED</span>
                                </h3>
                                <p className="text-xs text-red-700 font-semibold mt-1">Upload Required</p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <input
                                type="file"
                                accept={field.key === 'photograph' ? '.jpg,.jpeg,.png' : '.pdf'}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(field.key, file);
                                }}
                                className="flex-1 text-sm text-gray-600 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                                disabled={uploading[field.key]}
                              />
                              {uploading[field.key] && (
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  <div className="mt-6 flex justify-between items-center pt-4 border-t">
                    <button
                      onClick={() => router.push('/station-manager/dashboard')}
                      className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"
                    >
                      ← Back to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
