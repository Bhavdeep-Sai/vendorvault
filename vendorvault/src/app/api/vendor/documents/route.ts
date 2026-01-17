import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';
import Vendor from '@/models/Vendor';
import { uploadToCloudinary, deleteFromCloudinary, validateCloudinaryConfig } from '@/lib/cloudinary';

/**
 * GET /api/vendor/documents
 * Retrieves all documents for the authenticated vendor
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get vendor profile
    const vendor = await Vendor.findOne({ userId: user.userId }).lean();
    
    if (!vendor) {
      return NextResponse.json({ documents: [] });
    }

    // Fetch all documents for the vendor, sorted by most recent first
    const documents = await Document.find({ vendorId: vendor._id })
      .sort({ createdAt: -1 })
      .lean();

    // Map to include `uploadedAt` (frontend expects this field)
    const mapped = documents.map(doc => ({ ...doc, uploadedAt: doc.createdAt }));

    return NextResponse.json({ documents: mapped });
  } catch (error) {
    console.error('❌ Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vendor/documents
 * Uploads a new document for the authenticated vendor
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate Cloudinary configuration
    try {
      validateCloudinaryConfig();
    } catch (configError) {
      return NextResponse.json(
        { error: 'File upload service is not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    await connectDB();

    // Get vendor profile
    const vendor = await Vendor.findOne({ userId: user.userId }).lean();
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!documentType) {
      return NextResponse.json({ error: 'Document type is required' }, { status: 400 });
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }
    
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Only JPEG, PNG, WebP, and PDF files are allowed' 
      }, { status: 400 });
    }

    // Check if document already exists (for non-multiple types)
    const allowMultiple = ['BUSINESS_PHOTO', 'OTHER'];
    if (!allowMultiple.includes(documentType)) {
      const existingDoc = await Document.findOne({
        vendorId: vendor._id,
        type: documentType
      });

      if (existingDoc) {
        // Delete old document from Cloudinary
        await deleteFromCloudinary(existingDoc.fileUrl);

        // Delete old document record
        await Document.findByIdAndDelete(existingDoc._id);
      }
    }

    // Upload to Cloudinary
    const folder = `vendorvault/documents/${vendor._id}`;
    const fileUrl = await uploadToCloudinary(file, folder);

    // Save document record
    // Do NOT set `verified` here so newly uploaded documents remain in
    // a 'pending review' state. Station managers will explicitly verify/reject.
    const document = new Document({
      vendorId: vendor._id,
      type: documentType,
      fileUrl: fileUrl,
      fileName: file.name,
    });

    await document.save();

    return NextResponse.json({
      success: true,
      message: 'Document uploaded successfully',
      document,
    });
  } catch (error: any) {
    console.error('❌ Error uploading document:', error);
    
    let errorMessage = 'Failed to upload document';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/vendor/documents?id={documentId}
 * Deletes a document for the authenticated vendor
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get vendor profile
    const vendor = await Vendor.findOne({ userId: user.userId }).lean();
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Find the document and verify ownership
    const document = await Document.findOne({
      _id: documentId,
      vendorId: vendor._id,
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete file from Cloudinary
    await deleteFromCloudinary(document.fileUrl);

    // Delete document record
    await Document.findByIdAndDelete(documentId);

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
