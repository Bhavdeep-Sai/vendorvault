import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getAuthUser } from "@/middleware/auth";
import ShopApplication from "@/models/ShopApplication";
import Vendor from "@/models/Vendor";
import User from "@/models/User";
import License from "@/models/License";
import Document from "@/models/Document";
import VendorBank from "@/models/VendorBank";
import VendorBusiness from "@/models/VendorBusiness";
import VendorFoodLicense from "@/models/VendorFoodLicense";
import VendorPolice from "@/models/VendorPolice";
import VendorFinancial from "@/models/VendorFinancial";
import VendorRailwayDeclaration from "@/models/VendorRailwayDeclaration";
import Station from "@/models/Station";
import mongoose from "mongoose";

// GET /api/station-manager/applications/[id] - Get application details  
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const auth = getAuthUser(request);

    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (auth.role !== "STATION_MANAGER") {
      return NextResponse.json(
        { error: "Forbidden - Station Manager access required" },
        { status: 403 }
      );
    }

    await connectDB();

    // Get station for this manager
    const station = await Station.findOne({ 
      stationManagerId: auth.userId,
      approvalStatus: "APPROVED"
    });

    if (!station) {
      return NextResponse.json(
        { error: "No approved station found for this manager" },
        { status: 404 }
      );
    }

    // Get application
    const application = await ShopApplication.findById(id)
      .populate("stationId", "name stationCode")
      .populate("platformId", "name platformNumber");

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Verify application belongs to manager's station
    if (application.stationId._id.toString() !== station._id.toString()) {
      return NextResponse.json(
        { error: "Unauthorized access to this application" },
        { status: 403 }
      );
    }

    // Get vendor details. `application.vendorId` may store either the Vendor._id
    // or the User._id (some endpoints create applications with the User id).
    // Try both lookup strategies to be resilient.
    let vendor = await Vendor.findById(application.vendorId)
      .populate("userId", "email name phone fullName aadhaarVerified panVerified");

    if (!vendor) {
      // Try finding Vendor by userId matching application.vendorId
      vendor = await Vendor.findOne({ userId: application.vendorId })
        .populate("userId", "email name phone fullName aadhaarVerified panVerified");
    }

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    // Get license
    const license = await License.findOne({ applicationId: application._id });

    if (!license) {
      return NextResponse.json(
        { error: "License not found" },
        { status: 404 }
      );
    }

    // Get documents using vendor's _id
    const vendorObjectId = new mongoose.Types.ObjectId(vendor._id.toString());
    const documents = await Document.find({ vendorId: vendorObjectId });

    // Get detailed verification data for station manager review
    const userId = (vendor.userId as any)._id;
    const [bank, business, foodLicense, police, financial, railway] = await Promise.all([
      VendorBank.findOne({ vendorId: userId }).lean(),
      VendorBusiness.findOne({ vendorId: userId }).lean(),
      VendorFoodLicense.findOne({ vendorId: userId }).lean(),
      VendorPolice.findOne({ vendorId: userId }).lean(),
      VendorFinancial.findOne({ vendorId: userId }).lean(),
      VendorRailwayDeclaration.findOne({ vendorId: userId }).lean(),
    ]);

    // Build comprehensive verification status
    const user = vendor.userId as any;
    const verificationDetails = {
      personalInfo: {
        aadhaarVerified: user.aadhaarVerified || false,
        panVerified: user.panVerified || false,
      },
      bankDetails: {
        exists: !!bank,
        verified: bank?.bankVerified || false,
        data: bank,
      },
      businessDetails: {
        exists: !!business,
        verified: business?.businessVerified || false,
        data: business,
      },
      foodLicense: {
        required: business?.businessCategory === 'FOOD',
        exists: !!foodLicense,
        verified: foodLicense?.fssaiVerified || false,
        data: foodLicense,
      },
      policeVerification: {
        exists: !!police,
        verified: police?.policeVerified || false,
        data: police,
      },
      financialDetails: {
        exists: !!financial,
        verified: financial?.financialVerified || false,
        data: financial,
      },
      railwayDeclaration: {
        exists: !!railway,
        verified: railway?.isValid || false,
        data: railway,
      },
    };

    const responseData = {
      application: {
        ...application.toObject(),
        vendor: {
          ...vendor.toObject(),
          user: vendor.userId
        },
        license: license.toObject(),
        // Map documents to include `uploadedAt` for frontend compatibility
        documents: documents.map((doc) => {
          const obj = doc.toObject();
          return {
            ...obj,
            uploadedAt: obj.createdAt,
          };
        }),
        verificationDetails,
      }
    };

    return NextResponse.json(responseData);

  } catch {
    return NextResponse.json(
      { error: "Failed to fetch application details" },
      { status: 500 }
    );
  }
}
