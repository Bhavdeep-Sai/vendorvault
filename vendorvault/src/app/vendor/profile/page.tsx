'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { VendorLayout, Alert } from '@/components/vendor';
import { UserIcon, BuildingStorefrontIcon, MapPinIcon, PhoneIcon, EnvelopeIcon, IdentificationIcon, CameraIcon } from '@heroicons/react/24/outline';
import Select from '@/components/ui/Select';
import toast from 'react-hot-toast';

interface VendorProfile {
  // User model fields (personal information)
  name: string;
  email: string;
  phone: string;
  photo: string;
  aadhaarNumber: string;
  panNumber: string;
  dateOfBirth: string;
  streetAddress: string;
  state: string;
  pinCode: string;
  emergencyContact: string;
  emergencyRelation: string;
  
  // Vendor model fields (business information)
  businessName: string;
  gstNumber: string;
  businessType: string;
  customBusinessType?: string;
  profileCompleted: boolean;
}

const businessTypes = [
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'retail', label: 'Retail & Shopping' },
  { value: 'books_media', label: 'Books & Media' },
  { value: 'personal_care', label: 'Personal Care & Hygiene' },
  { value: 'electronics', label: 'Electronics & Accessories' },
  { value: 'services', label: 'Services' },
  { value: 'other', label: 'Other' },
];

