import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/middleware/auth";
import connectDB from "@/lib/mongodb";
import Document from "@/models/Document";

/**
 * GET /api/documents/[documentId]/info
 * Returns metadata about a document without the file URL
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

    return NextResponse.json({
      document: {
        _id: document._id,
        type: document.type,
        fileName: document.fileName,
        verified: document.verified,
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
