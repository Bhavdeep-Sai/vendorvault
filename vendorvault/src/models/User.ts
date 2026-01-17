import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: 'VENDOR' | 'STATION_MANAGER' | 'INSPECTOR' | 'RAILWAY_ADMIN';
  status: 'ACTIVE' | 'PENDING' | 'REJECTED' | 'SUSPENDED';
  
  // Enhanced Personal Information for Vendors
  fullName?: string; // For vendors - complete legal name
  photo?: string; // Profile photo URL
  aadhaarNumber?: string; // Updated spelling
  aadhaarVerified?: boolean; // Verification status
  panNumber?: string;
  panVerified?: boolean; // Verification status
  
  // Address Information
  dateOfBirth?: string;
  address?: string; // Formatted address (Street, State - PIN)
  aadharNumber?: string; // Legacy field - use aadhaarNumber
  emergencyContact?: string;
  emergencyRelation?: string;
  
  // Verification Status
  verificationStatus?: 'PENDING' | 'IN_PROGRESS' | 'VERIFIED' | 'REJECTED';
  profileCompletionPercentage?: number;
  
  // Professional Credentials
  railwayEmployeeId?: string;
  currentDesignation?: string;
  department?: string;
  railwayDivision?: string;
  yearsOfRailwayService?: string;
  educationalQualifications?: string;
  railwayCertifications?: string;
  
  // Proposed Station Assignment
  preferredStationCode?: string;
  preferredStationName?: string;
  stationType?: string;
  railwayZone?: string;
  stationCategory?: string;
  managerialExperience?: string;
  trafficHandlingExperience?: string;
  
  // Management Competencies
  applicationReason?: string;
  leadershipExperience?: string;
  operationalKnowledge?: string;
  safetyTraining?: string;
  languageProficiency?: string;
  computerProficiency?: string;
  
  // Professional References
  supervisorName?: string;
  supervisorDesignation?: string;
  supervisorContact?: string;
  colleagueName?: string;
  colleagueDesignation?: string;
  colleagueContact?: string;
  
  // Uploaded Documents for Verification
  documents?: {
    aadhaarCard?: string; // Cloudinary URL
    panCard?: string; // Cloudinary URL
    railwayIdCard?: string; // Cloudinary URL
    photograph?: string; // Cloudinary URL
    educationalCertificate?: string; // Cloudinary URL
    experienceLetter?: string; // Cloudinary URL
  };
  
  // Additional Qualifications
  specialAchievements?: string;
  relevantTraining?: string;
  technicalSkills?: string;
  additionalCertifications?: string;
  
  // System fields
  rejectionReason?: string; // Why their application was rejected
  approvedBy?: mongoose.Types.ObjectId; // Which super admin approved them
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: false,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['VENDOR', 'STATION_MANAGER', 'INSPECTOR', 'RAILWAY_ADMIN'],
      required: true,
      default: 'VENDOR',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PENDING', 'REJECTED', 'SUSPENDED'],
      required: true,
      default: 'ACTIVE', // Vendors are active by default, station managers start as pending
    },
    
    // Enhanced Personal Information for Vendors
    fullName: { type: String, required: false },
    photo: { type: String, required: false },
    aadhaarNumber: { type: String, required: false },
    aadhaarVerified: { type: Boolean, default: false },
    panNumber: { type: String, required: false },
    panVerified: { type: Boolean, default: false },
    
    // Address Information
    dateOfBirth: { type: String, required: false },
    address: { type: String, required: false }, // Formatted address
    aadharNumber: { type: String, required: false }, // Legacy - use aadhaarNumber
    emergencyContact: { type: String, required: false },
    emergencyRelation: { type: String, required: false },
    
    // Verification Status
    verificationStatus: { 
      type: String, 
      enum: ['PENDING', 'IN_PROGRESS', 'VERIFIED', 'REJECTED'],
      default: 'PENDING'
    },
    profileCompletionPercentage: { type: Number, default: 0 },
    
    // Professional Credentials
    railwayEmployeeId: { type: String, required: false },
    currentDesignation: { type: String, required: false },
    department: { type: String, required: false },
    railwayDivision: { type: String, required: false },
    yearsOfRailwayService: { type: String, required: false },
    educationalQualifications: { type: String, required: false },
    railwayCertifications: { type: String, required: false },
    
    // Proposed Station Assignment
    preferredStationCode: { type: String, required: false },
    preferredStationName: { type: String, required: false },
    stationType: { type: String, required: false },
    railwayZone: { type: String, required: false },
    stationCategory: { type: String, required: false },
    managerialExperience: { type: String, required: false },
    trafficHandlingExperience: { type: String, required: false },
    
    // Management Competencies
    applicationReason: { type: String, required: false },
    leadershipExperience: { type: String, required: false },
    operationalKnowledge: { type: String, required: false },
    safetyTraining: { type: String, required: false },
    languageProficiency: { type: String, required: false },
    computerProficiency: { type: String, required: false },
    
    // Professional References
    supervisorName: { type: String, required: false },
    supervisorDesignation: { type: String, required: false },
    supervisorContact: { type: String, required: false },
    colleagueName: { type: String, required: false },
    colleagueDesignation: { type: String, required: false },
    colleagueContact: { type: String, required: false },
    referenceName: { type: String, required: false },
    referenceDesignation: { type: String, required: false },
    referenceContact: { type: String, required: false },
    
    // Uploaded Documents for Verification
    documents: {
      aadhaarCard: { type: String, required: false },
      panCard: { type: String, required: false },
      railwayIdCard: { type: String, required: false },
      photograph: { type: String, required: false },
      educationalCertificate: { type: String, required: false },
      experienceLetter: { type: String, required: false },
    },
    
    // Additional Qualifications
    specialAchievements: { type: String, required: false },
    relevantTraining: { type: String, required: false },
    technicalSkills: { type: String, required: false },
    additionalCertifications: { type: String, required: false },
    
    // System fields
    rejectionReason: { type: String, required: false },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
// email already has unique: true, no need for separate index
UserSchema.index({ role: 1, status: 1 }); // For filtering users by role and status
UserSchema.index({ status: 1, createdAt: -1 }); // For admin dashboard filtering
UserSchema.index({ role: 1, createdAt: -1 }); // For role-based sorting

const User = (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema);

export default User;

