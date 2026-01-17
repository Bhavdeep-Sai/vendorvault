import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/middleware/auth";
import connectDB from "@/lib/mongodb";
import Document from "@/models/Document";
import Vendor from "@/models/Vendor";

/**
 * GET /api/station-manager/vendor-documents/[documentId]/info
 * Returns metadata about a vendor document
 * Only accessible by station managers for reviewing vendor applications
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await context.params;
    const auth = await getAuthUser(request);

    if (!auth || auth.role !== 'STATION_MANAGER') {
      return NextResponse.json(
        { error: "Unauthorized - Station Manager access required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Find the document and populate vendor info
    const document = await Document.findById(documentId);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Get vendor information
    const vendor = await Vendor.findById(document.vendorId).populate('userId', 'name');
    
    // Extract owner name safely
    let ownerName = 'N/A';
    if (vendor?.userId && typeof vendor.userId === 'object') {
      const userObj = vendor.userId as { name?: string };
      ownerName = userObj.name || 'N/A';
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
        vendorInfo: {
          businessName: vendor?.businessName || 'N/A',
          ownerName,
        }
      }
    });

  } catch (error) {
    console.error("❌ Error fetching vendor document info:", error);
    return NextResponse.json(
      { error: "Failed to fetch document info" },
      { status: 500 }
    );
  }
}
