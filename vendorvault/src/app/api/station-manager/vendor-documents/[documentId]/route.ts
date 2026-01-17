import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/middleware/auth";
import connectDB from "@/lib/mongodb";
import Document from "@/models/Document";

/**
 * GET /api/station-manager/vendor-documents/[documentId]
 * Returns the vendor document file (redirects to Cloudinary URL)
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

    // Find the document
    const document = await Document.findById(documentId);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Redirect to the Cloudinary URL
    return NextResponse.redirect(document.fileUrl);

  } catch (error) {
    console.error("❌ Error fetching vendor document:", error);
    return NextResponse.json(
      { error: "Failed to load document" },
      { status: 500 }
    );
  }
}
