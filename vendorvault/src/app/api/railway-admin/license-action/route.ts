import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import License from "@/models/License";
import { getAuthUser } from "@/middleware/auth";

// Update license status (Admin only) - revoke or reactivate
export async function PATCH(request: NextRequest) {
  try {
    const auth = getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.role !== 'RAILWAY_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    await connectDB();

    const { licenseId, action, reason } = await request.json();

    if (!licenseId || !action) {
      return NextResponse.json(
        { error: "License ID and action are required" },
        { status: 400 }
      );
    }

    const license = await License.findById(licenseId);

    if (!license) {
      return NextResponse.json(
        { error: "License not found" },
        { status: 404 }
      );
    }

    if (action === 'REVOKE') {
      if (!reason) {
        return NextResponse.json(
          { error: "Revocation reason is required" },
          { status: 400 }
        );
      }
      license.status = 'REVOKED';
      license.rejectionReason = reason;
    } else if (action === 'REACTIVATE') {
      license.status = 'APPROVED';
      license.rejectionReason = undefined;
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    await license.save();

    return NextResponse.json({
      message: `License ${action.toLowerCase()}d successfully`,
      license
    });

  } catch (error) {
    console.error("Error updating license:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
