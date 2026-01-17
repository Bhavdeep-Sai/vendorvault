'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function GenerateQRPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const url = `${window.location.origin}/welcome`;
      
      QRCode.toCanvas(canvasRef.current, url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    }
  }, []);

  const downloadQR = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'vendorvault-qr.png';
      link.href = url;
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          VendorVault QR Code
        </h1>
        <p className="text-gray-600 mb-8">
          Scan to access the welcome page
        </p>
        
        <div className="bg-cyan-50 p-6 rounded-xl mb-6 inline-block">
          <canvas ref={canvasRef} className="max-w-full h-auto" />
        </div>
        
        <button
          onClick={downloadQR}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
        >
          Download QR Code
        </button>
        
        <p className="text-sm text-gray-500 mt-6">
          URL: {typeof window !== 'undefined' ? `${window.location.origin}/welcome` : ''}
        </p>
      </div>
    </div>
  );
}
