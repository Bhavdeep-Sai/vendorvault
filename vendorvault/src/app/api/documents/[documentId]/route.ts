import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/middleware/auth";
import connectDB from "@/lib/mongodb";
import Document from "@/models/Document";

/**
 * GET /api/documents/[documentId]
 * Redirects to the Cloudinary URL for the document
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await context.params;
    const auth = await getAuthUser(request);

    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

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
    console.error("❌ Error proxying document:", error);
    return NextResponse.json(
      { error: "Failed to load document" },
      { status: 500 }
    );
  }
}