export default function VendorProfilePage() {
  const { } = useAuth();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/vendor/profile', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        const address = data.user?.address || '';
        
        // Parse address: "Street, State - PIN" or "Street, City, State - PIN"
        let streetAddress = '';
        let state = '';
        let pinCode = '';
        
        if (address) {
          // Split by ' - ' to separate PIN code
          const parts = address.split(' - ');
          pinCode = parts[parts.length - 1] || '';
          
          // Everything before ' - ' is the address part
          const addressBeforePin = parts.slice(0, -1).join(' - ');
          
          // Split remaining address by commas
          const addressParts = addressBeforePin.split(', ');
          
          if (addressParts.length >= 2) {
            // Last part before PIN is the state
            state = addressParts[addressParts.length - 1].trim();
            // Everything else is street address
            streetAddress = addressParts.slice(0, -1).join(', ').trim();
          } else {
            streetAddress = addressBeforePin;
          }
        }
        
        const normalizedProfile: VendorProfile = {
          // User fields
          name: data.user?.name || '',
          email: data.user?.email || '',
          phone: data.user?.phone || '',
          photo: data.user?.photo || '',
          aadhaarNumber: data.user?.aadhaarNumber || '',
          panNumber: data.user?.panNumber || '',
          dateOfBirth: data.user?.dateOfBirth || '',
          streetAddress,
          state,
          pinCode,
          emergencyContact: data.user?.emergencyContact || '',
          emergencyRelation: data.user?.emergencyRelation || '',
          
          // Vendor fields
          businessName: data.vendor?.businessName || '',
          gstNumber: data.vendor?.gstNumber || '',
          businessType: data.vendor?.businessType || '',
          customBusinessType: data.vendor?.customBusinessType || '',
          profileCompleted: data.vendor?.profileCompleted || false,
        };
        setProfile(normalizedProfile);
        setPhotoPreview(data.user?.photo || '');
        
        // Auto-enter edit mode if profile is incomplete
        if (!normalizedProfile.name || !normalizedProfile.businessName) {
          setIsEditMode(true);
        }
      } else {
        console.error('Failed to fetch profile');
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (formData: VendorProfile): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    // User field validations
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?\d{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.aadhaarNumber.trim()) {
      newErrors.aadhaarNumber = 'Aadhaar number is required';
    } else if (!/^\d{12}$/.test(formData.aadhaarNumber.replace(/\s/g, ''))) {
      newErrors.aadhaarNumber = 'Aadhaar number must be 12 digits';
    }

    if (!formData.panNumber.trim()) {
      newErrors.panNumber = 'PAN number is required';
    } else if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(formData.panNumber.toUpperCase())) {
      newErrors.panNumber = 'Invalid PAN format (e.g., ABCDE1234F)';
    }

    if (!formData.dateOfBirth.trim()) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }

    if (!formData.streetAddress.trim()) {
      newErrors.streetAddress = 'Street address is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    if (!formData.pinCode.trim()) {
      newErrors.pinCode = 'PIN code is required';
    } else if (!/^\d{6}$/.test(formData.pinCode)) {
      newErrors.pinCode = 'PIN code must be 6 digits';
    }

    if (!formData.emergencyContact.trim()) {
      newErrors.emergencyContact = 'Emergency contact is required';
    }

    if (!formData.emergencyRelation.trim()) {
      newErrors.emergencyRelation = 'Emergency contact relation is required';
    }

    // Vendor field validations
    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (!formData.businessType) {
      newErrors.businessType = 'Business type is required';
    }

    if (formData.businessType === 'other' && !formData.customBusinessType?.trim()) {
      newErrors.customBusinessType = 'Please specify your business type';
    }

    return newErrors;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'vendor-photos');

      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        // Update local state
        setProfile(prev => prev ? { ...prev, photo: data.url } : null);
        setPhotoPreview(data.url);
        
        // Save photo to database immediately
        const saveRes = await fetch('/api/vendor/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            ...profile,
            photo: data.url,
          }),
        });

        if (saveRes.ok) {
          toast.success('Photo uploaded and saved successfully');
        } else {
          toast.error('Photo uploaded but failed to save to profile');
        }
      } else {
        toast.error(data.error || 'Failed to upload photo');
      }
    } catch (error) {
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) return;

    const formErrors = validateForm(profile);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      toast.error('Please fix the errors in the form');
      return;
    }

    setSaving(true);
    try {
      // Combine address parts
      const combinedAddress = `${profile.streetAddress}, ${profile.state} - ${profile.pinCode}`;
      
      const res = await fetch('/api/vendor/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          ...profile,
          address: combinedAddress,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Profile updated successfully');
        setIsEditMode(false);
        fetchProfile(); // Refresh profile data
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof VendorProfile, value: string) => {
    if (!profile) return;
    
    setProfile({ ...profile, [field]: value });
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorLayout title="Profile">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </VendorLayout>
      </ProtectedRoute>
    );
  }

  if (!profile) {
    return (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorLayout title="Profile">
          <Alert
            type="error"
            title="Profile Not Found"
            message="Unable to load your profile. Please try refreshing the page."
          />
        </VendorLayout>
      </ProtectedRoute>
    );
  }

  // Check if all required fields are filled
  const isProfileComplete = !!(
    profile.name?.trim() &&
    profile.phone?.trim() &&
    profile.email?.trim() &&
    profile.aadhaarNumber?.trim() &&
    profile.panNumber?.trim() &&
    profile.dateOfBirth?.trim() &&
    profile.streetAddress?.trim() &&
    profile.state?.trim() &&
    profile.pinCode?.trim() &&
    profile.emergencyContact?.trim() &&
    profile.emergencyRelation?.trim() &&
    profile.businessName?.trim() &&
    profile.businessType?.trim() &&
    (profile.businessType !== 'other' || profile.customBusinessType?.trim())
  );

  // View Mode Component
  if (!isEditMode && profile) {
    return (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorLayout 
          title="Profile"
          subtitle="Your personal and business information"
        >
          <div className="max-w-4xl mx-auto">
            {!isProfileComplete && (
              <Alert
                type="info"
                title="Complete Your Profile"
                message="Please fill in all required fields to apply for shop licenses."
                className="mb-6"
              />
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                  <p className="text-sm text-gray-600 mt-1">View your complete profile</p>
                </div>
                <button
                  onClick={() => setIsEditMode(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
              </div>

              <div className="p-6 space-y-8">
                {/* Profile Photo */}
                <div className="flex justify-center">
                  <div className="relative">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-4 border-blue-100 shadow-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-4 border-blue-100 shadow-lg">
                        <UserIcon className="w-16 h-16 text-blue-600" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <UserIcon className="w-5 h-5 text-blue-600 mr-2" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Full Name</label>
                      <p className="text-gray-900 font-medium mt-1">{profile.name || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone Number</label>
                      <p className="text-gray-900 font-medium mt-1">{profile.phone || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email Address</label>
                      <p className="text-gray-900 font-medium mt-1">{profile.email || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                      <p className="text-gray-900 font-medium mt-1">{profile.dateOfBirth || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Aadhaar Number</label>
                      <p className="text-gray-900 font-medium mt-1">{profile.aadhaarNumber || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">PAN Number</label>
                      <p className="text-gray-900 font-medium mt-1">{profile.panNumber || '-'}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="text-sm font-medium text-gray-500">Address</label>
                    <p className="text-gray-900 font-medium mt-1">
                      {profile.streetAddress && profile.state && profile.pinCode
                        ? `${profile.streetAddress}, ${profile.state} - ${profile.pinCode}`
                        : '-'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Emergency Contact</label>
                      <p className="text-gray-900 font-medium mt-1">{profile.emergencyContact || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Relation</label>
                      <p className="text-gray-900 font-medium mt-1">{profile.emergencyRelation || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Business Information */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <BuildingStorefrontIcon className="w-5 h-5 text-blue-600 mr-2" />
                    Business Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Business Name</label>
                      <p className="text-gray-900 font-medium mt-1">{profile.businessName || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Business Type</label>
                      <p className="text-gray-900 font-medium mt-1">
                        {businessTypes.find(t => t.value === profile.businessType)?.label || profile.customBusinessType || '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">GST Number</label>
                      <p className="text-gray-900 font-medium mt-1">{profile.gstNumber || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </VendorLayout>
      </ProtectedRoute>
    );
  }

  // Edit Mode (existing form)
  return (
    <ProtectedRoute allowedRoles={['VENDOR']}>
      <VendorLayout 
        title="Profile Settings"
        subtitle="Manage your personal and business information"
      >
        <div className="max-w-4xl mx-auto">
          {!isProfileComplete && (
            <Alert
              type="info"
              title="Complete Your Profile"
              message="Please fill in all required fields to apply for shop licenses."
              className="mb-6"
            />
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <UserIcon className="w-6 h-6 text-blue-600 mr-3" />
                  Edit Profile
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Update your personal and business information
                </p>
              </div>
              <button
                onClick={() => setIsEditMode(false)}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* Profile Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Profile Photo
                </label>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Profile Preview"
                        className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-4 border-blue-100">
                        <UserIcon className="w-12 h-12 text-blue-600" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 inline-flex items-center gap-2">
                      <CameraIcon className="w-5 h-5" />
                      {uploading ? 'Uploading...' : 'Upload Photo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                    <p className="text-sm text-gray-500 mt-2">JPG, PNG or GIF. Max size 5MB</p>
                  </div>
                </div>
              </div>

              {/* Personal Information Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <UserIcon className="w-5 h-5 text-blue-600 mr-2" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      <UserIcon className="w-4 h-4 inline mr-1" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={profile.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your full name"
                    />
                    {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      <PhoneIcon className="w-4 h-4 inline mr-1" />
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.phone ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="+91 XXXXX XXXXX"
                    />
                    {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      <EnvelopeIcon className="w-4 h-4 inline mr-1" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={profile.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="your.email@example.com"
                    />
                    {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      id="dateOfBirth"
                      value={profile.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.dateOfBirth ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.dateOfBirth && <p className="text-red-600 text-sm mt-1">{errors.dateOfBirth}</p>}
                  </div>

                  <div>
                    <label htmlFor="aadhaarNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      <IdentificationIcon className="w-4 h-4 inline mr-1" />
                      Aadhaar Number *
                    </label>
                    <input
                      type="text"
                      id="aadhaarNumber"
                      value={profile.aadhaarNumber}
                      onChange={(e) => handleInputChange('aadhaarNumber', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.aadhaarNumber ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="1234 5678 9012"
                      maxLength={14}
                    />
                    {errors.aadhaarNumber && <p className="text-red-600 text-sm mt-1">{errors.aadhaarNumber}</p>}
                  </div>

                  <div>
                    <label htmlFor="panNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      <IdentificationIcon className="w-4 h-4 inline mr-1" />
                      PAN Number *
                    </label>
                    <input
                      type="text"
                      id="panNumber"
                      value={profile.panNumber}
                      onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.panNumber ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                    />
                    {errors.panNumber && <p className="text-red-600 text-sm mt-1">{errors.panNumber}</p>}
                  </div>
                </div>

                {/* Split Address Fields */}
                <div className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPinIcon className="w-4 h-4 inline mr-1" />
                      Street Address *
                    </label>
                    <input
                      type="text"
                      id="streetAddress"
                      value={profile.streetAddress}
                      onChange={(e) => handleInputChange('streetAddress', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.streetAddress ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="House No., Street, Locality"
                    />
                    {errors.streetAddress && <p className="text-red-600 text-sm mt-1">{errors.streetAddress}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        id="state"
                        value={profile.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.state ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="State"
                      />
                      {errors.state && <p className="text-red-600 text-sm mt-1">{errors.state}</p>}
                    </div>

                    <div>
                      <label htmlFor="pinCode" className="block text-sm font-medium text-gray-700 mb-2">
                        PIN Code *
                      </label>
                      <input
                        type="text"
                        id="pinCode"
                        value={profile.pinCode}
                        onChange={(e) => handleInputChange('pinCode', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.pinCode ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="123456"
                        maxLength={6}
                      />
                      {errors.pinCode && <p className="text-red-600 text-sm mt-1">{errors.pinCode}</p>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-2">
                      <PhoneIcon className="w-4 h-4 inline mr-1" />
                      Emergency Contact *
                    </label>
                    <input
                      type="tel"
                      id="emergencyContact"
                      value={profile.emergencyContact}
                      onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.emergencyContact ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="+91 XXXXX XXXXX"
                    />
                    {errors.emergencyContact && <p className="text-red-600 text-sm mt-1">{errors.emergencyContact}</p>}
                  </div>

                  <div>
                    <label htmlFor="emergencyRelation" className="block text-sm font-medium text-gray-700 mb-2">
                      Relation *
                    </label>
                    <input
                      type="text"
                      id="emergencyRelation"
                      value={profile.emergencyRelation}
                      onChange={(e) => handleInputChange('emergencyRelation', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.emergencyRelation ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Father, Mother, Spouse"
                    />
                    {errors.emergencyRelation && <p className="text-red-600 text-sm mt-1">{errors.emergencyRelation}</p>}
                  </div>
                </div>
              </div>

              {/* Business Information Section */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BuildingStorefrontIcon className="w-5 h-5 text-blue-600 mr-2" />
                  Business Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                      <BuildingStorefrontIcon className="w-4 h-4 inline mr-1" />
                      Business Name *
                    </label>
                    <input
                      type="text"
                      id="businessName"
                      value={profile.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.businessName ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your business name"
                    />
                    {errors.businessName && <p className="text-red-600 text-sm mt-1">{errors.businessName}</p>}
                  </div>

                  <div>
                    <label htmlFor="gstNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      <IdentificationIcon className="w-4 h-4 inline mr-1" />
                      GST Number (Optional)
                    </label>
                    <input
                      type="text"
                      id="gstNumber"
                      value={profile.gstNumber || ''}
                      onChange={(e) => handleInputChange('gstNumber', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="22AAAAA0000A1Z5"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <Select
                    id="businessType"
                    name="businessType"
                    label="Business Type"
                    required
                    value={profile.businessType}
                    onChange={(e) => handleInputChange('businessType', e.target.value)}
                    options={businessTypes}
                    error={!!errors.businessType}
                    errorMessage={errors.businessType}
                  />
                </div>

                {/* Custom Business Type Input */}
                {profile.businessType === 'other' && (
                  <div className="mt-6">
                    <label htmlFor="customBusinessType" className="block text-sm font-medium text-gray-700 mb-2">
                      Specify Business Type *
                    </label>
                    <input
                      type="text"
                      id="customBusinessType"
                      value={profile.customBusinessType || ''}
                      onChange={(e) => handleInputChange('customBusinessType', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.customBusinessType ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your business type"
                    />
                    {errors.customBusinessType && <p className="text-red-600 text-sm mt-1">{errors.customBusinessType}</p>}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  className="px-8 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </VendorLayout>
    </ProtectedRoute>
  );
}
