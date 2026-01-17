"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  DocumentIcon,
} from "@/components/Icons";
import toast from "react-hot-toast";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

interface StationDetails {
  _id: string;
  stationName: string;
  stationCode: string;
  railwayZone: string;
  division?: string;
  stationCategory: string;
  platformsCount: number;
  dailyFootfallAvg: number;
  approvalStatus: string;
  operationalStatus: string;
  totalAreaSqM?: number;
  entryGates?: number;
  peakFootfall?: number;
  layoutCompleted?: boolean;
  rejectionReason?: string;
  stationManagerId?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role?: string;
    status?: string;
    fullName?: string;
    photo?: string;
    aadhaarNumber?: string;
    aadhaarVerified?: boolean;
    panNumber?: string;
    panVerified?: boolean;
    dateOfBirth?: string;
    address?: string;
    aadharNumber?: string;
    emergencyContact?: string;
    emergencyRelation?: string;
    verificationStatus?: string;
    profileCompletionPercentage?: number;
    railwayEmployeeId?: string;
    currentDesignation?: string;
    department?: string;
    railwayDivision?: string;
    yearsOfRailwayService?: string;
    educationalQualifications?: string;
    railwayCertifications?: string;
    preferredStationCode?: string;
    preferredStationName?: string;
    stationType?: string;
    railwayZone?: string;
    stationCategory?: string;
    managerialExperience?: string;
    trafficHandlingExperience?: string;
    applicationReason?: string;
    leadershipExperience?: string;
    operationalKnowledge?: string;
    safetyTraining?: string;
    languageProficiency?: string;
    computerProficiency?: string;
    supervisorName?: string;
    supervisorDesignation?: string;
    supervisorContact?: string;
    colleagueName?: string;
    colleagueDesignation?: string;
    colleagueContact?: string;
    documents?: {
      aadhaarCard?: string;
      panCard?: string;
      railwayIdCard?: string;
      photograph?: string;
      educationalCertificate?: string;
      experienceLetter?: string;
    };
    specialAchievements?: string;
    relevantTraining?: string;
    technicalSkills?: string;
    additionalCertifications?: string;
    rejectionReason?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  facilities?: string[];
  amenities?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function StationApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const [station, setStation] = useState<StationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<{
    url: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    fetchStationDetails();
  }, [params.id]);

  const fetchStationDetails = async () => {
    try {
      const res = await fetch(`/api/railway-admin/stations/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setStation(data.station);
      } else {
        toast.error("Failed to fetch station details");
        router.push("/railway-admin/dashboard");
      }
    } catch (error) {
      toast.error("Failed to fetch station details");
      router.push("/railway-admin/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveStation = async (status: "APPROVED" | "REJECTED") => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/railway-admin/stations/approve", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId: params.id, approvalStatus: status }),
      });

      if (res.ok) {
        toast.success(`Station application ${status.toLowerCase()}`);
        fetchStationDetails();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update station");
      }
    } catch (error) {
      toast.error("Failed to update station");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyDocument = async (
    documentType: "aadhaar" | "pan",
    verified: boolean
  ) => {
    if (!station?.stationManagerId?._id) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/railway-admin/users/verify-document", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: station.stationManagerId._id,
          documentType,
          verified,
        }),
      });

      if (res.ok) {
        toast.success(
          `${documentType.toUpperCase()} ${
            verified ? "verified" : "rejected"
          } successfully`
        );
        fetchStationDetails();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to verify document");
      }
    } catch (error) {
      toast.error("Failed to verify document");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!station) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Station not found
          </h2>
          <button
            onClick={() => router.push("/railway-admin/dashboard")}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Go back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/railway-admin/dashboard")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Station Application Details
              </h1>
              <p className="text-gray-600 mt-1">
                Complete information about the station application
              </p>
            </div>
          </div>
          {station.approvalStatus === "PENDING" &&
            station.stationManagerId?.aadhaarVerified &&
            station.stationManagerId?.panVerified && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleApproveStation("APPROVED")}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <CheckIcon size={20} />
                  Approve
                </button>
                <button
                  onClick={() => handleApproveStation("REJECTED")}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <XMarkIcon size={20} />
                  Reject
                </button>
              </div>
            )}
          {station.approvalStatus === "PENDING" &&
            (!station.stationManagerId?.aadhaarVerified ||
              !station.stationManagerId?.panVerified) && (
              <div className="flex justify-center items-center gap-1 px-4 py-2 bg-orange-50 text-yellow-500 border border-orange-200 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2" />
                </svg>
                <p className="text-sm text-orange-700 font-medium">
                  Please verify both Aadhaar and PAN before approving the
                  station
                </p>
              </div>
            )}
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <span
            className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full ${
              station.approvalStatus === "APPROVED"
                ? "bg-green-100 text-green-700"
                : station.approvalStatus === "PENDING"
                ? "bg-orange-100 text-orange-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            Status: {station.approvalStatus}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Station Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Station Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Station Name
                </label>
                <p className="text-gray-900 text-lg">{station.stationName}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Station Code
                </label>
                <p className="text-gray-900">{station.stationCode}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Railway Zone
                </label>
                <p className="text-gray-900">{station.railwayZone}</p>
              </div>
              {station.division && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">
                    Division
                  </label>
                  <p className="text-gray-900">{station.division}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Category
                </label>
                <p className="text-gray-900">{station.stationCategory}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Number of Platforms
                </label>
                <p className="text-gray-900">{station.platformsCount}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Daily Footfall Average
                </label>
                <p className="text-gray-900">
                  {station.dailyFootfallAvg?.toLocaleString() || "N/A"}
                </p>
              </div>
              {station.totalAreaSqM && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">
                    Total Area
                  </label>
                  <p className="text-gray-900">
                    {station.totalAreaSqM.toLocaleString()} sq.m
                  </p>
                </div>
              )}
              {station.peakFootfall && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">
                    Peak Footfall
                  </label>
                  <p className="text-gray-900">
                    {station.peakFootfall.toLocaleString()}
                  </p>
                </div>
              )}
              {station.rejectionReason && (
                <div className="md:col-span-3">
                  <label className="text-sm font-semibold text-gray-600">
                    Rejection Reason
                  </label>
                  <p className="text-red-600">{station.rejectionReason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Station Manager Details */}
          {station.stationManagerId && (
            <>
              {/* Personal Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
                <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b">
                  Station Manager - Personal Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {station.stationManagerId.photo && (
                    <div className="md:col-span-3">
                      <img
                        src={station.stationManagerId.photo}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Full Name
                    </label>
                    <p className="text-gray-900 text-lg">
                      {station.stationManagerId.fullName ||
                        station.stationManagerId.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Email
                    </label>
                    <p className="text-gray-900">
                      {station.stationManagerId.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Phone Number
                    </label>
                    <p className="text-gray-900">
                      {station.stationManagerId.phone || "N/A"}
                    </p>
                  </div>
                  {station.stationManagerId.dateOfBirth && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        Date of Birth
                      </label>
                      <p className="text-gray-900">
                        {new Date(
                          station.stationManagerId.dateOfBirth
                        ).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  )}
                  {station.stationManagerId.address && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-gray-600">
                        Address
                      </label>
                      <p className="text-gray-900">
                        {station.stationManagerId.address}
                      </p>
                    </div>
                  )}
                  {station.stationManagerId.emergencyContact && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        Emergency Contact
                      </label>
                      <p className="text-gray-900">
                        {station.stationManagerId.emergencyContact}
                      </p>
                    </div>
                  )}
                  {station.stationManagerId.emergencyRelation && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        Emergency Relation
                      </label>
                      <p className="text-gray-900">
                        {station.stationManagerId.emergencyRelation}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Identity Verification */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
                <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b">
                  Identity Verification
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {station.stationManagerId.aadhaarNumber && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-600">
                          Aadhaar Number
                        </label>
                        {station.stationManagerId.documents?.aadhaarCard && (
                          <button
                            onClick={() =>
                              setViewingDoc({
                                url: station.stationManagerId!.documents!
                                  .aadhaarCard!,
                                name: "Aadhaar Card",
                              })
                            }
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <EyeIcon size={16} />
                            View
                          </button>
                        )}
                      </div>
                      <p className="text-gray-900 mb-3">
                        {station.stationManagerId.aadhaarNumber}
                      </p>
                      <div className="flex items-center gap-2">
                        {station.stationManagerId.aadhaarVerified !==
                          undefined && (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              station.stationManagerId.aadhaarVerified
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {station.stationManagerId.aadhaarVerified
                              ? "Verified"
                              : "Not Verified"}
                          </span>
                        )}
                        {!station.stationManagerId.aadhaarVerified && (
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                handleVerifyDocument("aadhaar", true)
                              }
                              disabled={actionLoading}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() =>
                                handleVerifyDocument("aadhaar", false)
                              }
                              disabled={actionLoading}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {station.stationManagerId.panNumber && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-600">
                          PAN Number
                        </label>
                        {station.stationManagerId.documents?.panCard && (
                          <button
                            onClick={() =>
                              setViewingDoc({
                                url: station.stationManagerId!.documents!
                                  .panCard!,
                                name: "PAN Card",
                              })
                            }
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <EyeIcon size={16} />
                            View
                          </button>
                        )}
                      </div>
                      <p className="text-gray-900 mb-3">
                        {station.stationManagerId.panNumber}
                      </p>
                      <div className="flex items-center gap-2">
                        {station.stationManagerId.panVerified !== undefined && (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              station.stationManagerId.panVerified
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {station.stationManagerId.panVerified
                              ? "Verified"
                              : "Not Verified"}
                          </span>
                        )}
                        {!station.stationManagerId.panVerified && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVerifyDocument("pan", true)}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => handleVerifyDocument("pan", false)}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Professional Credentials */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
                <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b">
                  Professional Background & Experience
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {station.stationManagerId.railwayEmployeeId && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        Railway Employee ID
                      </label>
                      <p className="text-gray-900">
                        {station.stationManagerId.railwayEmployeeId}
                      </p>
                    </div>
                  )}
                  {station.stationManagerId.currentDesignation && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        Current Designation
                      </label>
                      <p className="text-gray-900">
                        {station.stationManagerId.currentDesignation}
                      </p>
                    </div>
                  )}
                  {station.stationManagerId.department && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        Department
                      </label>
                      <p className="text-gray-900">
                        {station.stationManagerId.department}
                      </p>
                    </div>
                  )}
                  {station.stationManagerId.railwayDivision && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        Railway Division
                      </label>
                      <p className="text-gray-900">
                        {station.stationManagerId.railwayDivision}
                      </p>
                    </div>
                  )}
                  {station.stationManagerId.yearsOfRailwayService && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        Years of Railway Service
                      </label>
                      <p className="text-gray-900">
                        {station.stationManagerId.yearsOfRailwayService}
                      </p>
                    </div>
                  )}
                  {station.stationManagerId.languageProficiency && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        Language Proficiency
                      </label>
                      <p className="text-gray-900">
                        {station.stationManagerId.languageProficiency}
                      </p>
                    </div>
                  )}
                  {station.stationManagerId.computerProficiency && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        Computer Proficiency
                      </label>
                      <p className="text-gray-900">
                        {station.stationManagerId.computerProficiency}
                      </p>
                    </div>
                  )}
                  {station.stationManagerId.educationalQualifications && (
                    <div className="md:col-span-3">
                      <label className="text-sm font-semibold text-gray-600">
                        Educational Qualifications
                      </label>
                      <p className="text-gray-900">
                        {station.stationManagerId.educationalQualifications}
                      </p>
                    </div>
                  )}
                  {station.stationManagerId.railwayCertifications && (
                    <div className="md:col-span-3">
                      <label className="text-sm font-semibold text-gray-600">
                        Railway Certifications
                      </label>
                      <p className="text-gray-900">
                        {station.stationManagerId.railwayCertifications}
                      </p>
                    </div>
                  )}
                  {station.stationManagerId.applicationReason && (
                    <div className="md:col-span-3">
                      <label className="text-sm font-semibold text-gray-600">
                        Application Reason
                      </label>
                      <p className="text-gray-900">
                        {station.stationManagerId.applicationReason}
                      </p>
                    </div>
                  )}
                  {station.stationManagerId.leadershipExperience && (
                    <div className="md:col-span-3">
                      <label className="text-sm font-semibold text-gray-600">
                        Leadership Experience
                      </label>
                      <p className="text-gray-900">
                        {station.stationManagerId.leadershipExperience}
                      </p>
                    </div>
                  )}
                  {station.stationManagerId.operationalKnowledge && (
                    <div className="md:col-span-3">
                      <label className="text-sm font-semibold text-gray-600">
                        Operational Knowledge
                      </label>
                      <p className="text-gray-900">
                        {station.stationManagerId.operationalKnowledge}
                      </p>
                    </div>
                  )}
                  {station.stationManagerId.safetyTraining && (
                    <div className="md:col-span-3">
                      <label className="text-sm font-semibold text-gray-600">
                        Safety Training
                      </label>
                      <p className="text-gray-900">
                        {station.stationManagerId.safetyTraining}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Station Preferences - Remove entire section */}

              {/* Professional References */}
              {(station.stationManagerId.supervisorName ||
                station.stationManagerId.colleagueName) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b">
                    Professional References
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {station.stationManagerId.supervisorName && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-gray-700">
                          Supervisor Reference
                        </h3>
                        <div>
                          <label className="text-sm font-semibold text-gray-600">
                            Name
                          </label>
                          <p className="text-gray-900">
                            {station.stationManagerId.supervisorName}
                          </p>
                        </div>
                        {station.stationManagerId.supervisorDesignation && (
                          <div>
                            <label className="text-sm font-semibold text-gray-600">
                              Designation
                            </label>
                            <p className="text-gray-900">
                              {station.stationManagerId.supervisorDesignation}
                            </p>
                          </div>
                        )}
                        {station.stationManagerId.supervisorContact && (
                          <div>
                            <label className="text-sm font-semibold text-gray-600">
                              Contact
                            </label>
                            <p className="text-gray-900">
                              {station.stationManagerId.supervisorContact}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    {station.stationManagerId.colleagueName && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-gray-700">
                          Colleague Reference
                        </h3>
                        <div>
                          <label className="text-sm font-semibold text-gray-600">
                            Name
                          </label>
                          <p className="text-gray-900">
                            {station.stationManagerId.colleagueName}
                          </p>
                        </div>
                        {station.stationManagerId.colleagueDesignation && (
                          <div>
                            <label className="text-sm font-semibold text-gray-600">
                              Designation
                            </label>
                            <p className="text-gray-900">
                              {station.stationManagerId.colleagueDesignation}
                            </p>
                          </div>
                        )}
                        {station.stationManagerId.colleagueContact && (
                          <div>
                            <label className="text-sm font-semibold text-gray-600">
                              Contact
                            </label>
                            <p className="text-gray-900">
                              {station.stationManagerId.colleagueContact}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Documents */}
              {station.stationManagerId.documents &&
                Object.keys(station.stationManagerId.documents).filter(
                  (k) =>
                    station.stationManagerId.documents![
                      k as keyof typeof station.stationManagerId.documents
                    ]
                ).length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b">
                      Uploaded Documents
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {station.stationManagerId.documents.aadhaarCard && (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">
                            Aadhaar Card
                          </h4>
                          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                            <DocumentIcon size={64} className="text-gray-400" />
                          </div>
                          <button
                            onClick={() =>
                              setViewingDoc({
                                url: station.stationManagerId!.documents!
                                  .aadhaarCard!,
                                name: "Aadhaar Card",
                              })
                            }
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium inline-flex items-center justify-center gap-2"
                          >
                            <EyeIcon size={16} />
                            View Document
                          </button>
                        </div>
                      )}
                      {station.stationManagerId.documents.panCard && (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">
                            PAN Card
                          </h4>
                          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                            <DocumentIcon size={64} className="text-gray-400" />
                          </div>
                          <button
                            onClick={() =>
                              setViewingDoc({
                                url: station.stationManagerId!.documents!
                                  .panCard!,
                                name: "PAN Card",
                              })
                            }
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium inline-flex items-center justify-center gap-2"
                          >
                            <EyeIcon size={16} />
                            View Document
                          </button>
                        </div>
                      )}
                      {station.stationManagerId.documents.railwayIdCard && (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">
                            Railway ID Card
                          </h4>
                          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                            <DocumentIcon size={64} className="text-gray-400" />
                          </div>
                          <button
                            onClick={() =>
                              setViewingDoc({
                                url: station.stationManagerId!.documents!
                                  .railwayIdCard!,
                                name: "Railway ID Card",
                              })
                            }
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium inline-flex items-center justify-center gap-2"
                          >
                            <EyeIcon size={16} />
                            View Document
                          </button>
                        </div>
                      )}
                      {station.stationManagerId.documents.photograph && (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">
                            Photograph
                          </h4>
                          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={
                                station.stationManagerId.documents.photograph
                              }
                              alt="Photograph"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}
                      {station.stationManagerId.documents
                        .educationalCertificate && (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">
                            Educational Certificate
                          </h4>
                          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                            <DocumentIcon size={64} className="text-gray-400" />
                          </div>
                          <button
                            onClick={() =>
                              setViewingDoc({
                                url: station.stationManagerId!.documents!
                                  .educationalCertificate!,
                                name: "Educational Certificate",
                              })
                            }
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium inline-flex items-center justify-center gap-2"
                          >
                            <EyeIcon size={16} />
                            View Document
                          </button>
                        </div>
                      )}
                      {station.stationManagerId.documents.experienceLetter && (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">
                            Experience Letter
                          </h4>
                          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                            <DocumentIcon size={64} className="text-gray-400" />
                          </div>
                          <button
                            onClick={() =>
                              setViewingDoc({
                                url: station.stationManagerId!.documents!
                                  .experienceLetter!,
                                name: "Experience Letter",
                              })
                            }
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium inline-flex items-center justify-center gap-2"
                          >
                            <EyeIcon size={16} />
                            View Document
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Additional Qualifications */}
              {(station.stationManagerId.specialAchievements ||
                station.stationManagerId.relevantTraining ||
                station.stationManagerId.technicalSkills ||
                station.stationManagerId.additionalCertifications) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b">
                    Additional Qualifications
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {station.stationManagerId.specialAchievements && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">
                          Special Achievements
                        </label>
                        <p className="text-gray-900">
                          {station.stationManagerId.specialAchievements}
                        </p>
                      </div>
                    )}
                    {station.stationManagerId.relevantTraining && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">
                          Relevant Training
                        </label>
                        <p className="text-gray-900">
                          {station.stationManagerId.relevantTraining}
                        </p>
                      </div>
                    )}
                    {station.stationManagerId.technicalSkills && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">
                          Technical Skills
                        </label>
                        <p className="text-gray-900">
                          {station.stationManagerId.technicalSkills}
                        </p>
                      </div>
                    )}
                    {station.stationManagerId.additionalCertifications && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">
                          Additional Certifications
                        </label>
                        <p className="text-gray-900">
                          {station.stationManagerId.additionalCertifications}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {station.stationManagerId.rejectionReason && (
                <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6 lg:col-span-2">
                  <h2 className="text-xl font-bold text-red-900 mb-4">
                    Rejection Reason
                  </h2>
                  <p className="text-red-800">
                    {station.stationManagerId.rejectionReason}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Facilities & Amenities */}
          {((station.facilities && station.facilities.length > 0) ||
            (station.amenities && station.amenities.length > 0)) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Facilities & Amenities
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {station.facilities && station.facilities.length > 0 && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Facilities
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {station.facilities.map((facility, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                          {facility}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {station.amenities && station.amenities.length > 0 && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Amenities
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {station.amenities.map((amenity, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Application Timeline
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Applied On
                </label>
                <p className="text-gray-900">
                  {new Date(station.createdAt).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Last Updated
                </label>
                <p className="text-gray-900">
                  {new Date(station.updatedAt).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Viewing Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {viewingDoc.name}
              </h3>
              <button
                onClick={() => setViewingDoc(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                  viewingDoc.url
                )}&embedded=true`}
                className="w-full h-full"
                title={viewingDoc.name}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
