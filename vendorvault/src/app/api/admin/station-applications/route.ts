import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Station from "@/models/Station";
import { verifyJWT } from "@/lib/auth";

// Get all pending station manager applications (Railway Admin only)
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication - check cookie first, then Authorization header
    const token = request.cookies.get('token')?.value || 
                  request.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = await verifyJWT(token);
    if (!decoded || decoded.role !== "RAILWAY_ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Railway Admin access required" }, { status: 403 });
    }

    await connectDB();

    // Get pending users with their associated stations
    const pendingApplications = await User.find({
      role: "STATION_MANAGER",
      status: "PENDING"
    }).select('-password').lean();

    const applicationsWithStations = await Promise.all(
      pendingApplications.map(async (user) => {
        const station = await Station.findOne({ 
          stationManagerId: user._id,
          approvalStatus: "PENDING"
        }).lean();
        
        return {
          user,
          station
        };
      })
    );

    return NextResponse.json({
      applications: applicationsWithStations,
      total: applicationsWithStations.length
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Approve or reject station manager application
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication - check cookie first, then Authorization header
    const token = request.cookies.get('token')?.value || 
                  request.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = await verifyJWT(token);
    if (!decoded || decoded.role !== "RAILWAY_ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Railway Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, stationId, action, rejectionReason } = body;

    if (!userId || !stationId || !action) {
      return NextResponse.json(
        { error: "User ID, Station ID, and action are required" },
        { status: 400 }
      );
    }

    if (!["APPROVED", "REJECTED"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be either APPROVED or REJECTED" },
        { status: 400 }
      );
    }

    if (action === "REJECTED" && !rejectionReason) {
      return NextResponse.json(
        { error: "Rejection reason is required when rejecting an application" },
        { status: 400 }
      );
    }

    await connectDB();

    // Update user status
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        status: action === "APPROVED" ? "ACTIVE" : "REJECTED",
        approvedBy: decoded.userId,
        ...(action === "REJECTED" && { rejectionReason })
      },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update station status
    const updatedStation = await Station.findByIdAndUpdate(
      stationId,
      {
        approvalStatus: action,
        operationalStatus: action === "APPROVED" ? "ACTIVE" : "PENDING_APPROVAL",
        approvedBy: decoded.userId,
        ...(action === "REJECTED" && { rejectionReason })
      },
      { new: true }
    );

    if (!updatedStation) {
      return NextResponse.json(
        { error: "Station not found" },
        { status: 404 }
      );
    }

    const message = action === "APPROVED" 
      ? "Station Manager application approved successfully" 
      : "Station Manager application rejected";

    return NextResponse.json({
      message,
      user: updatedUser,
      station: updatedStation
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}