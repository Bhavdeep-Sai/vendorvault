import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Station from "@/models/Station";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      // Personal Information
      name,
      email,
      phone,
      password,
      dateOfBirth,
      addressLine,
      state,
      pinCode,
      aadhaarNumber,
      panNumber,
      emergencyContact,
      emergencyRelation,
      
      // Professional Credentials  
      railwayEmployeeId,
      currentDesignation,
      department,
      railwayDivision,
      yearsOfRailwayService,
      educationalQualifications,
      languageProficiency,
      
      // Station Management Request
      assignedStationCode,
      assignedStationName,
      railwayZone,
      stationCategory,
      platformCount,
      dailyFootfall,
      adminApplicationReason,
      
      // Documents
      documents,
    } = body;

    // Validate required fields
    if (!name || !email || !phone || !password || !dateOfBirth || !addressLine || !state || !pinCode ||
        !aadhaarNumber || !panNumber || !emergencyContact || !emergencyRelation ||
        !railwayEmployeeId || !currentDesignation || !department || !yearsOfRailwayService ||
        !assignedStationCode || !assignedStationName || !railwayZone || !stationCategory ||
        !platformCount || !dailyFootfall) {
      return NextResponse.json(
        { error: "All required fields must be provided" },
        { status: 400 }
      );
    }

    // Validate required documents
    if (!documents || !documents.aadhaarCard || !documents.panCard || 
        !documents.railwayIdCard || !documents.photograph) {
      return NextResponse.json(
        { error: "All required documents must be uploaded" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    // Validate phone format (Indian phone numbers)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.replace(/\s+/g, ""))) {
      return NextResponse.json(
        { error: "Please provide a valid 10-digit Indian phone number" },
        { status: 400 }
      );
    }

    // Validate Aadhaar format
    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(aadhaarNumber.replace(/\s/g, ""))) {
      return NextResponse.json(
        { error: "Aadhaar number must be 12 digits" },
        { status: 400 }
      );
    }

    // Validate PAN format
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(panNumber.toUpperCase())) {
      return NextResponse.json(
        { error: "Invalid PAN format (e.g., ABCDE1234F)" },
        { status: 400 }
      );
    }

    // Validate emergency contact format
    if (!phoneRegex.test(emergencyContact.replace(/\s+/g, ""))) {
      return NextResponse.json(
        { error: "Please provide a valid emergency contact number" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one uppercase letter, one lowercase letter, and one number" },
        { status: 400 }
      );
    }

    // Validate PIN code format
    if (!/^\d{6}$/.test(pinCode)) {
      return NextResponse.json(
        { error: "PIN code must be exactly 6 digits" },
        { status: 400 }
      );
    }

    // Validate platform count and daily footfall
    if (parseInt(platformCount) < 1) {
      return NextResponse.json(
        { error: "Station must have at least 1 platform" },
        { status: 400 }
      );
    }

    if (parseInt(dailyFootfall) < 0) {
      return NextResponse.json(
        { error: "Daily footfall cannot be negative" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email },
        { phone },
        { railwayEmployeeId }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 400 }
        );
      }
      if (existingUser.phone === phone) {
        return NextResponse.json(
          { error: "User with this phone number already exists" },
          { status: 400 }
        );
      }
      if (existingUser.railwayEmployeeId === railwayEmployeeId) {
        return NextResponse.json(
          { error: "User with this Railway Employee ID already exists" },
          { status: 400 }
        );
      }
    }

    // Check if there's already a pending or approved application for this station by another user
    const existingStationApplication = await Station.findOne({ 
      stationCode: assignedStationCode,
      approvalStatus: { $in: ['PENDING', 'APPROVED'] }
    });
    
    if (existingStationApplication) {
      return NextResponse.json(
        { error: "There is already an application for this station (pending approval or already approved). Please choose a different station." },
        { status: 400 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Format address (combining addressLine, state, and pinCode)
    const formattedAddress = `${addressLine}, ${state} - ${pinCode}`;

    // Create new user (Station Manager)
    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      dateOfBirth,
      address: formattedAddress,
      aadhaarNumber,
      panNumber,
      emergencyContact,
      emergencyRelation,
      role: "STATION_MANAGER",
      railwayEmployeeId,
      currentDesignation,
      department,
      yearsOfRailwayService,
      applicationReason: adminApplicationReason,
      // Optional fields
      ...(railwayDivision && { railwayDivision }),
      ...(educationalQualifications && { educationalQualifications }),
      ...(languageProficiency && { languageProficiency }),
      // Documents
      documents: {
        aadhaarCard: documents.aadhaarCard,
        panCard: documents.panCard,
        railwayIdCard: documents.railwayIdCard,
        photograph: documents.photograph,
        ...(documents.educationalCertificate && { educationalCertificate: documents.educationalCertificate }),
        ...(documents.experienceLetter && { experienceLetter: documents.experienceLetter }),
      },
      status: "PENDING", // Pending admin approval
    });

    const savedUser = await newUser.save();

    // Create pending station record
    const newStation = new Station({
      stationName: assignedStationName,
      stationCode: assignedStationCode,
      railwayZone,
      stationCategory,
      platformsCount: parseInt(platformCount),
      dailyFootfallAvg: parseInt(dailyFootfall),
      stationManagerId: savedUser._id,
      approvalStatus: "PENDING",
      operationalStatus: "PENDING_APPROVAL",
    });

    await newStation.save();

    // Create notifications for all Railway Admins
    try {
      const railwayAdmins = await User.find({ role: 'RAILWAY_ADMIN' }).select('_id');
      
      const notificationPromises = railwayAdmins.map(admin => {
        const Notification = require('@/models/Notification').default;
        return Notification.create({
          userId: admin._id,
          title: 'New Station Manager Application',
          message: `${name} has applied for Station Manager position at ${assignedStationName} (${assignedStationCode})`,
          type: 'STATION_MANAGER_APPLICATION',
          actionUrl: '/railway-admin/dashboard',
          metadata: {
            applicationId: savedUser._id.toString(),
            stationCode: assignedStationCode,
            stationName: assignedStationName,
            applicantName: name,
          },
          read: false,
        });
      });
      
      await Promise.all(notificationPromises);
    } catch (notifError) {
      console.error('Failed to create notifications:', notifError);
      // Don't fail the application if notification creation fails
    }

    // Remove sensitive information before sending response
    const responseUser = {
      id: savedUser._id,
      name: savedUser.name,
      email: savedUser.email,
      role: savedUser.role,
      status: savedUser.status,
    };

    return NextResponse.json({
      message: "Station Manager application submitted successfully! Please wait for admin approval.",
      user: responseUser,
      station: {
        id: newStation._id,
        stationName: newStation.stationName,
        stationCode: newStation.stationCode,
        approvalStatus: newStation.approvalStatus,
      },
    });

  } catch (error) {
    console.error("Station Manager application error:", error);
    
    // Handle mongoose validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError' && 'errors' in error) {
      const validationErrors = Object.values(error.errors as Record<string, { message: string }>).map((err) => err.message);
      return NextResponse.json(
        { error: `Validation failed: ${validationErrors.join(', ')}` },
        { status: 400 }
      );
    }

    // Handle mongoose duplicate key errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000 && 'keyPattern' in error) {
      const field = Object.keys((error as { keyPattern: Record<string, unknown> }).keyPattern)[0];
      return NextResponse.json(
        { error: `A record with this ${field} already exists` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}