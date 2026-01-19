"use client";
import React, { useState, useRef, useEffect } from 'react';
import Select from '@/components/ui/Select';
import { Html5Qrcode } from 'html5-qrcode';

interface LicenseResult {
  license: any;
  application?: any;
  vendor?: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
    businessName: string;
    businessType: string;
    businessDescription: string;
    businessRegistration: string;
    gstNumber: string;
    panNumber: string;
    businessAddress: string;
    city: string;
    state: string;
    pincode: string;
    bankName: string;
    accountHolderName: string;
    ifscCode: string;
    experienceYears: number;
    previousExperience: boolean;
  };
  shop?: {
    name: string;
    id: string;
    description: string;
    location: {
      station: string;
      stationCode: string;
      platform: string;
    };
  };
  financial?: {
    monthlyRent: number;
    securityDeposit: number;
    proposedRent: number;
    agreedRent: number;
    rentStatus: string;
    depositStatus: string;
  };
  agreement?: any;
  payments?: any[];
  paymentSummary?: any;
  scanInfo?: {
    scannedAt: string;
    scannedBy: string;
    inspectorId: string;
    dataFormat: string;
  };
}

const StarSelector: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={`p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200 ${i <= value ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
          aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.95a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.95c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.286-3.95a1 1 0 00-.364-1.118L2.063 9.377c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.95z" />
          </svg>
        </button>
      ))}
    </div>
  );
};

export default function InspectorScanPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<LicenseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [usingCamera, setUsingCamera] = useState(false);
  const [scannedData, setScannedData] = useState<any | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [inspection, setInspection] = useState({
    complianceStatus: 'COMPLIANT',
    hygieneRating: 5,
    findings: '',
    remarks: '',
    actionRequired: '',
    followUpDate: ''
  });
  const [recordedFindings, setRecordedFindings] = useState<string[] | null>(null);

  const scan = async (payload?: string) => {
    const licenseNumber = payload ?? query;
    if (!licenseNumber) return alert('Please enter license number or scan QR');
    setLoading(true);
    try {
      const res = await fetch('/api/inspectors/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseNumber })
      });
      const data = await res.json();
      if (data.success && data.valid) {
        setResult(data as LicenseResult);
        // default follow-up date to 1 week from now when a license is found (if not already set)
        setInspection((prev) => {
          if (prev.followUpDate) return prev;
          const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          const iso = d.toISOString().split('T')[0];
          return { ...prev, followUpDate: iso };
        });
      } else {
        setResult(null);
        alert(data.message || data.error || 'Not found');
      }
    } catch (err: any) {
      console.error(err);
      alert('Scan failed');
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    if (usingCamera) return;
    // ensure any previous instance is stopped and DOM cleared
    try { await stopScanner(); } catch (e) { /* ignore */ }
    try {
      // clear container to avoid duplicate video elements
      const readerEl = document.getElementById('qr-reader');
      if (readerEl) readerEl.innerHTML = '';

      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;
      const config = { fps: 10, qrbox: 250 };

      // Try to pick a specific camera (prefer back/environment label)
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length) {
          const preferred = cameras.find((c: any) => /back|rear|environment/i.test(c.label)) || cameras[0];
          const camId = preferred.id;
          await html5QrCode.start(camId, config,
            (decodedText) => {
              console.debug('QR decoded:', decodedText);
              stopScanner();
              let parsed: any = null;
              try { parsed = JSON.parse(decodedText); } catch (e) { parsed = null; }
              if (parsed && parsed.licenseNumber) {
                setScannedData(parsed);
                scan(parsed.licenseNumber);
              } else {
                setScannedData({ raw: decodedText });
                scan(decodedText);
              }
            },
            (errorMessage) => { console.debug('QR decode error', errorMessage); }
          );
          // ensure video fills the reader container
          applyVideoStyles();
          setUsingCamera(true);
          return;
        }
      } catch (err) {
        console.warn('getCameras failed, falling back to facingMode constraint', err);
      }

      // fallback to facingMode
      await html5QrCode.start(
        { facingMode: 'environment' } as any,
        config,
        (decodedText) => {
          console.debug('QR decoded (fallback):', decodedText);
          stopScanner();
          let parsed: any = null;
          try { parsed = JSON.parse(decodedText); } catch (e) { parsed = null; }
          if (parsed && parsed.licenseNumber) {
            setScannedData(parsed);
            scan(parsed.licenseNumber);
          } else {
            setScannedData({ raw: decodedText });
            scan(decodedText);
          }
        },
        (errorMessage) => { console.debug('QR decode error (fallback)', errorMessage); }
      );

      // ensure video fills the reader container for fallback start
      applyVideoStyles();

      setUsingCamera(true);
    } catch (err) {
      console.error('Failed to start scanner:', err);
      alert('Unable to access camera for scanning');
      try { await stopScanner(); } catch(_) {}
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
        scannerRef.current = null;
      }
      // clear DOM too
      const readerEl = document.getElementById('qr-reader');
      if (readerEl) readerEl.innerHTML = '';
    } catch (e) {
      // ignore
    } finally {
      setUsingCamera(false);
    }
  };

  // Make sure the video element injected by html5-qrcode is visible and covers the container
  const applyVideoStyles = () => {
    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      const readerEl = document.getElementById('qr-reader');
      const video = readerEl?.querySelector('video') as HTMLVideoElement | null;
      if (video) {
        video.style.objectFit = 'cover';
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.display = 'block';
        // also ensure canvas overlay (if any) fills
        const canvas = readerEl?.querySelector('canvas') as HTMLCanvasElement | null;
        if (canvas) {
          canvas.style.width = '100%';
          canvas.style.height = '100%';
        }
        clearInterval(id);
      }
      if (attempts > 20) clearInterval(id);
    }, 150);
  };

  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined) return '—';
    // detect common date keys
    if (/(issuedAt|expiresAt|issued_at|expires_at)/i.test(key)) {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      } catch (e) {
        // fallthrough
      }
    }
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const record = async () => {
    if (!result) return;
    setRecording(true);
    try {
      const body = {
        licenseId: result.license._id,
        complianceStatus: inspection.complianceStatus,
        hygieneRating: Number(inspection.hygieneRating),
        findings: inspection.findings ? inspection.findings.split('\n') : [],
        remarks: inspection.remarks,
        actionRequired: inspection.actionRequired,
        followUpDate: inspection.followUpDate ? new Date(inspection.followUpDate) : null,
      };

      const res = await fetch('/api/inspectors/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        alert('Inspection recorded');
        setResult((prev) => prev ? { ...prev, license: data.license } : prev);
        // show recorded findings immediately in the UI
        try {
          const lines = inspection.findings ? inspection.findings.split('\n').map(s => s.trim()).filter(Boolean) : [];
          setRecordedFindings(lines.length ? lines : null);
        } catch (e) { setRecordedFindings(null); }
      } else {
        alert(data.error || 'Failed to record inspection');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to record');
    } finally {
      setRecording(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 bg-gray-50 min-h-screen">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-indigo-700">Inspector Scan</h2>
        <p className="text-xs sm:text-sm text-gray-600">Scan vendor license QR or enter license number to lookup vendor and record inspection.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left: Camera + Controls */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-gray-200 rounded-xl shadow-md p-4 sm:p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">Camera Scanner</h3>
                <p className="text-[10px] sm:text-xs text-gray-500">Use camera to scan QR. Click "Camera" and allow permission.</p>
              </div>
              <div className="text-sm">
                {usingCamera ? <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Camera On</span> : <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Camera Off</span>}
              </div>
            </div>

            <div className="mb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  className="w-full sm:flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 bg-white"
                  placeholder="Enter license number"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => scan()}
                    disabled={loading || !query}
                    className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm whitespace-nowrap"
                  >{loading ? 'Scanning...' : 'Scan'}</button>
                  <button
                    onClick={() => (usingCamera ? stopScanner() : startScanner())}
                    className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-lg hover:from-indigo-700 shadow-sm whitespace-nowrap"
                  >{usingCamera ? 'Stop' : 'Camera'}</button>
                </div>
              </div>
            </div>

            <div className="w-full rounded-md overflow-hidden relative border border-dashed border-gray-200" style={{ height: usingCamera ? 360 : 0, transition: 'height 200ms ease' }}>
              <div id="qr-reader" className="w-full h-full" style={{ width: '100%', maxWidth: '100%', minHeight: 360 }} />
              <div className={`${usingCamera ? 'hidden' : 'absolute inset-0 flex items-center justify-center'}`} aria-hidden={usingCamera}>
                <div className="text-sm text-gray-400">Camera preview will appear here</div>
              </div>
            </div>

            {/* Below camera: show raw scanner output (parsed) when available */}
            {scannedData && (
              <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Scanned QR Output</h4>
                <div className="text-sm text-gray-700">
                  {(() => {
                    const meta = scannedData || {};
                    const entries = Object.entries(meta);
                    if (entries.length === 0) return <div className="text-xs text-gray-500">No scanned data</div>;
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {entries.map(([k, v]) => (
                          <div key={k} className="p-3 border border-gray-200 rounded-md bg-white">
                            <div className="text-xs text-gray-500 uppercase tracking-wide">{k}</div>
                            <div className="text-sm font-medium text-gray-900 mt-1 break-words">{formatValue(k, v)}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Explanatory panel: Manager-facing field descriptions */}
            <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Inspection Fields — Sent to Manager</h4>
              <div className="text-sm text-gray-700">
                <ul className="list-disc pl-5 space-y-2">
                  <li><span className="font-medium">Findings:</span> One observation per line (e.g. "No soap at handwash"). Managers receive these as a bullet list of issues (array of strings).</li>
                  <li><span className="font-medium">Follow up date:</span> Target date for re-inspection or expected correction. Managers will see this as the deadline to track.</li>
                  <li><span className="font-medium">Status:</span> Inspection outcome shown to managers — choose <em>Compliant</em>, <em>Non-Compliant</em>, or <em>Warning</em>.</li>
                  <li><span className="font-medium">Hygiene Rating:</span> Numeric summary (1–5). Managers use this score for quick assessment and reporting.</li>
                  <li><span className="font-medium">Remarks:</span> Short contextual notes for the manager (concise explanation or clarification).</li>
                  <li><span className="font-medium">Action Required:</span> Specific corrective steps the vendor must take; managers see these as the required actions to close the finding.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Result + Record */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-gray-200 rounded-xl shadow-md p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Lookup Result</h3>

            {!result ? (
              <div className="text-center py-16 text-gray-500">
                <p className="mb-2">No license selected</p>
                <p className="text-sm">Scan a QR or enter a license number and click Scan to view details.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* License Status Header */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">License: {result.license?.licenseNumber || '—'}</h4>
                      <p className="text-sm text-gray-600">Scanned at {result.scanInfo?.scannedAt ? new Date(result.scanInfo.scannedAt).toLocaleTimeString() : 'N/A'}</p>
                    </div>
                    <div>
                      {(() => {
                        const s = (result.license?.status || '').toString().toUpperCase();
                        if (s === 'APPROVED' || s === 'ACTIVE' || s === 'COMPLIANT') return <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-semibold">{s}</span>;
                        if (s === 'REJECTED' || s === 'NON_COMPLIANT') return <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full font-semibold">{s}</span>;
                        return <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">{s || '—'}</span>;
                      })()} 
                    </div>
                  </div>
                </div>

                {/* Vendor Information */}
                {result.vendor && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-base font-semibold text-gray-900 mb-3">📋 Vendor Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Owner Name</p>
                        <p className="font-semibold text-gray-900">{result.vendor.fullName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Contact</p>
                        <p className="text-sm text-gray-700">{result.vendor.phone}</p>
                        <p className="text-xs text-gray-500">{result.vendor.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Business Name</p>
                        <p className="font-semibold text-gray-900">{result.vendor.businessName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Business Type</p>
                        <p className="text-sm text-gray-700">{result.vendor.businessType}</p>
                      </div>
                      {result.vendor.gstNumber && result.vendor.gstNumber !== 'N/A' && (
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wide">GST Number</p>
                          <p className="text-sm text-gray-700">{result.vendor.gstNumber}</p>
                        </div>
                      )}
                      {result.vendor.businessRegistration && result.vendor.businessRegistration !== 'N/A' && (
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wide">Registration No.</p>
                          <p className="text-sm text-gray-700">{result.vendor.businessRegistration}</p>
                        </div>
                      )}
                    </div>
                    {result.vendor.businessAddress && result.vendor.businessAddress !== 'N/A' && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Business Address</p>
                        <p className="text-sm text-gray-700">
                          {result.vendor.businessAddress}
                          {result.vendor.city && result.vendor.city !== 'N/A' && `, ${result.vendor.city}`}
                          {result.vendor.state && result.vendor.state !== 'N/A' && `, ${result.vendor.state}`}
                          {result.vendor.pincode && result.vendor.pincode !== 'N/A' && ` - ${result.vendor.pincode}`}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Shop Information */}
                {result.shop && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="text-base font-semibold text-green-900 mb-3">🏪 Shop Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-green-700 uppercase tracking-wide">Shop Name</p>
                        <p className="font-semibold text-green-900">{result.shop.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-green-700 uppercase tracking-wide">Shop ID</p>
                        <p className="text-sm text-green-800">{result.shop.id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-green-700 uppercase tracking-wide">Station</p>
                        <p className="font-semibold text-green-900">{result.shop.location.station}</p>
                        <p className="text-xs text-green-600">{result.shop.location.stationCode}</p>
                      </div>
                      <div>
                        <p className="text-xs text-green-700 uppercase tracking-wide">Platform</p>
                        <p className="text-sm text-green-800">{result.shop.location.platform}</p>
                      </div>
                    </div>
                    {result.shop.description && result.shop.description !== 'N/A' && (
                      <div className="mt-3">
                        <p className="text-xs text-green-700 uppercase tracking-wide">Description</p>
                        <p className="text-sm text-green-800">{result.shop.description}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Financial Information */}
                {result.financial && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="text-base font-semibold text-blue-900 mb-3">💰 Financial Details</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-blue-700 uppercase tracking-wide">Monthly Rent</p>
                        <p className="font-semibold text-blue-900">₹{result.financial.monthlyRent.toLocaleString()}</p>
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full mt-1 ${
                          result.financial.rentStatus === 'CURRENT' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {result.financial.rentStatus}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 uppercase tracking-wide">Security Deposit</p>
                        <p className="font-semibold text-blue-900">₹{result.financial.securityDeposit.toLocaleString()}</p>
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full mt-1 ${
                          result.financial.depositStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {result.financial.depositStatus}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 uppercase tracking-wide">Proposed Rent</p>
                        <p className="text-sm text-blue-800">₹{result.financial.proposedRent.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 uppercase tracking-wide">Agreed Rent</p>
                        <p className="text-sm text-blue-800">₹{result.financial.agreedRent.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bank Details */}
                {result.vendor && (result.vendor.bankName !== 'N/A' || result.vendor.ifscCode !== 'N/A') && (
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h4 className="text-base font-semibold text-purple-900 mb-3">🏦 Bank Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {result.vendor.bankName !== 'N/A' && (
                        <div>
                          <p className="text-xs text-purple-700 uppercase tracking-wide">Bank Name</p>
                          <p className="text-sm text-purple-900">{result.vendor.bankName}</p>
                        </div>
                      )}
                      {result.vendor.accountHolderName !== 'N/A' && (
                        <div>
                          <p className="text-xs text-purple-700 uppercase tracking-wide">Account Holder</p>
                          <p className="text-sm text-purple-900">{result.vendor.accountHolderName}</p>
                        </div>
                      )}
                      {result.vendor.ifscCode !== 'N/A' && (
                        <div>
                          <p className="text-xs text-purple-700 uppercase tracking-wide">IFSC Code</p>
                          <p className="text-sm text-purple-900">{result.vendor.ifscCode}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                        <div className="text-sm text-gray-700">{p.paymentType}</div>
                        <div className="text-sm font-semibold text-gray-900 flex items-center gap-3">
                          <span>{p.amount}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'PAID' ? 'bg-green-100 text-green-800' : p.status === 'OVERDUE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    )) : (
                      <div className="text-sm text-gray-500">No payments found</div>
                    )}
                  </div>
                </div>

                {/* QR Metadata */}
                {result.license?.qrCodeMetadata && (
                  <div className="p-4 border border-gray-100 rounded-md bg-white">
                    <p className="text-xs text-gray-500">QR Metadata</p>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(() => {
                        const meta = typeof result.license.qrCodeMetadata === 'string'
                          ? (() => { try { return JSON.parse(result.license.qrCodeMetadata); } catch { return { raw: result.license.qrCodeMetadata }; } })()
                          : result.license.qrCodeMetadata || {};
                        return Object.keys(meta).length === 0 ? (
                          <div className="text-sm text-gray-500">No metadata available</div>
                        ) : (
                          Object.entries(meta).map(([k, v]) => (
                            <div key={k} className="p-3 border border-gray-100 rounded-md bg-gray-50 text-sm">
                              <div className="text-xs text-gray-500 uppercase tracking-wide">{k}</div>
                              <div className="font-medium text-gray-900 mt-1 truncate">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</div>
                            </div>
                          ))
                        );
                      })()}
                    </div>
                  </div>
                )}

                <div className="bg-white p-4 border border-gray-200 rounded-lg">
                  <h4 className="text-sm font-semibold mb-3">🔍 Record Inspection</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-2">
                        <Select
                          label="Status"
                          required
                          value={inspection.complianceStatus}
                          onChange={(e: any) => setInspection({ ...inspection, complianceStatus: e.target.value })}
                          options={[
                            { value: 'COMPLIANT', label: 'Compliant' },
                            { value: 'NON_COMPLIANT', label: 'Non-Compliant' },
                            { value: 'WARNING', label: 'Warning' },
                          ]}
                          className="w-full"
                        />
                      </div>

                      <label className="text-sm">
                        Hygiene Rating <span className="text-red-600">*</span>
                        <div className="mt-1">
                          <StarSelector value={inspection.hygieneRating} onChange={(v: number) => setInspection({ ...inspection, hygieneRating: v })} />
                        </div>
                      </label>

                    <label className="col-span-1 md:col-span-2 text-sm">Findings <span className="text-red-600">*</span>
                      <textarea rows={4} placeholder={'One finding per line. e.g. "No soap at handwash"'} value={inspection.findings} onChange={(e) => setInspection({ ...inspection, findings: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 shadow-sm" aria-required />
                      <div className="text-xs text-gray-400 mt-2">Enter each finding on a new line. These will be sent to the manager as a bullet list.</div>
                    </label>

                    <label className="text-sm">Remarks
                      <input value={inspection.remarks} placeholder="Optional - short notes" onChange={(e) => setInspection({ ...inspection, remarks: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 shadow-sm" />
                    </label>

                    <label className="text-sm">Action Required
                      <input value={inspection.actionRequired} onChange={(e) => setInspection({ ...inspection, actionRequired: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 shadow-sm" placeholder="e.g. Fix handwash station" />
                    </label>

                    <label className="text-sm">Follow up date
                      <input type="date" value={inspection.followUpDate} onChange={(e) => setInspection({ ...inspection, followUpDate: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 shadow-sm" />
                    </label>
                  </div>

                  <div className="mt-4">
                    <button onClick={record} disabled={recording} className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-300">{recording ? 'Recording...' : 'Record Inspection'}</button>
                  </div>
                </div>

                {/* Show recorded findings if available */}
                {recordedFindings && (
                  <div className="mt-4 p-3 border border-dashed rounded bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">Recorded Findings</p>
                    <ul className="list-disc pl-5 text-sm text-gray-700">
                      {recordedFindings.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
