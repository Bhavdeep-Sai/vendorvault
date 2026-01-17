"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ArrowLeftIcon, ArrowDownTrayIcon, XMarkIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

interface DocumentData {
  _id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  verified: boolean;
  verificationNotes?: string;
  createdAt: string;
  vendorInfo: {
    businessName: string;
    ownerName: string;
  };
}

export default function StationManagerVendorDocumentPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.documentId as string;
  
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocumentInfo = async () => {
      try {
        const response = await fetch(`/api/station-manager/vendor-documents/${documentId}/info`, {
          credentials: 'same-origin',
        });
        if (response.ok) {
          const data = await response.json();
          console.log('Document data:', data.document);
          setDocument(data.document);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to load document');
        }
      } catch (error) {
        console.error("Failed to fetch document info:", error);
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentInfo();
  }, [documentId]);

  const handleDownload = () => {
    const link = window.document.createElement('a');
    link.href = `/api/station-manager/vendor-documents/${documentId}`;
    link.download = document?.fileName || 'document';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  return (
    <ProtectedRoute allowedRoles={['STATION_MANAGER']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
                </button>
                
                {loading ? (
                  <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">
                      {document?.type.replace(/_/g, ' ')}
                    </h1>
                    <p className="text-sm text-gray-500">
                      {document?.fileName} • {document?.vendorInfo?.businessName}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {document && (
                  <>
                    {document.verified === true && (
                      <span className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full flex items-center gap-1">
                        <CheckCircleIcon className="w-4 h-4" />
                        Verified
                      </span>
                    )}
                    {document.verified === false && (
                      <span className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                        Rejected
                      </span>
                    )}
                    
                    <button
                      onClick={handleDownload}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Notes */}
        {document?.verificationNotes && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-800">Verification Notes:</p>
              <p className="text-sm text-yellow-700 mt-1">{document.verificationNotes}</p>
            </div>
          </div>
        )}

        {/* Document Viewer */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-600">Loading document...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="text-center">
                  <p className="text-red-600 font-medium">{error}</p>
                  <button
                    onClick={() => router.back()}
                    className="mt-4 text-blue-600 hover:text-blue-800"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            ) : document?.fileUrl ? (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(document.fileUrl)}&embedded=true`}
                className="w-full h-[calc(100vh-200px)]"
                title="Document Preview"
                onLoad={() => console.log('Iframe loaded')}
                onError={() => console.error('Iframe error')}
              />
            ) : (
              <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <p className="text-gray-600">No document URL available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
