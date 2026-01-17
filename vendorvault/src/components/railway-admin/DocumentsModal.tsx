import { useState } from 'react';
import { XMarkIcon, EyeIcon, DocumentIcon, ArrowDownTrayIcon } from '@/components/Icons';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  name: string;
  email: string;
  documents?: {
    aadhaarCard?: string;
    panCard?: string;
    railwayIdCard?: string;
    photograph?: string;
    educationalCertificate?: string;
    experienceLetter?: string;
  };
}

interface DocumentsModalProps {
  user: User;
  onClose: () => void;
  onRefresh: () => void;
}

export function DocumentsModal({ user, onClose, onRefresh }: DocumentsModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [viewingPdf, setViewingPdf] = useState<{ url: string; name: string } | null>(null);

  // Get proper filename for download
  const getDownloadFilename = (documentType: string) => {
    const labels: Record<string, string> = {
      aadhaarCard: 'Aadhaar_Card.pdf',
      panCard: 'PAN_Card.pdf',
      railwayIdCard: 'Railway_ID_Card.pdf',
      photograph: 'Photograph.jpg',
      educationalCertificate: 'Educational_Certificate.pdf',
      experienceLetter: 'Experience_Letter.pdf',
    };
    return labels[documentType] || `${documentType}.pdf`;
  };

  // Handle file download with proper filename
  const handleDownload = async (url: string, documentType: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = getDownloadFilename(documentType);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download file');
    }
  };

  // Handle viewing PDF in new tab
  const handleViewPdf = (url: string, documentType: string) => {
    const name = documentLabels[documentType] || documentType;
    setViewingPdf({ url, name });
  };

  const handleToggleDocument = (documentType: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentType) 
        ? prev.filter(d => d !== documentType)
        : [...prev, documentType]
    );
  };

  const handleRejectSelected = async () => {
    if (selectedDocuments.length === 0) {
      alert('Please select at least one document to reject');
      return;
    }

    const reason = prompt('Enter rejection reason for selected documents:');
    if (!reason) return;

    setLoading(true);
    try {
      const promises = selectedDocuments.map(documentType =>
        fetch('/api/railway-admin/users/document-reject', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user._id, documentType, reason }),
        })
      );

      const results = await Promise.all(promises);
      const allSuccessful = results.every(res => res.ok);

      if (allSuccessful) {
        toast.success(`${selectedDocuments.length} document(s) rejection sent to user`);
        setSelectedDocuments([]);
        onRefresh();
        onClose();
      } else {
        toast.error('Some documents failed to reject');
      }
    } catch (error) {
      toast.error('Failed to reject documents');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectDocument = async (documentType: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setLoading(true);
    try {
      const res = await fetch('/api/railway-admin/users/document-reject', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, documentType, reason }),
      });

      if (res.ok) {
        toast.success('Document rejection sent to user');
        onRefresh();
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to reject document');
      }
    } catch (error) {
      toast.error('Failed to reject document');
    } finally {
      setLoading(false);
    }
  };

  const documentLabels: Record<string, string> = {
    aadhaarCard: 'Aadhaar Card',
    panCard: 'PAN Card',
    railwayIdCard: 'Railway ID Card',
    photograph: 'Photograph',
    educationalCertificate: 'Educational Certificate',
    experienceLetter: 'Experience Letter',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">User Documents</h3>
              <p className="text-sm text-gray-600 mt-1">{user.name} - {user.email}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon size={24} />
            </button>
          </div>

          {user.documents && Object.keys(user.documents).filter(k => user.documents![k as keyof typeof user.documents]).length > 0 && (
            <div className="mb-4 flex items-center justify-between bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedDocuments.length === Object.keys(user.documents).filter(k => user.documents![k as keyof typeof user.documents]).length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDocuments(Object.keys(user.documents).filter(k => user.documents![k as keyof typeof user.documents]));
                    } else {
                      setSelectedDocuments([]);
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({selectedDocuments.length} selected)
                </span>
              </div>
              {selectedDocuments.length > 0 && (
                <button
                  onClick={handleRejectSelected}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                >
                  Reject Selected ({selectedDocuments.length})
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user.documents && Object.entries(user.documents).map(([key, url]) => {
              return url && (
                <div key={key} className="border border-gray-200 rounded-lg p-4 relative">
                  <div className="absolute top-3 left-3 z-10">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.includes(key)}
                      onChange={() => handleToggleDocument(key)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between mb-2 ml-8">
                    <h4 className="font-medium text-gray-900">
                      {documentLabels[key] || key}
                    </h4>
                  </div>
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
                    {key === 'photograph' ? (
                      <img src={url} alt={documentLabels[key]} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-4">
                        <DocumentIcon size={64} className="text-gray-400 mb-3" />
                        <p className="text-sm text-gray-600 font-medium mb-2">PDF Document</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewPdf(url, key)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium inline-flex items-center gap-2"
                          >
                            <EyeIcon size={16} />
                            View PDF
                          </button>
                          <button
                            onClick={() => handleDownload(url, key)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium inline-flex items-center gap-2"
                          >
                            <ArrowDownTrayIcon size={16} />
                            Download
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRejectDocument(key)}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium disabled:opacity-50"
                  >
                    Reject & Request Re-upload
                  </button>
                </div>
              );
            })}
          </div>

          {(!user.documents || Object.keys(user.documents).filter(k => user.documents![k]).length === 0) && (
            <div className="text-center py-12 text-gray-500">
              No documents uploaded
            </div>
          )}
        </div>

        {/* PDF Viewer Modal */}
        {viewingPdf && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">{viewingPdf.name}</h3>
                <button
                  onClick={() => setViewingPdf(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewingPdf.url)}&embedded=true`}
                  className="w-full h-full"
                  title={viewingPdf.name}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
