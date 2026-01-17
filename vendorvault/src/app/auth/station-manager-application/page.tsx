"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrainIcon, CheckIcon } from "@/components/Icons";
import { motion, AnimatePresence } from 'framer-motion';
import Select from '@/components/ui/Select';
import StationAutocomplete, { StationData } from '@/components/ui/StationAutocomplete';
import InfoTooltip from '@/components/ui/InfoTooltip';
import toast from "react-hot-toast";

export default function StationManagerApplication() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [documents, setDocuments] = useState<{
    aadhaarCard?: string;
    panCard?: string;
    railwayIdCard?: string;
    educationalCertificate?: string;
    experienceLetter?: string;
    photograph?: string;
  }>({});
  
  const [formData, setFormData] = useState({
    // Personal Details
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    addressLine: "",
    state: "",
    pinCode: "",
    aadhaarNumber: "",
    panNumber: "",
    emergencyContact: "",
    emergencyRelation: "",

    // Professional Credentials
    railwayEmployeeId: "",
    currentDesignation: "",
    department: "",
    railwayDivision: "",
    yearsOfRailwayService: "",
    educationalQualifications: "",
    languageProficiency: "",

    // Station Information
    assignedStationName: "",
    assignedStationCode: "",
    railwayZone: "",
    stationCategory: "",
    platformCount: "",
    dailyFootfall: "",
    adminApplicationReason: "",
  });

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "name":
        if (!value.trim()) return "Full name is required";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        if (!/^[a-zA-Z\s]+$/.test(value)) return "Name can only contain letters and spaces";
        return "";

      case "email":
        if (!value.trim()) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Please enter a valid email address";
        return "";

      case "phone":
        if (!value.trim()) return "Phone number is required";
        if (!/^[6-9]\d{9}$/.test(value.replace(/\s+/g, ""))) return "Please enter a valid 10-digit Indian phone number";
        return "";

      case "password":
        if (!value) return "Password is required";
        if (value.length < 8) return "Password must be at least 8 characters";
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) return "Password must contain uppercase, lowercase, and number";
        return "";

      case "confirmPassword":
        if (!value) return "Please confirm your password";
        if (value !== formData.password) return "Passwords do not match";
        return "";

      case "railwayEmployeeId":
        if (!value.trim()) return "Railway Employee ID is required";
        if (!/^[A-Z0-9]{6,12}$/i.test(value)) return "Employee ID should be 6-12 alphanumeric characters";
        return "";

      case "adminApplicationReason":
        // Optional field - no validation required
        return "";

      case "platformCount":
        if (!value.trim()) return "Number of platforms is required";
        if (parseInt(value) < 1) return "Must have at least 1 platform";
        return "";

      case "dailyFootfall":
        if (!value.trim()) return "Daily footfall is required";
        if (parseInt(value) < 0) return "Daily footfall cannot be negative";
        return "";

      case "pinCode":
        if (!value.trim()) return "PIN code is required";
        if (!/^\d{6}$/.test(value)) return "PIN code must be 6 digits";
        return "";

      case "aadhaarNumber":
        if (!value.trim()) return "Aadhaar number is required";
        if (!/^\d{12}$/.test(value.replace(/\s/g, ""))) return "Aadhaar must be 12 digits";
        return "";

      case "panNumber":
        if (!value.trim()) return "PAN number is required";
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value.toUpperCase())) return "Invalid PAN format (e.g., ABCDE1234F)";
        return "";

      case "emergencyContact":
        if (!value.trim()) return "Emergency contact is required";
        if (!/^[6-9]\d{9}$/.test(value.replace(/\s+/g, ""))) return "Please enter a valid contact number";
        return "";

      case "emergencyRelation":
        if (!value.trim()) return "Relationship is required";
        return "";

      case "dateOfBirth":
      case "addressLine":
      case "state":
      case "currentDesignation":
      case "department":
      case "yearsOfRailwayService":
      case "assignedStationName":
      case "assignedStationCode":
      case "railwayZone":
      case "stationCategory":
        if (!value.trim()) return "This field is required";
        return "";

      default:
        return "";
    }
  };

  const capitalizeWords = (str: string) => {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Process value based on field type
    let processedValue = value;
    
    // Convert to uppercase for specific fields
    if (name === 'railwayEmployeeId' || name === 'assignedStationCode' || name === 'panNumber') {
      processedValue = value.toUpperCase();
    }
    
    // Capitalize first letter of each word for specific fields
    if (name === 'name' || name === 'addressLine' || name === 'state' || 
        name === 'currentDesignation' || name === 'department' || 
        name === 'assignedStationName' || name === 'railwayZone' || name === 'railwayDivision' ||
        name === 'emergencyRelation' || name === 'languageProficiency') {
      processedValue = capitalizeWords(value);
    }
    
    setFormData({ ...formData, [name]: processedValue });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }

    // Real-time validation
    const error = validateField(name, processedValue);
    if (error) {
      setErrors({ ...errors, [name]: error });
    }

    if (name === "password" && formData.confirmPassword) {
      const confirmError = validateField("confirmPassword", formData.confirmPassword);
      setErrors({ ...errors, [name]: error, confirmPassword: confirmError });
    }
  };

  // Handler for station selection from autocomplete
  const handleStationSelect = (station: StationData) => {
    setFormData({
      ...formData,
      assignedStationName: station.stationName,
      assignedStationCode: station.stationCode,
      railwayZone: station.railwayZone,
      stationCategory: station.stationCategory,
      platformCount: (station.platformsCount || 0).toString(),
      dailyFootfall: (station.dailyFootfallAvg || 0).toString(),
    });

    // Clear errors for auto-populated fields
    const newErrors = { ...errors };
    delete newErrors.assignedStationName;
    delete newErrors.assignedStationCode;
    delete newErrors.railwayZone;
    delete newErrors.stationCategory;
    delete newErrors.platformCount;
    delete newErrors.dailyFootfall;
    setErrors(newErrors);

    toast.success(`Station details auto-filled for ${station.stationName}`);
  };

  const handleDocumentUpload = async (docType: string, file: File) => {
    if (!file) return;

    // Different validation for photograph vs documents
    if (docType === 'photograph') {
      // Photograph: Only images (JPG, PNG), min 50KB, max 1MB
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedImageTypes.includes(file.type)) {
        toast.error('Photograph must be JPG or PNG format only');
        return;
      }

      // Minimum size: 50KB
      if (file.size < 50 * 1024) {
        toast.error('Photograph size must be at least 50KB for clarity');
        return;
      }

      // Maximum size: 1MB
      if (file.size > 1024 * 1024) {
        toast.error('Photograph size must be less than 1MB');
        return;
      }
    } else {
      // All other documents: Only PDF, max 1MB
      if (file.type !== 'application/pdf') {
        toast.error('Documents must be in PDF format only');
        return;
      }

      // Maximum size: 1MB
      if (file.size > 1024 * 1024) {
        toast.error('PDF file size must be less than 1MB');
        return;
      }
    }

    setUploadingDoc(docType);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', docType);

      const response = await fetch('/api/upload/public', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setDocuments(prev => ({
          ...prev,
          [docType]: data.url
        }));
        toast.success(`${docType.replace(/([A-Z])/g, ' $1').trim()} uploaded successfully`);
      } else {
        toast.error(data.error || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploadingDoc(null);
    }
  };

  const validateStep = (): boolean => {
    const requiredFieldsByStep: { [key: number]: string[] } = {
      1: ["name", "email", "phone", "dateOfBirth", "addressLine", "state", "pinCode", "aadhaarNumber", "panNumber", "emergencyContact", "emergencyRelation", "password", "confirmPassword"],
      2: ["railwayEmployeeId", "currentDesignation", "department", "yearsOfRailwayService"],
      3: ["assignedStationName", "assignedStationCode", "railwayZone", "stationCategory", "platformCount", "dailyFootfall"],
      4: [], // Document uploads
    };

    const fieldsToValidate = requiredFieldsByStep[currentStep] || [];
    const newErrors: { [key: string]: string } = {};
    
    // Validate form fields
    fieldsToValidate.forEach((field) => {
      const error = validateField(field, formData[field as keyof typeof formData] as string);
      if (error) {
        newErrors[field] = error;
      }
    });

    // Validate documents for Step 4
    if (currentStep === 4) {
      const requiredDocs = ['aadhaarCard', 'panCard', 'railwayIdCard', 'photograph'];
      requiredDocs.forEach(doc => {
        if (!documents[doc as keyof typeof documents]) {
          newErrors[doc] = `${doc.replace(/([A-Z])/g, ' $1').trim()} is required`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (validateStep()) {
      setCurrentStep(currentStep + 1);
    } else {
      toast.error(`Please complete all required fields for Step ${currentStep}`);
      // Scroll to first error
      const firstError = document.querySelector('.border-red-500');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handlePrevious = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // CRITICAL: Only process submission when on step 4
    if (currentStep !== 4) {
      return;
    }
    
    if (!validateStep()) {
      toast.error("Please upload all required documents before submitting");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/station-manager-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          ...formData,
          documents
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setLoading(false);
        setSuccess(true);
        toast.success("Application submitted successfully!");
        
        // Wait 3 seconds before redirecting to login
        setTimeout(() => {
          router.push("/auth/login");
        }, 3000);
      } else {
        toast.error(data.error || "Application submission failed");
        setLoading(false);
      }
    } catch (error) {
      console.error("Application error:", error);
      toast.error("Failed to submit application. Please try again.");
      setLoading(false);
    }
  };

  const inputClasses = "w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200";
  const labelClasses = "block text-sm font-semibold text-gray-700 mb-2";
  const totalSteps = 4;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className={labelClasses}>Full Name *</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className={`${inputClasses} ${errors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                />
                {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="dateOfBirth" className={labelClasses}>Date of Birth *</label>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  required
                  className={`${inputClasses} ${errors.dateOfBirth ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors.dateOfBirth && <p className="text-red-600 text-xs mt-1">{errors.dateOfBirth}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className={labelClasses}>Email Address *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={`${inputClasses} ${errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="phone" className={labelClasses}>Phone Number *</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className={`${inputClasses} ${errors.phone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="+91 XXXXX XXXXX"
                  value={formData.phone}
                  onChange={handleChange}
                />
                {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="addressLine" className={labelClasses}>Address Line *</label>
              <input
                id="addressLine"
                name="addressLine"
                type="text"
                required
                className={`${inputClasses} ${errors.addressLine ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                placeholder="Street, Locality, City"
                value={formData.addressLine}
                onChange={handleChange}
              />
              {errors.addressLine && <p className="text-red-600 text-xs mt-1">{errors.addressLine}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="state" className={labelClasses}>State *</label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  required
                  className={`${inputClasses} ${errors.state ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="Enter state"
                  value={formData.state}
                  onChange={handleChange}
                />
                {errors.state && <p className="text-red-600 text-xs mt-1">{errors.state}</p>}
              </div>

              <div>
                <label htmlFor="pinCode" className={labelClasses}>PIN Code *</label>
                <input
                  id="pinCode"
                  name="pinCode"
                  type="text"
                  required
                  className={`${inputClasses} ${errors.pinCode ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="6-digit PIN code"
                  maxLength={6}
                  value={formData.pinCode}
                  onChange={handleChange}
                />
                {errors.pinCode && <p className="text-red-600 text-xs mt-1">{errors.pinCode}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="aadhaarNumber" className={labelClasses}>Aadhaar Number *</label>
                <input
                  id="aadhaarNumber"
                  name="aadhaarNumber"
                  type="text"
                  required
                  className={`${inputClasses} ${errors.aadhaarNumber ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="XXXX XXXX XXXX"
                  maxLength={12}
                  value={formData.aadhaarNumber}
                  onChange={handleChange}
                />
                {errors.aadhaarNumber && <p className="text-red-600 text-xs mt-1">{errors.aadhaarNumber}</p>}
              </div>

              <div>
                <label htmlFor="panNumber" className={labelClasses}>PAN Number *</label>
                <input
                  id="panNumber"
                  name="panNumber"
                  type="text"
                  required
                  className={`${inputClasses} uppercase ${errors.panNumber ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  value={formData.panNumber}
                  onChange={handleChange}
                />
                {errors.panNumber && <p className="text-red-600 text-xs mt-1">{errors.panNumber}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="emergencyContact" className={labelClasses}>Emergency Contact *</label>
                <input
                  id="emergencyContact"
                  name="emergencyContact"
                  type="tel"
                  required
                  className={`${inputClasses} ${errors.emergencyContact ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="+91 XXXXX XXXXX"
                  value={formData.emergencyContact}
                  onChange={handleChange}
                />
                {errors.emergencyContact && <p className="text-red-600 text-xs mt-1">{errors.emergencyContact}</p>}
              </div>

              <div>
                <label htmlFor="emergencyRelation" className={labelClasses}>Relationship *</label>
                <input
                  id="emergencyRelation"
                  name="emergencyRelation"
                  type="text"
                  required
                  className={`${inputClasses} ${errors.emergencyRelation ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="e.g., Spouse, Parent, Sibling"
                  value={formData.emergencyRelation}
                  onChange={handleChange}
                />
                {errors.emergencyRelation && <p className="text-red-600 text-xs mt-1">{errors.emergencyRelation}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className={labelClasses}>Password *</label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className={`${inputClasses} ${errors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                    placeholder="Create a password (min. 8 characters)"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <div
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </div>
                </div>
                {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className={labelClasses}>Confirm Password *</label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    className={`${inputClasses} ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                  <div
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </div>
                </div>
                {errors.confirmPassword && <p className="text-red-600 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="railwayEmployeeId" className={labelClasses}>Railway Employee ID *</label>
                <input
                  id="railwayEmployeeId"
                  name="railwayEmployeeId"
                  type="text"
                  required
                  className={`${inputClasses} uppercase ${errors.railwayEmployeeId ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="e.g., RAIL123456"
                  value={formData.railwayEmployeeId}
                  onChange={handleChange}
                />
                {errors.railwayEmployeeId && <p className="text-red-600 text-xs mt-1">{errors.railwayEmployeeId}</p>}
              </div>

              <div>
                <label htmlFor="currentDesignation" className={labelClasses}>Current Designation *</label>
                <input
                  id="currentDesignation"
                  name="currentDesignation"
                  type="text"
                  required
                  className={`${inputClasses} ${errors.currentDesignation ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="e.g., Assistant Station Manager"
                  value={formData.currentDesignation}
                  onChange={handleChange}
                />
                {errors.currentDesignation && <p className="text-red-600 text-xs mt-1">{errors.currentDesignation}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="department" className={labelClasses}>Department *</label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  required
                  className={`${inputClasses} ${errors.department ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="e.g., Operations"
                  value={formData.department}
                  onChange={handleChange}
                />
                {errors.department && <p className="text-red-600 text-xs mt-1">{errors.department}</p>}
              </div>

              <Select
                id="yearsOfRailwayService"
                name="yearsOfRailwayService"
                label="Years of Railway Service"
                required
                value={formData.yearsOfRailwayService}
                onChange={handleChange}
                options={[
                  { value: '0-2', label: '0-2 years' },
                  { value: '3-5', label: '3-5 years' },
                  { value: '6-10', label: '6-10 years' },
                  { value: '11-15', label: '11-15 years' },
                  { value: '16-20', label: '16-20 years' },
                  { value: '20+', label: '20+ years' },
                ]}
                placeholder="Select years"
                error={!!errors.yearsOfRailwayService}
                errorMessage={errors.yearsOfRailwayService}
              />
            </div>

            <div>
              <label htmlFor="railwayDivision" className={labelClasses}>Railway Division</label>
              <input
                id="railwayDivision"
                name="railwayDivision"
                type="text"
                className={`${inputClasses} ${errors.railwayDivision ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                placeholder="e.g., Chennai Division"
                value={formData.railwayDivision}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-500 mt-1">Optional - Specify your railway division if applicable</p>
              {errors.railwayDivision && <p className="text-red-600 text-xs mt-1">{errors.railwayDivision}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="educationalQualifications" className={labelClasses}>Educational Qualifications</label>
                <input
                  id="educationalQualifications"
                  name="educationalQualifications"
                  type="text"
                  className={`${inputClasses} ${errors.educationalQualifications ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="e.g., B.Tech, MBA"
                  value={formData.educationalQualifications}
                  onChange={handleChange}
                />
                <p className="text-xs text-gray-500 mt-1">Optional - Your highest education level</p>
                {errors.educationalQualifications && <p className="text-red-600 text-xs mt-1">{errors.educationalQualifications}</p>}
              </div>

              <div>
                <label htmlFor="languageProficiency" className={labelClasses}>Languages Known</label>
                <input
                  id="languageProficiency"
                  name="languageProficiency"
                  type="text"
                  className={`${inputClasses} ${errors.languageProficiency ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="e.g., English, Hindi, Tamil"
                  value={formData.languageProficiency}
                  onChange={handleChange}
                />
                <p className="text-xs text-gray-500 mt-1">Optional - Languages you can speak/write</p>
                {errors.languageProficiency && <p className="text-red-600 text-xs mt-1">{errors.languageProficiency}</p>}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-cyan-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-cyan-900 mb-1">Smart Station Search</p>
                  <p className="text-sm text-cyan-800">
                    Search for your station by name or code. Related information will be automatically filled from our database of 60+ major stations. <strong>You can edit any field</strong> if the data needs correction or if your station is not in our database. New stations will be added to our records upon approval.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StationAutocomplete
                id="assignedStationName"
                name="assignedStationName"
                label="Station Name"
                required
                value={formData.assignedStationName}
                onStationSelect={handleStationSelect}
                onInputChange={(value) => {
                  setFormData({ ...formData, assignedStationName: capitalizeWords(value) });
                  if (errors.assignedStationName) {
                    setErrors({ ...errors, assignedStationName: '' });
                  }
                }}
                placeholder="Search your station (e.g., Mumbai CST, New Delhi)"
                error={!!errors.assignedStationName}
                errorMessage={errors.assignedStationName}
              />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="assignedStationCode" className="text-sm font-semibold text-gray-700">
                    Station Code *
                  </label>
                  <InfoTooltip content="Official railway station code | • Format: 2-5 uppercase letters | • Examples: CSMT, NDLS, MAS, HWH | • Auto-filled when you select a station | • Editable if needed" />
                </div>
                <input
                  id="assignedStationCode"
                  name="assignedStationCode"
                  type="text"
                  required
                  className={`${inputClasses} uppercase ${errors.assignedStationCode ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="e.g., MAS, NDLS, HWH"
                  value={formData.assignedStationCode}
                  onChange={handleChange}
                />
                {errors.assignedStationCode && <p className="text-red-600 text-xs mt-1">{errors.assignedStationCode}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="railwayZone" className="text-sm font-semibold text-gray-700">
                    Railway Zone *
                  </label>
                  <InfoTooltip content="Railway zone operating this station | • 17 zones in India | • Examples: Central Railway, Western Railway, Southern Railway | • Auto-filled from database | • Editable for corrections" />
                </div>
                <input
                  id="railwayZone"
                  name="railwayZone"
                  type="text"
                  required
                  className={`${inputClasses} ${errors.railwayZone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="e.g., Central Railway"
                  value={formData.railwayZone}
                  onChange={handleChange}
                />
                {errors.railwayZone && <p className="text-red-600 text-xs mt-1">{errors.railwayZone}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="stationCategory" className="text-sm font-semibold text-gray-700">
                    Station Category *
                  </label>
                  <InfoTooltip 
                    content="Official Indian Railways classification | NSG (Non-Suburban): | • NSG-1: >₹500 Crore revenue | • NSG-2: ₹100-500 Cr | • NSG-3: ₹20-100 Cr | • NSG-4: ₹10-20 Cr | • NSG-5: ₹1-10 Cr | • NSG-6: <₹1 Cr | SG (Suburban): | • SG-1: >₹25 Cr | • SG-2: ₹10-25 Cr | • SG-3: ≤₹10 Cr | HG (Halt): | • HG-1: >₹50 Lakh | • HG-2: ₹5-50 Lakh | • HG-3: ≤₹5 Lakh | Auto-filled but editable" 
                    wide
                  />
                </div>
                <input
                  id="stationCategory"
                  name="stationCategory"
                  type="text"
                  required
                  className={`${inputClasses} ${errors.stationCategory ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="e.g., NSG-1, SG-1, HG-1"
                  value={formData.stationCategory}
                  onChange={handleChange}
                />
                {errors.stationCategory && <p className="text-red-600 text-xs mt-1">{errors.stationCategory}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="platformCount" className="text-sm font-semibold text-gray-700">
                    Number of Platforms *
                  </label>
                  <InfoTooltip content="Total platforms at the station | • Used for train boarding/deboarding | • Range: 1-23 platforms | • Essential for layout planning | • Auto-filled from database | • Editable for recent changes" />
                </div>
                <input
                  id="platformCount"
                  name="platformCount"
                  type="number"
                  min="1"
                  required
                  className={`${inputClasses} ${errors.platformCount ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="e.g., 4"
                  value={formData.platformCount}
                  onChange={handleChange}
                />
                {errors.platformCount && <p className="text-red-600 text-xs mt-1">{errors.platformCount}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="dailyFootfall" className="text-sm font-semibold text-gray-700">
                    Daily Footfall (Average) *
                  </label>
                  <InfoTooltip 
                    content="Average daily passenger count | What's included: | • Commuters (season ticket holders) | • Travelers (reserved/unreserved tickets) | • Weekday & weekend average | Why it matters: | • Estimates vendor business potential | • Plans platform capacity needs | • Determines infrastructure requirements | • Influences vendor approvals | Auto-filled but editable" 
                    wide
                  />
                </div>
                <input
                  id="dailyFootfall"
                  name="dailyFootfall"
                  type="number"
                  min="0"
                  required
                  className={`${inputClasses} ${errors.dailyFootfall ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="e.g., 50000"
                  value={formData.dailyFootfall}
                  onChange={handleChange}
                />
                {errors.dailyFootfall && <p className="text-red-600 text-xs mt-1">{errors.dailyFootfall}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="adminApplicationReason" className={labelClasses}>
                Why do you want to manage this station?
              </label>
              <textarea
                id="adminApplicationReason"
                name="adminApplicationReason"
                rows={5}
                className={`${inputClasses} ${errors.adminApplicationReason ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                placeholder="Explain your vision for managing this station..."
                value={formData.adminApplicationReason}
                onChange={handleChange}
              />
              {errors.adminApplicationReason && <p className="text-red-600 text-xs mt-1">{errors.adminApplicationReason}</p>}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-cyan-900 mb-2">📄 Required Documents</h3>
              <p className="text-sm text-cyan-700">
                Upload the following documents to complete your application. All documents must be clear and readable.
              </p>
              <ul className="text-xs text-cyan-600 mt-2 space-y-1">
                <li>• Documents (Aadhaar, PAN, Railway ID, Certificates): PDF format only, max 1MB</li>
                <li>• Photograph: JPG or PNG format, 50KB - 1MB</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Aadhaar Card */}
              <div className={`border-2 rounded-xl p-4 transition-all ${errors.aadhaarCard ? 'border-red-500 bg-red-50' : documents.aadhaarCard ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                <label className="block font-semibold text-gray-900 mb-2">Aadhaar Card * <span className="text-xs text-gray-500">(PDF only, max 1MB)</span></label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDocumentUpload('aadhaarCard', file);
                  }}
                  disabled={uploadingDoc === 'aadhaarCard'}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                />
                {uploadingDoc === 'aadhaarCard' && (
                  <p className="text-cyan-600 text-xs mt-2">Uploading...</p>
                )}
                {documents.aadhaarCard && (
                  <p className="text-green-600 text-xs mt-2 flex items-center">
                    <CheckIcon size={14} className="mr-1" /> Uploaded successfully
                  </p>
                )}
                {errors.aadhaarCard && <p className="text-red-600 text-xs mt-2">{errors.aadhaarCard}</p>}
              </div>

              {/* PAN Card */}
              <div className={`border-2 rounded-xl p-4 transition-all ${errors.panCard ? 'border-red-500 bg-red-50' : documents.panCard ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                <label className="block font-semibold text-gray-900 mb-2">PAN Card * <span className="text-xs text-gray-500">(PDF only, max 1MB)</span></label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDocumentUpload('panCard', file);
                  }}
                  disabled={uploadingDoc === 'panCard'}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                />
                {uploadingDoc === 'panCard' && (
                  <p className="text-cyan-600 text-xs mt-2">Uploading...</p>
                )}
                {documents.panCard && (
                  <p className="text-green-600 text-xs mt-2 flex items-center">
                    <CheckIcon size={14} className="mr-1" /> Uploaded successfully
                  </p>
                )}
                {errors.panCard && <p className="text-red-600 text-xs mt-2">{errors.panCard}</p>}
              </div>

              {/* Railway ID Card */}
              <div className={`border-2 rounded-xl p-4 transition-all ${errors.railwayIdCard ? 'border-red-500 bg-red-50' : documents.railwayIdCard ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                <label className="block font-semibold text-gray-900 mb-2">Railway ID Card * <span className="text-xs text-gray-500">(PDF only, max 1MB)</span></label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDocumentUpload('railwayIdCard', file);
                  }}
                  disabled={uploadingDoc === 'railwayIdCard'}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                />
                {uploadingDoc === 'railwayIdCard' && (
                  <p className="text-cyan-600 text-xs mt-2">Uploading...</p>
                )}
                {documents.railwayIdCard && (
                  <p className="text-green-600 text-xs mt-2 flex items-center">
                    <CheckIcon size={14} className="mr-1" /> Uploaded successfully
                  </p>
                )}
                {errors.railwayIdCard && <p className="text-red-600 text-xs mt-2">{errors.railwayIdCard}</p>}
              </div>

              {/* Photograph */}
              <div className={`border-2 rounded-xl p-4 transition-all ${errors.photograph ? 'border-red-500 bg-red-50' : documents.photograph ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                <label className="block font-semibold text-gray-900 mb-2">Recent Photograph * <span className="text-xs text-gray-500">(JPG/PNG, 50KB-1MB)</span></label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDocumentUpload('photograph', file);
                  }}
                  disabled={uploadingDoc === 'photograph'}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                />
                {uploadingDoc === 'photograph' && (
                  <p className="text-cyan-600 text-xs mt-2">Uploading...</p>
                )}
                {documents.photograph && (
                  <p className="text-green-600 text-xs mt-2 flex items-center">
                    <CheckIcon size={14} className="mr-1" /> Uploaded successfully
                  </p>
                )}
                {errors.photograph && <p className="text-red-600 text-xs mt-2">{errors.photograph}</p>}
              </div>

              {/* Educational Certificate - Optional */}
              <div className={`border-2 rounded-xl p-4 transition-all ${documents.educationalCertificate ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                <label className="block font-semibold text-gray-900 mb-2">Educational Certificate <span className="text-gray-500 text-xs">(Optional, PDF only, max 1MB)</span></label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDocumentUpload('educationalCertificate', file);
                  }}
                  disabled={uploadingDoc === 'educationalCertificate'}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                />
                {uploadingDoc === 'educationalCertificate' && (
                  <p className="text-cyan-600 text-xs mt-2">Uploading...</p>
                )}
                {documents.educationalCertificate && (
                  <p className="text-green-600 text-xs mt-2 flex items-center">
                    <CheckIcon size={14} className="mr-1" /> Uploaded successfully
                  </p>
                )}
              </div>

              {/* Experience Letter - Optional */}
              <div className={`border-2 rounded-xl p-4 transition-all ${documents.experienceLetter ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                <label className="block font-semibold text-gray-900 mb-2">Experience Letter <span className="text-gray-500 text-xs">(Optional, PDF only, max 1MB)</span></label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDocumentUpload('experienceLetter', file);
                  }}
                  disabled={uploadingDoc === 'experienceLetter'}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                />
                {uploadingDoc === 'experienceLetter' && (
                  <p className="text-cyan-600 text-xs mt-2">Uploading...</p>
                )}
                {documents.experienceLetter && (
                  <p className="text-green-600 text-xs mt-2 flex items-center">
                    <CheckIcon size={14} className="mr-1" /> Uploaded successfully
                  </p>
                )}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-6">
              <div className="flex items-start space-x-3">
                <CheckIcon className="text-green-600 mt-0.5" size={20} />
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">Ready to Submit!</h4>
                  <p className="text-sm text-green-700">
                    Review your information and click submit to complete your station manager application.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Success Animation Overlay */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
              <p className="text-gray-600 mb-4">
                Your station manager application has been successfully submitted. You will be redirected to the login page shortly.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-cyan-600">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Redirecting to login...</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Side - Fixed Info Panel */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-2/5 bg-gradient-to-br from-cyan-600 to-cyan-700 flex-col relative overflow-hidden">
        <div className="flex flex-col h-full p-12 pb-5 overflow-hidden">
          {/* Back Button */}
          <Link 
            href="/" 
            className="w-35 flex items-center space-x-2 text-white/90 hover:text-white mb-8 transition-colors group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:-translate-x-1 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span className="font-medium p-1 rounded-sm">Back to Home</span>
          </Link>

          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <TrainIcon className="text-white" size={32} />
            </div>
            <span className="text-2xl font-bold text-white">VendorVault</span>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-6 text-white leading-tight">Become a Station Manager</h1>
            <p className="text-cyan-100 text-lg mb-10 leading-relaxed">
              Join the team managing railway stations across India. Lead your station's operations and vendor management.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm flex-shrink-0">
                  <CheckIcon className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1 text-white">Manage Station Operations</h3>
                  <p className="text-cyan-100 text-sm">Oversee vendor applications and platform layouts</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm flex-shrink-0">
                  <CheckIcon className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1 text-white">Platform Layout Builder</h3>
                  <p className="text-cyan-100 text-sm">Create and manage detailed platform shop layouts</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm flex-shrink-0">
                  <CheckIcon className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1 text-white">Vendor Management</h3>
                  <p className="text-cyan-100 text-sm">Review and approve vendor applications for your station</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sign In Link at Bottom */}
          <div className="pt-5 border-t border-white/20">
            <p className="text-cyan-100 text-right text-sm">
              Already have an account?{' '}
              <Link 
                href="/auth/login" 
                className="text-white font-semibold hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Scrollable Form */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-cyan-50 h-screen custom-scrollbar">
        <div className="p-8 lg:p-12">
          {/* Mobile Back Button */}
          <Link 
            href="/" 
            className="lg:hidden flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:-translate-x-1 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span className="font-medium">Back to Home</span>
          </Link>

          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Progress Steps */}
              <div className="mb-8">
                <div className="flex items-start justify-between">
                  {[
                    { step: 1, label: 'Personal Info' },
                    { step: 2, label: 'Professional Details' },
                    { step: 3, label: 'Station Info' },
                    { step: 4, label: 'Document Verification' }
                  ].map(({ step, label }, index) => (
                    <div key={step} className="flex items-center" style={{ flex: index < 3 ? 1 : '0 0 auto' }}>
                      <div className="flex flex-col items-center">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold transition-all duration-300 mb-2 ${
                          currentStep >= step 
                            ? 'bg-gradient-to-br from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-200' 
                            : 'bg-white border-2 border-gray-300 text-gray-400'
                        }`}>
                          {currentStep > step ? <CheckIcon size={22} /> : step}
                        </div>
                        <span className={`text-xs font-semibold whitespace-nowrap ${
                          currentStep >= step ? 'text-cyan-600' : 'text-gray-500'
                        }`}>
                          {label}
                        </span>
                      </div>
                      {step < 4 && (
                        <div className="flex-1 h-1 mx-4 bg-gray-200 rounded-full overflow-hidden" style={{ marginTop: '-24px' }}>
                          <div 
                            className={`h-full transition-all duration-500 ease-out rounded-full ${
                              currentStep > step ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 w-full' : 'w-0'
                            }`} 
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {currentStep === 1 && 'Personal Information'}
                  {currentStep === 2 && 'Professional Details'}
                  {currentStep === 3 && 'Station Information'}
                  {currentStep === 4 && 'Document Verification'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Step {currentStep} of {totalSteps} - {currentStep === 4 ? 'Upload required identification documents' : 'Fill in the required information'}
                </p>
              </div>

              {/* Form */}
              <form 
                onSubmit={handleSubmit}
                onKeyDown={(e) => {
                  // Prevent Enter key from submitting the form unless on step 4
                  if (e.key === 'Enter' && currentStep !== 4) {
                    e.preventDefault();
                  }
                }}
              >
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      {renderStep()}
                    </motion.div>
                  )}
                  {currentStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      {renderStep()}
                    </motion.div>
                  )}
                  {currentStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      {renderStep()}
                    </motion.div>
                  )}
                  {currentStep === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      {renderStep()}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={(e) => handlePrevious(e)}
                    disabled={currentStep === 1}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                      currentStep === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Previous
                  </button>

                  <div className="flex items-center space-x-3">
                    {currentStep < totalSteps ? (
                      <button
                        type="button"
                        onClick={(e) => handleNext(e)}
                        className="px-8 py-3 bg-cyan-600 text-white rounded-xl font-semibold hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-200"
                      >
                        Next Step
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {loading && (
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        {loading ? 'Submitting Application...' : 'Submit Application'}
                      </button>
                    )}
                  </div>
                </div>
              </form>

              {/* Mobile Sign In Link */}
              <div className="lg:hidden mt-8 pt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link 
                    href="/auth/login" 
                    className="text-cyan-600 font-semibold hover:underline"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
