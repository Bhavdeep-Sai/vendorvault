'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { TrainIcon, CheckIcon } from '@/components/Icons';
import { motion, AnimatePresence } from 'framer-motion';
import Select from '@/components/ui/Select';

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Information
    name: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    addressLine: '',
    state: '',
    pinCode: '',
    aadhaarNumber: '',
    panNumber: '',
    
    // Business Information
    businessName: '',
    businessType: '',
    customBusinessType: '',
    ownerName: '',
    gstNumber: '',
    businessAddress: '',
    
    // Contact & Emergency
    emergencyContact: '',
    emergencyRelation: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { register } = useAuth();

  const totalSteps = 3;

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/[^\d]/g, ''));
  };

  const validateAadhaar = (aadhaar: string) => {
    const aadhaarRegex = /^\d{12}$/;
    return aadhaarRegex.test(aadhaar.replace(/\s/g, ''));
  };

  const validatePAN = (pan: string) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const validateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }
    return age >= 18;
  };

  const validateGST = (gst: string) => {
    if (!gst) return true; // Optional field
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst.toUpperCase());
  };

  const validatePinCode = (pin: string) => {
    const pinRegex = /^\d{6}$/;
    return pinRegex.test(pin);
  };

  const capitalizeWords = (str: string) => {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Convert PAN number to uppercase
    let processedValue = name === 'panNumber' ? value.toUpperCase() : value;
    // Capitalize first letter of each word for name, businessName, addressLine, and state
    if (name === 'name' || name === 'businessName' || name === 'addressLine' || name === 'state') {
      processedValue = capitalizeWords(value);
    }
    setFormData({ ...formData, [name]: processedValue });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }

    // Real-time validation
    let error = '';
    switch (name) {
      case 'email':
        if (value && !validateEmail(value)) error = 'Invalid email format';
        break;
      case 'phone':
      case 'emergencyContact':
        if (value && !validatePhone(value)) error = 'Invalid phone number (10 digits)';
        break;
      case 'aadhaarNumber':
        if (value && !validateAadhaar(value)) error = 'Aadhaar must be 12 digits';
        break;
      case 'panNumber':
        if (value && !validatePAN(value)) error = 'Invalid PAN format (e.g., ABCDE1234F)';
        break;
      case 'password':
        if (value && !validatePassword(value)) error = 'Password must be at least 6 characters';
        break;
      case 'confirmPassword':
        if (value && value !== formData.password) error = 'Passwords do not match';
        break;
      case 'dateOfBirth':
        if (value && !validateAge(value)) error = 'You must be at least 18 years old';
        break;
      case 'gstNumber':
        if (value && !validateGST(value)) error = 'Invalid GST format';
        break;
      case 'pinCode':
        if (value && !validatePinCode(value)) error = 'PIN code must be 6 digits';
        break;
    }
    
    if (error) {
      setErrors({ ...errors, [name]: error });
    }
  };

  const handleNext = () => {
    // Validate current step before proceeding
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.name) newErrors.name = 'Name is required';
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
      else if (!validateAge(formData.dateOfBirth)) newErrors.dateOfBirth = 'You must be at least 18 years old';
      if (!formData.email) newErrors.email = 'Email is required';
      else if (!validateEmail(formData.email)) newErrors.email = 'Invalid email format';
      if (!formData.phone) newErrors.phone = 'Phone number is required';
      else if (!validatePhone(formData.phone)) newErrors.phone = 'Invalid phone number';
      if (!formData.aadhaarNumber) newErrors.aadhaarNumber = 'Aadhaar number is required';
      else if (!validateAadhaar(formData.aadhaarNumber)) newErrors.aadhaarNumber = 'Aadhaar must be 12 digits';
      if (!formData.panNumber) newErrors.panNumber = 'PAN number is required';
      else if (!validatePAN(formData.panNumber)) newErrors.panNumber = 'Invalid PAN format';
      if (!formData.addressLine) newErrors.addressLine = 'Address line is required';
      if (!formData.state) newErrors.state = 'State is required';
      if (!formData.pinCode) newErrors.pinCode = 'PIN code is required';
      else if (!validatePinCode(formData.pinCode)) newErrors.pinCode = 'PIN code must be 6 digits';
      if (!formData.password) newErrors.password = 'Password is required';
      else if (!validatePassword(formData.password)) newErrors.password = 'Password must be at least 6 characters';
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm password';
      else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    } else if (currentStep === 2) {
      if (!formData.businessName) newErrors.businessName = 'Business name is required';
      if (formData.businessType === 'other' && !formData.customBusinessType) {
        newErrors.customBusinessType = 'Please specify your business type';
      }
      if (formData.gstNumber && !validateGST(formData.gstNumber)) newErrors.gstNumber = 'Invalid GST format';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation for step 3
    const newErrors: Record<string, string> = {};
    if (!formData.emergencyContact) newErrors.emergencyContact = 'Emergency contact is required';
    else if (!validatePhone(formData.emergencyContact)) newErrors.emergencyContact = 'Invalid phone number';
    if (!formData.emergencyRelation) newErrors.emergencyRelation = 'Relationship is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: 'VENDOR',
        dateOfBirth: formData.dateOfBirth,
        addressLine: formData.addressLine,
        state: formData.state,
        pinCode: formData.pinCode,
        aadhaarNumber: formData.aadhaarNumber,
        panNumber: formData.panNumber,
        emergencyContact: formData.emergencyContact,
        emergencyRelation: formData.emergencyRelation,
        vendorData: {
          businessName: formData.businessName,
          businessType: formData.businessType === 'other' && formData.customBusinessType 
            ? formData.customBusinessType 
            : formData.businessType,
          ownerName: formData.ownerName || formData.name,
          gstNumber: formData.gstNumber,
          businessAddress: formData.businessAddress,
          email: formData.email,
          contactNumber: formData.phone,
        },
      });
    } catch (error) {
      setLoading(false);
    }
  };

  const inputClasses = "w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200";
  const labelClasses = "block text-sm font-semibold text-gray-700 mb-2";

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Side - Fixed Info Panel */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-2/5 bg-gradient-to-br from-cyan-600 to-cyan-700 flex-col relative overflow-hidden">
        <div className="flex flex-col h-full p-12 pb-5 overflow-hidden">
          {/* Back Button */}
          <Link 
            href="/" 
            className="w-35 flex items-center space-x-2 text-white/90 hover:text-white  mb-8 transition-colors group"
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
            <h1 className="text-4xl font-bold mb-6 text-white leading-tight">Start Your Journey with VendorVault</h1>
            <p className="text-cyan-100 text-lg mb-10 leading-relaxed">
              Join thousands of vendors successfully operating at railway stations across India. Get your digital license in minutes.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm flex-shrink-0">
                  <CheckIcon className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1 text-white">Quick Approval Process</h3>
                  <p className="text-cyan-100 text-sm">Get approved within 48-72 hours of submission</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm flex-shrink-0">
                  <CheckIcon className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1 text-white">Digital License</h3>
                  <p className="text-cyan-100 text-sm">QR-verified digital license accessible anytime</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm flex-shrink-0">
                  <CheckIcon className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1 text-white">Hassle-Free Renewals</h3>
                  <p className="text-cyan-100 text-sm">Easy renewal process with automated reminders</p>
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
                    { step: 2, label: 'Business Details' },
                    { step: 3, label: 'Emergency Contact' }
                  ].map(({ step, label }, index) => (
                    <div key={step} className="flex items-center" style={{ flex: index < 2 ? 1 : '0 0 auto' }}>
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
                      {step < 3 && (
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
                  {currentStep === 2 && 'Business Details'}
                  {currentStep === 3 && 'Emergency Contact'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Step {currentStep} of {totalSteps} - Fill in the required information
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <AnimatePresence mode="wait">
                  {/* Step 1: Personal Information */}
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="name" className={labelClasses}>
                            Full Name *
                          </label>
                          <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            className={`${inputClasses} ${errors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                            placeholder="Enter your full name"
                          />
                          {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
                        </div>

                        <div>
                          <label htmlFor="dateOfBirth" className={labelClasses}>
                            Date of Birth *
                          </label>
                          <input
                            id="dateOfBirth"
                            name="dateOfBirth"
                            type="date"
                            required
                            value={formData.dateOfBirth}
                            onChange={handleChange}
                            className={`${inputClasses} ${errors.dateOfBirth ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                            max={new Date().toISOString().split('T')[0]}
                          />
                          {errors.dateOfBirth && <p className="text-red-600 text-xs mt-1">{errors.dateOfBirth}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="email" className={labelClasses}>
                            Email Address *
                          </label>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className={`${inputClasses} ${errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                            placeholder="you@example.com"
                          />
                          {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
                        </div>

                        <div>
                          <label htmlFor="phone" className={labelClasses}>
                            Phone Number *
                          </label>
                          <input
                            id="phone"
                            name="phone"
                            type="tel"
                            required
                            value={formData.phone}
                            onChange={handleChange}
                            className={`${inputClasses} ${errors.phone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                            placeholder="+91 XXXXX XXXXX"
                          />
                          {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="aadhaarNumber" className={labelClasses}>
                            Aadhaar Number *
                          </label>
                          <input
                            id="aadhaarNumber"
                            name="aadhaarNumber"
                            type="text"
                            required
                            value={formData.aadhaarNumber}
                            onChange={handleChange}
                            className={`${inputClasses} ${errors.aadhaarNumber ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                            placeholder="XXXX XXXX XXXX"
                            maxLength={12}
                          />
                          {errors.aadhaarNumber && <p className="text-red-600 text-xs mt-1">{errors.aadhaarNumber}</p>}
                        </div>

                        <div>
                          <label htmlFor="panNumber" className={labelClasses}>
                            PAN Number *
                          </label>
                          <input
                            id="panNumber"
                            name="panNumber"
                            type="text"
                            required
                            value={formData.panNumber}
                            onChange={handleChange}
                            className={`${inputClasses} uppercase ${errors.panNumber ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                            placeholder="ABCDE1234F"
                            maxLength={10}
                          />
                          {errors.panNumber && <p className="text-red-600 text-xs mt-1">{errors.panNumber}</p>}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="addressLine" className={labelClasses}>
                          Address Line *
                        </label>
                        <input
                          id="addressLine"
                          name="addressLine"
                          type="text"
                          required
                          value={formData.addressLine}
                          onChange={handleChange}
                          className={`${inputClasses} ${errors.addressLine ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                          placeholder="Street, Locality, City"
                        />
                        {errors.addressLine && <p className="text-red-600 text-xs mt-1">{errors.addressLine}</p>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="state" className={labelClasses}>
                            State *
                          </label>
                          <input
                            id="state"
                            name="state"
                            type="text"
                            required
                            value={formData.state}
                            onChange={handleChange}
                            className={`${inputClasses} ${errors.state ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                            placeholder="Enter state"
                          />
                          {errors.state && <p className="text-red-600 text-xs mt-1">{errors.state}</p>}
                        </div>

                        <div>
                          <label htmlFor="pinCode" className={labelClasses}>
                            PIN Code *
                          </label>
                          <input
                            id="pinCode"
                            name="pinCode"
                            type="text"
                            required
                            value={formData.pinCode}
                            onChange={handleChange}
                            className={`${inputClasses} ${errors.pinCode ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                            placeholder="6-digit PIN code"
                            maxLength={6}
                          />
                          {errors.pinCode && <p className="text-red-600 text-xs mt-1">{errors.pinCode}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="password" className={labelClasses}>
                            Password *
                          </label>
                          <div className="relative">
                            <input
                              id="password"
                              name="password"
                              type={showPassword ? "text" : "password"}
                              required
                              value={formData.password}
                              onChange={handleChange}
                              className={`${inputClasses} ${errors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                              placeholder="Create a password"
                              minLength={6}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
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
                            </button>
                          </div>
                          {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
                        </div>

                        <div>
                          <label htmlFor="confirmPassword" className={labelClasses}>
                            Confirm Password *
                          </label>
                          <div className="relative">
                            <input
                              id="confirmPassword"
                              name="confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              required
                              value={formData.confirmPassword}
                              onChange={handleChange}
                              className={`${inputClasses} ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                              placeholder="Confirm your password"
                              minLength={6}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
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
                            </button>
                          </div>
                          {errors.confirmPassword && <p className="text-red-600 text-xs mt-1">{errors.confirmPassword}</p>}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Business Information */}
                  {currentStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div>
                        <label htmlFor="businessName" className={labelClasses}>
                          Business Name *
                        </label>
                        <input
                          id="businessName"
                          name="businessName"
                          type="text"
                          required
                          value={formData.businessName}
                          onChange={handleChange}
                          className={`${inputClasses} ${errors.businessName ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                          placeholder="Enter your business name"
                        />
                        {errors.businessName && <p className="text-red-600 text-xs mt-1">{errors.businessName}</p>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="ownerName" className={labelClasses}>
                            Owner Name
                          </label>
                          <input
                            id="ownerName"
                            name="ownerName"
                            type="text"
                            value={formData.ownerName || formData.name}
                            onChange={handleChange}
                            className={inputClasses}
                            placeholder={formData.name || "Business owner name"}
                          />
                        </div>

                        <Select
                          id="businessType"
                          name="businessType"
                          label="Business Type"
                          required
                          value={formData.businessType}
                          onChange={handleChange}
                          options={[
                            { value: 'food_beverage', label: 'Food & Beverage' },
                            { value: 'retail', label: 'Retail & Shopping' },
                            { value: 'books_media', label: 'Books & Media' },
                            { value: 'personal_care', label: 'Personal Care & Hygiene' },
                            { value: 'electronics', label: 'Electronics & Accessories' },
                            { value: 'services', label: 'Services' },
                            { value: 'other', label: 'Other' },
                          ]}
                          placeholder="Select business type"
                        />
                      </div>

                      {formData.businessType === 'other' && (
                        <div>
                          <label htmlFor="customBusinessType" className={labelClasses}>
                            Specify Business Type *
                          </label>
                          <input
                            id="customBusinessType"
                            name="customBusinessType"
                            type="text"
                            required
                            value={formData.customBusinessType}
                            onChange={handleChange}
                            className={`${inputClasses} ${errors.customBusinessType ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                            placeholder="Enter your business type"
                          />
                          {errors.customBusinessType && <p className="text-red-600 text-xs mt-1">{errors.customBusinessType}</p>}
                        </div>
                      )}

                      <div>
                        <label htmlFor="gstNumber" className={labelClasses}>
                          GST Number (Optional)
                        </label>
                        <input
                          id="gstNumber"
                          name="gstNumber"
                          type="text"
                          value={formData.gstNumber}
                          onChange={handleChange}
                          className={`${inputClasses} ${errors.gstNumber ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                          placeholder="22AAAAA0000A1Z5"
                          maxLength={15}
                        />
                        {errors.gstNumber ? (
                          <p className="text-red-600 text-xs mt-1">{errors.gstNumber}</p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1">Leave blank if not registered</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="businessAddress" className={labelClasses}>
                          Business Address
                        </label>
                        <textarea
                          id="businessAddress"
                          name="businessAddress"
                          value={formData.businessAddress}
                          onChange={handleChange}
                          className={`${inputClasses} ${errors.businessAddress ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                          placeholder="Enter your business address (optional)"
                          rows={3}
                        />
                        {errors.businessAddress && <p className="text-red-600 text-xs mt-1">{errors.businessAddress}</p>}
                      </div>

                      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
                        <p className="text-sm text-cyan-900">
                          <strong>Note:</strong> Station selection and shop location will be assigned after your application is approved by the station manager.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Emergency Contact */}
                  {currentStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                        <h3 className="font-semibold text-gray-900 mb-2">Emergency Contact Information</h3>
                        <p className="text-sm text-gray-600">
                          Provide details of a person we can contact in case of an emergency
                        </p>
                      </div>

                      <div>
                        <label htmlFor="emergencyContact" className={labelClasses}>
                          Emergency Contact Number *
                        </label>
                        <input
                          id="emergencyContact"
                          name="emergencyContact"
                          type="tel"
                          required
                          value={formData.emergencyContact}
                          onChange={handleChange}
                          className={`${inputClasses} ${errors.emergencyContact ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                          placeholder="+91 XXXXX XXXXX"
                        />
                        {errors.emergencyContact && <p className="text-red-600 text-xs mt-1">{errors.emergencyContact}</p>}
                      </div>

                      <div>
                        <label htmlFor="emergencyRelation" className={labelClasses}>
                          Relationship *
                        </label>
                        <input
                          id="emergencyRelation"
                          name="emergencyRelation"
                          type="text"
                          required
                          value={formData.emergencyRelation}
                          onChange={handleChange}
                          className={`${inputClasses} ${errors.emergencyRelation ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                          placeholder="e.g., Spouse, Parent, Sibling"
                        />
                        {errors.emergencyRelation && <p className="text-red-600 text-xs mt-1">{errors.emergencyRelation}</p>}
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-6">
                        <div className="flex items-start space-x-3">
                          <CheckIcon className="text-green-600 mt-0.5" size={20} />
                          <div>
                            <h4 className="font-semibold text-green-900 mb-1">Ready to Submit!</h4>
                            <p className="text-sm text-green-700">
                              Review your information and click submit to complete your vendor license application.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handlePrevious}
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
                        onClick={handleNext}
                        className="px-8 py-3 bg-cyan-600 text-white rounded-xl font-semibold hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-200"
                      >
                        Next Step
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Submitting...' : 'Submit Application'}
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


