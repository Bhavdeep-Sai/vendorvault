'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { 
  CameraIcon,
  QrCodeIcon,
  SearchIcon,
  CloseIcon
} from '@/components/Icons';
import toast from 'react-hot-toast';

export default function ScanLicense() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [manualLicense, setManualLicense] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setScanning(true);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast.error('Unable to access camera. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setScanning(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        toast.error('QR code scanning requires an external library. Please enter license number manually.');
      }
    }
  };

  const handleManualVerify = () => {
    if (!manualLicense.trim()) {
      toast.error('Please enter a license number');
      return;
    }
    router.push(`/verify/${manualLicense.trim()}`);
  };

  return (
    <ProtectedRoute allowedRoles={['INSPECTOR', 'STATION_MANAGER']}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <QrCodeIcon className="text-white" size={32} />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    License Scanner
                  </h1>
                  <p className="text-gray-600 text-sm sm:text-base mt-1">
                    Verify vendor licenses instantly
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.back()}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">Back</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="bg-white rounded-xl shadow-sm p-2 flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setActiveTab('camera');
                  if (scanning) stopCamera();
                }}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'camera'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CameraIcon size={20} />
                <span>QR Scan</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('manual');
                  if (scanning) stopCamera();
                }}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'manual'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <SearchIcon size={20} />
                <span>Manual</span>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Scanner/Entry Area */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                {activeTab === 'camera' ? (
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <CameraIcon size={24} className="text-blue-600" />
                        QR Code Scanner
                      </h2>
                      {scanning && (
                        <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                          Active
                        </span>
                      )}
                    </div>

                    {!scanning ? (
                      <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-6">
                          <CameraIcon className="text-blue-600" size={48} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Ready to Scan
                        </h3>
                        <p className="text-gray-600 mb-8 max-w-md mx-auto">
                          Click the button below to activate your camera and scan a vendor&apos;s QR code
                        </p>
                        <button
                          onClick={startCamera}
                          className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          <CameraIcon size={24} />
                          <span>Start Camera</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full aspect-video object-cover"
                          />
                          {/* Scanning overlay */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="relative w-64 h-64">
                              <div className="absolute inset-0 border-4 border-blue-500 rounded-2xl"></div>
                              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl"></div>
                              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl"></div>
                              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl"></div>
                              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl"></div>
                              {/* Scanning line animation */}
                              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={captureImage}
                            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold transition-all shadow-lg"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Capture & Scan</span>
                          </button>
                          <button
                            onClick={stopCamera}
                            className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-4 rounded-xl hover:from-red-700 hover:to-rose-700 font-semibold transition-all shadow-lg sm:w-auto"
                          >
                            <CloseIcon size={20} />
                            <span>Stop Camera</span>
                          </button>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-800 flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span>Position the QR code within the highlighted area for best results</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-2">
                        <SearchIcon size={24} className="text-blue-600" />
                        Manual License Entry
                      </h2>
                      <p className="text-gray-600 text-sm">
                        Enter the license number to verify vendor credentials
                      </p>
                    </div>

                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-6">
                        <SearchIcon className="text-indigo-600" size={48} />
                      </div>
                      <div className="max-w-md mx-auto space-y-4">
                        <div className="relative">
                          <input
                            type="text"
                            value={manualLicense}
                            onChange={(e) => setManualLicense(e.target.value.toUpperCase())}
                            placeholder="Enter license number (e.g., LIC-12345)"
                            className="w-full px-6 py-4 pr-12 border-2 border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-lg font-medium placeholder:text-gray-400 placeholder:font-normal"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleManualVerify();
                              }
                            }}
                          />
                          <SearchIcon 
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" 
                            size={24} 
                          />
                        </div>
                        <button
                          onClick={handleManualVerify}
                          disabled={!manualLicense.trim()}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                          Verify License
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Quick Info Card */}
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  How to Use
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center font-semibold mt-0.5">1</span>
                    <span>Choose between QR scanner or manual entry</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center font-semibold mt-0.5">2</span>
                    <span>Scan the vendor&apos;s QR code or enter license number</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center font-semibold mt-0.5">3</span>
                    <span>View complete vendor details and documents</span>
                  </li>
                </ul>
              </div>

              {/* QR Scanning Note */}
              <div className="bg-white rounded-2xl shadow-lg border border-amber-200 p-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Note</h4>
                    <p className="text-sm text-gray-600">
                      Full QR code scanning requires additional libraries. For now, please use manual entry to verify licenses.
                    </p>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Verification Features
                </h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Instant verification
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    View all documents
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Check expiry status
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Shop & station details
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Mobile Back Button */}
          <div className="mt-8 text-center sm:hidden">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-6 py-3 text-gray-700 bg-white rounded-xl shadow-sm hover:bg-gray-50 font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

