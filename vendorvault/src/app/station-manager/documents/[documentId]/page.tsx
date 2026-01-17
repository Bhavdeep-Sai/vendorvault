"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeftIcon, ArrowDownTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface DocumentData {
  _id: string;
  type: string;
  fileName: string;
  verified: boolean;
  createdAt: string;
}

export default function DocumentPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.documentId as string;
  
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocumentInfo = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/info`);
        if (response.ok) {
          const data = await response.json();
          setDocumentData(data.document);
        }
      } catch (error) {
        console.error("Failed to fetch document info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentInfo();
  }, [documentId]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `/api/documents/${documentId}`;
    link.download = documentData?.fileName || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
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
                    {documentData?.type.replace(/_/g, ' ')}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {documentData?.fileName}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {documentData && (
                <>
                  {documentData.verified && (
                    <span className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                      Verified
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
          ) : (
            <iframe
              src={`/api/documents/${documentId}`}
              className="w-full h-[calc(100vh-200px)]"
              title="Document Preview"
            />
          )}
        </div>
      </div>
    </div>
  );
}
