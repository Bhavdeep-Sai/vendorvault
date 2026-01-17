import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/middleware/auth";
import connectDB from "@/lib/mongodb";
import Document from "@/models/Document";
import Vendor from "@/models/Vendor";

/**
 * GET /api/vendor/documents/[documentId]/info
 * Returns metadata about a document without the file URL
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

    return NextResponse.json({
      document: {
        _id: document._id,
        type: document.type,
        fileName: document.fileName,
        fileUrl: document.fileUrl,
        verified: document.verified,
        verificationNotes: document.verificationNotes,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      }
    });

  } catch (error) {
    console.error("❌ Error fetching document info:", error);
    return NextResponse.json(
      { error: "Failed to fetch document info" },
      { status: 500 }
    );
  }
}
