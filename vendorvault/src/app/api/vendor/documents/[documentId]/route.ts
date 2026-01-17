import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';
import Vendor from '@/models/Vendor';
import { deleteFromCloudinary } from '@/lib/cloudinary';

/**
 * GET /api/vendor/documents/[documentId]
 * Returns the document file (redirects to Cloudinary URL)
 * Only accessible by the document owner (vendor)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await context.params;
    const auth = await getAuthUser(request);

    if (!auth || auth.role !== 'VENDOR') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Find the vendor for this user
    const vendor = await Vendor.findOne({ userId: auth.userId });
    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    // Find the document and verify it belongs to this vendor
    const document = await Document.findById(documentId);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (document.vendorId.toString() !== vendor._id.toString()) {
      return NextResponse.json(
        { error: "You don't have permission to access this document" },
        { status: 403 }
      );
    }

    // Redirect to the Cloudinary URL
    return NextResponse.redirect(document.fileUrl);

  } catch (error) {
    console.error("❌ Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to load document" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/vendor/documents/[documentId]
 * Deletes a specific document by ID for the authenticated vendor
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await context.params;
    const user = await getAuthUser(request);
    
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const vendor = await Vendor.findOne({ userId: user.userId });
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const document = await Document.findOne({ 
      _id: documentId,
      vendorId: vendor._id 
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.verified === true) {
      return NextResponse.json(
        { error: 'Cannot delete verified documents' },
        { status: 403 }
      );
    }

    // Delete from Cloudinary
    await deleteFromCloudinary(document.fileUrl);

    // Delete document record
    await Document.findByIdAndDelete(documentId);

    return NextResponse.json({ 
      success: true,
      message: 'Document deleted successfully' 
    });

  } catch (error) {
    console.error('❌ Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
