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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <QrCodeIcon size={32} />
              Scan License
            </h1>
            <p className="text-gray-600 mt-2">
              Scan a QR code or enter license number manually
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CameraIcon size={24} />
                QR Code Scanner
              </h2>

              {!scanning ? (
                <div className="text-center py-12">
                  <CameraIcon className="mx-auto text-gray-400 mb-4" size={64} />
                  <p className="text-gray-600 mb-6">
                    Click below to start camera and scan QR code
                  </p>
                  <button
                    onClick={startCamera}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    Start Camera
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute inset-0 border-4 border-blue-500 pointer-events-none"></div>
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="flex gap-3">
                    <button
                      onClick={captureImage}
                      className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium transition-colors"
                    >
                      Capture & Scan
                    </button>
                    <button
                      onClick={stopCamera}
                      className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-medium transition-colors"
                    >
                      <CloseIcon size={20} />
                      Stop
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 text-center">
                    Position the QR code within the frame
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <SearchIcon size={24} />
                Manual Entry
              </h2>

              <div className="text-center py-12">
                <SearchIcon className="mx-auto text-gray-400 mb-4" size={64} />
                <p className="text-gray-600 mb-6">
                  Enter license number to verify
                </p>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={manualLicense}
                    onChange={(e) => setManualLicense(e.target.value)}
                    placeholder="Enter license number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleManualVerify();
                      }
                    }}
                  />
                  <button
                    onClick={handleManualVerify}
                    className="w-full bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    Verify License
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-blue-50 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              Note: QR Code Scanning
            </h3>
            <p className="text-sm text-blue-800">
              Full QR code scanning requires additional libraries (like jsQR or zxing). 
              For now, please use manual entry to verify licenses. The camera functionality 
              is ready for integration with a QR scanning library.
            </p>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

