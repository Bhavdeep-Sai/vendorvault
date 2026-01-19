'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { VendorLayout, Alert, StatusBadge } from '@/components/vendor';
import { 
  DocumentTextIcon,
  CloudArrowUpIcon,
  EyeIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  IdentificationIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Document {
  _id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  verified: boolean;
  verificationNotes?: string;
}

interface DocumentCategory {
  type: string;
  label: string;
  description: string;
  icon: React.ElementType;
  required: boolean;
  allowMultiple: boolean;
  acceptedFormats: string[];
  maxSize: string;
}

const documentCategories: DocumentCategory[] = [
  {
    type: 'AADHAAR',
    label: 'Aadhaar Card',
    description: 'Government-issued identity proof',
    icon: IdentificationIcon,
    required: true,
    allowMultiple: false,
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSize: '2MB',
  },
  {
    type: 'PAN',
    label: 'PAN Card',
    description: 'Permanent Account Number card',
    icon: IdentificationIcon,
    required: true,
    allowMultiple: false,
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSize: '2MB',
  },
  {
    type: 'BANK_STATEMENT',
    label: 'Bank Statement',
    description: 'Recent bank statement (last 3 months)',
    icon: DocumentTextIcon,
    required: true,
    allowMultiple: false,
    acceptedFormats: ['PDF'],
    maxSize: '5MB',
  },
  {
    type: 'FSSAI',
    label: 'FSSAI License',
    description: 'Food Safety License (required for food businesses)',
    icon: DocumentTextIcon,
    required: false, // Only required for food vendors
    allowMultiple: false,
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSize: '2MB',
  },
  {
    type: 'POLICE_VERIFICATION',
    label: 'Police Verification',
    description: 'Character certificate from local police',
    icon: DocumentTextIcon,
    required: true,
    allowMultiple: false,
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSize: '3MB',
  },
  {
    type: 'RAILWAY_DECLARATION',
    label: 'Railway Declaration',
    description: 'Signed declaration form',
    icon: DocumentTextIcon,
    required: true,
    allowMultiple: false,
    acceptedFormats: ['PDF'],
    maxSize: '2MB',
  },
  {
    type: 'BUSINESS_PHOTO',
    label: 'Business Photos',
    description: 'Photos of your existing business or setup',
    icon: PhotoIcon,
    required: false,
    allowMultiple: true,
    acceptedFormats: ['JPG', 'PNG'],
    maxSize: '3MB each',
  },
];

export default function VendorDocumentsPage() {
  const { vendor } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/vendor/documents', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (documentType: string) => {
    const fileInput = fileInputRefs.current[documentType];
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleFileUpload = async (documentType: string, file: File) => {
    const category = documentCategories.find(cat => cat.type === documentType);
    if (!category) return;

    // Validate file size
    const maxSizeBytes = category.maxSize === '2MB' ? 2 * 1024 * 1024 : 
                        category.maxSize === '3MB' ? 3 * 1024 * 1024 : 
                        category.maxSize === '5MB' ? 5 * 1024 * 1024 : 
                        2 * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      toast.error(`File size should not exceed ${category.maxSize}`);
      return;
    }

    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toUpperCase();
    if (!fileExtension || !category.acceptedFormats.includes(fileExtension)) {
      toast.error(`Please upload a file in one of these formats: ${category.acceptedFormats.join(', ')}`);
      return;
    }

    setUploading(documentType);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    try {
      const res = await fetch('/api/vendor/documents', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      });

      if (res.ok) {
        toast.success('Document uploaded successfully');
        fetchDocuments();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    // Check if document is verified
    const doc = documents.find(d => d._id === documentId);
    if (doc?.verified === true) {
      toast.error('Cannot delete verified documents. Contact station manager if changes needed.');
      return;
    }

    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const res = await fetch(`/api/vendor/documents/${documentId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (res.ok) {
        toast.success('Document deleted successfully');
        fetchDocuments();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    }
  };

  const getDocumentByType = (type: string) => {
    return documents.filter(doc => doc.type === type);
  };

  const isDocumentRequired = (category: DocumentCategory) => {
    if (category.type === 'FSSAI') {
      // FSSAI is only required for food vendors
      return vendor?.stallType === 'tea' || vendor?.stallType === 'snacks';
    }
    return category.required;
  };

  const getCompletionStatus = () => {
    const requiredCategories = documentCategories.filter(cat => isDocumentRequired(cat));
    const completedCategories = requiredCategories.filter(cat => {
      const docs = getDocumentByType(cat.type);
      return docs.length > 0;
    });
    
    return {
      completed: completedCategories.length,
      total: requiredCategories.length,
      percentage: Math.round((completedCategories.length / requiredCategories.length) * 100)
    };
  };

  const completionStatus = getCompletionStatus();

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorLayout title="Documents">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </VendorLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['VENDOR']}>
      <VendorLayout
        title="Documents"
        subtitle="Upload and manage your verification documents"
      >
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Progress Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Document Verification Progress</h2>
              <span className="text-sm font-medium text-gray-600">
                {completionStatus.completed} of {completionStatus.total} completed
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                style={{ width: `${completionStatus.percentage}%` }}
              ></div>
            </div>
            
            {completionStatus.percentage === 100 ? (
              <Alert
                type="success"
                title="All Required Documents Uploaded!"
                message="You can now apply for shop licenses. Documents are under verification."
              />
            ) : (
              <Alert
                type="info"
                title={`${completionStatus.total - completionStatus.completed} documents pending`}
                message="Complete document upload to apply for shop licenses."
              />
            )}
          </div>

          {/* Document Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {documentCategories.map((category) => {
              const existingDocs = getDocumentByType(category.type);
              const isRequired = isDocumentRequired(category);
              const Icon = category.icon;

              return (
                <div key={category.type} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start">
                        <div className={`p-2 rounded-lg ${
                          existingDocs.length > 0 ? 'bg-green-50' : isRequired ? 'bg-blue-50' : 'bg-gray-50'
                        }`}>
                          <Icon className={`w-6 h-6 ${
                            existingDocs.length > 0 ? 'text-green-600' : isRequired ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-lg font-medium text-gray-900 flex items-center">
                            {category.label}
                            {isRequired && (
                              <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                Required
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                        </div>
                      </div>
                    </div>

                    {/* File Requirements */}
                    <div className="mb-4 text-xs text-gray-500">
                      <p>Formats: {category.acceptedFormats.join(', ')} • Max size: {category.maxSize}</p>
                    </div>

                    {/* Existing Documents */}
                    {existingDocs.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {existingDocs.map((doc) => (
                          <div key={doc._id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center">
                              <CheckCircleIcon className="w-4 h-4 text-green-600 mr-2" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                                <div className="flex items-center gap-2">
                                  <StatusBadge 
                                    status={doc.verified === true ? 'verified' : (doc.verified === false ? 'rejected' : 'pending')} 
                                    size="sm" 
                                  />
                                  <span className="text-xs text-gray-500">
                                    {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </span>
                                  {doc.verified === true && (
                                    <span className="text-xs text-green-600 font-medium">
                                      🔒 Locked
                                    </span>
                                  )}
                                </div>
                                {doc.verificationNotes && (
                                  <p className="text-xs text-red-600 mt-1 italic">
                                    Rejection reason: {doc.verificationNotes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => window.open(`/vendor/documents/${doc._id}`, '_blank')}
                                className="text-blue-600 hover:text-blue-800"
                                title="View document"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                              {doc.verified !== true && (
                                <button
                                  onClick={() => handleDeleteDocument(doc._id)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete document"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              )}
                              {doc.verified && (
                                <span className="text-xs text-gray-400 px-2" title="Verified documents cannot be deleted">
                                  Verified
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload Button */}
                    <div>
                      <input
                        ref={(el) => fileInputRefs.current[category.type] = el}
                        type="file"
                        accept={category.acceptedFormats.map(format => `.${format.toLowerCase()}`).join(',')}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(category.type, file);
                          }
                        }}
                        className="hidden"
                        multiple={category.allowMultiple}
                      />
                      
                      {existingDocs.some(doc => doc.verified) ? (
                        <div className="w-full px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-center">
                          <p className="text-sm text-green-700 font-medium">
                            ✓ Document verified and locked
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            Contact station manager for any changes
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleFileSelect(category.type)}
                          disabled={uploading === category.type}
                          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                            existingDocs.length > 0 && !category.allowMultiple
                              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {uploading === category.type ? (
                            <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <CloudArrowUpIcon className="w-4 h-4" />
                            {existingDocs.length > 0 && !category.allowMultiple
                              ? 'Replace Document'
                              : category.allowMultiple && existingDocs.length > 0
                              ? 'Add More'
                              : 'Upload Document'
                            }
                          </>
                        )}
                      </button>
                      )}
                    </div>

                    {/* Verification Notes */}
                    {existingDocs.some(doc => doc.verificationNotes) && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start">
                          <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 mt-0.5 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">Verification Notes:</p>
                            {existingDocs.map(doc => 
                              doc.verificationNotes && (
                                <p key={doc._id} className="text-sm text-yellow-700 mt-1">
                                  {doc.verificationNotes}
                                </p>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Help Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              Document Upload Guidelines
            </h3>
            <ul className="text-blue-800 space-y-2 text-sm">
              <li>• Ensure all documents are clear and legible</li>
              <li>• Upload high-quality scans or photos</li>
              <li>• Documents should be valid and not expired</li>
              <li>• For FSSAI license, it's only required if you're planning to sell food items</li>
              <li>• All documents will be verified by our team within 2-3 business days</li>
              <li>• You'll be notified once verification is complete</li>
            </ul>
          </div>
        </div>
      </VendorLayout>
    </ProtectedRoute>
  );
}

