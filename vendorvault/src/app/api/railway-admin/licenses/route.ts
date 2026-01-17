import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import License from "@/models/License";
import Vendor from "@/models/Vendor";
import { getAuthUser } from "@/middleware/auth";
import { getPaginationParams, createPaginationResult } from "@/lib/pagination";

// Get all vendor license applications (Admin only)
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.role !== 'RAILWAY_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const { skip, limit, page } = getPaginationParams(request.nextUrl.searchParams);

    // Build query
    const query: any = {};
    if (status !== 'all') {
      query.status = status.toUpperCase();
    }

    // Get all licenses with pagination
    const licenses = await License.find(query)
      .populate('vendorId')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const totalLicenses = await License.countDocuments(query);

    // Filter by search if provided
    let filteredLicenses = licenses;
    if (search) {
      filteredLicenses = licenses.filter((license: any) => {
        const vendor = license.vendorId;
        return (
          license.licenseNumber?.toLowerCase().includes(search.toLowerCase()) ||
          vendor?.businessName?.toLowerCase().includes(search.toLowerCase()) ||
          vendor?.ownerName?.toLowerCase().includes(search.toLowerCase()) ||
          vendor?.email?.toLowerCase().includes(search.toLowerCase())
        );
      });
    }

    const pagination = createPaginationResult({
      data: filteredLicenses,
      total: totalLicenses,
      page,
      limit
    });

    return NextResponse.json({
      licenses: filteredLicenses,
      pagination
    });

  } catch (error) {
    console.error("Error fetching licenses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
