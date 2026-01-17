/**
 * Railway Station Layout Builder
 * 
 * Complete drag-and-drop station layout editor
 * for Station Managers to design track layouts, platforms, and shop zones
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useLayoutStore } from '@/store/layoutStore';
import { InfrastructureToolbar } from '@/components/layout-editor/InfrastructureToolbar';
import { DroppableCanvas } from '@/components/layout-editor/DroppableCanvas';
import { TrackManager } from '@/components/layout-editor/TrackManager';
import { ShopZoneEditor } from '@/components/layout-editor/ShopZoneEditor';
import { LayoutPreviewModal } from '@/components/layout-editor/LayoutPreviewModal';
import { INFRASTRUCTURE_DEFAULTS, InfrastructureType } from '@/types/layout';
import toast from 'react-hot-toast';

function LayoutBuilderContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  // Enforce units range: 50 - 200 where 200 units == 10 m²
  const MIN_UNITS = 50;
  const MAX_UNITS = 200;
  // Default unitToMeters so 200 units == 10 m^2 -> utm = sqrt(10)/200
  const DEFAULT_UNIT_TO_METERS = Math.sqrt(10) / 200;
  const [unitToMeters, setUnitToMeters] = useState<number>(DEFAULT_UNIT_TO_METERS);
  const [pricePer100x100Single, setPricePer100x100Single] = useState<number>(0);
  const [pricePer100x100Dual, setPricePer100x100Dual] = useState<number>(0);
  const [securityDeposit, setSecurityDeposit] = useState<number>(0);
  const [stationInfo, setStationInfo] = useState<{ _id: string; stationName: string; stationCode: string } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeId, setActiveId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [user, setUser] = useState<{ _id: string; role: string } | null>(null);
  const {
    layout,
    initializeLayout,
    loadLayout,
    exportLayout,
    validateLayout,
    validateWithStationData,
    addInfrastructure,
  } = useLayoutStore();
  const MAX_AREA_M2 = 10;

  const computeOversizedShops = () => {
    const offenders: Array<{ platformId?: string; platformNumber?: string; shopId?: string; shopIndex?: number; width?: number; height?: number; areaM2?: number }> = [];
    if (!layout || !layout.platforms) return offenders;
    const unitToMetersLocal = layout.pricing?.unitToMeters ?? unitToMeters ?? DEFAULT_UNIT_TO_METERS;
    const derived = Math.floor(Math.sqrt(MAX_AREA_M2) / (Number(unitToMetersLocal) || DEFAULT_UNIT_TO_METERS));
    const maxUnitsLocal = Math.min(MAX_UNITS, Math.max(MIN_UNITS, derived));
    (layout.platforms || []).forEach((platform: any) => {
      const shops = platform.shops || [];
      shops.forEach((shop: any, idx: number) => {
        const width = shop.size?.width ?? shop.width ?? shop.w ?? 0;
        const height = shop.size?.height ?? shop.height ?? shop.h ?? width;
        const utm = Number(unitToMetersLocal) || DEFAULT_UNIT_TO_METERS;
        const areaM2 = (width * height) * utm * utm;
        const exceedsLinear = (width < MIN_UNITS) || (height < MIN_UNITS) || (width > maxUnitsLocal) || (height > maxUnitsLocal);
        const exceedsArea = areaM2 > MAX_AREA_M2;
        if (exceedsLinear || exceedsArea) offenders.push({ platformId: platform.id || platform._id, platformNumber: platform.platformNumber, shopId: shop.id || shop._id, shopIndex: idx, width, height, areaM2 });
      });
    });
    return offenders;
  };
  useEffect(() => {
    fetchUserAndStation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserAndStation = async () => {
    try {
      // Fetch user info
      const userRes = await fetch('/api/auth/me', {
        credentials: 'same-origin',
      });

      if (!userRes.ok) {
        toast.error('Failed to load user data');
        router.push('/auth/login');
        return;
      }

      const userData = await userRes.json();

      if (!userData.user) {
        toast.error('User data not found');
        router.push('/auth/login');
        return;
      }

      setUser(userData.user);

      // Fetch station data
      const stationRes = await fetch('/api/station-manager/station', {
        credentials: 'same-origin',
      });
      const stationData = await stationRes.json();

      if (stationData.success) {
        setStationInfo(stationData.station);

        // Try to load existing layout
        try {
          const layoutRes = await fetch(
            `/api/station-manager/layout/load?stationId=${stationData.station._id}`,
            { credentials: 'same-origin' }
          );

          const layoutData = await layoutRes.json();

          if (layoutData.success && layoutData.layout) {
            // Load existing layout
            loadLayout(layoutData.layout);
            toast.success('Layout loaded successfully');
          } else {
            // Initialize new layout
            initializeLayout(
              stationData.station._id,
              stationData.station.stationName,
              stationData.station.stationCode,
              userData.user._id
            );
            toast('New layout initialized', { icon: 'ℹ️' });
          }
        } catch {
          // No existing layout, initialize new one
          initializeLayout(
            stationData.station._id,
            stationData.station.stationName,
            stationData.station.stationCode,
            userData.user._id
          );
          toast('New layout initialized', { icon: 'ℹ️' });
        }
      } else {
        toast.error('Failed to load station data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const confirmSaveWithPricing = async () => {
    if (!layout) return;

    setShowPricingModal(false);
    setSaving(true);

    try {
      const exportedLayout = exportLayout();
      exportedLayout.pricing = {
        unitToMeters: Number(unitToMeters) || DEFAULT_UNIT_TO_METERS,
        pricePer100x100Single: Number(pricePer100x100Single) || 0,
        pricePer100x100Dual: Number(pricePer100x100Dual) || 0,
        securityDeposit: Number(securityDeposit) || 0,
      };

      // Clamp/scale shops to meet area limit and enforced unit bounds (MIN_UNITS..MAX_UNITS)
      const utm = Number(exportedLayout.pricing.unitToMeters) || DEFAULT_UNIT_TO_METERS;
      const derivedMax = Math.floor(Math.sqrt(MAX_AREA_M2) / utm);
      const effectiveMax = Math.min(MAX_UNITS, Math.max(MIN_UNITS, derivedMax));
      const MAX_AREA_M2_LOCAL = MAX_AREA_M2;
      let scaledCount = 0;
      (exportedLayout.platforms || []).forEach((platform: any) => {
        (platform.shops || []).forEach((shop: any) => {
          const width = shop.size?.width ?? shop.width ?? shop.w ?? 0;
          const height = shop.size?.height ?? shop.height ?? shop.h ?? width;
          const areaM2 = width * height * utm * utm;
          if (areaM2 > MAX_AREA_M2_LOCAL || width < MIN_UNITS || height < MIN_UNITS || width > effectiveMax || height > effectiveMax) {
            // scale by area first if needed
            let newW = width;
            let newH = height;
            if (areaM2 > MAX_AREA_M2_LOCAL && areaM2 > 0) {
              const scale = Math.sqrt(MAX_AREA_M2_LOCAL / areaM2);
              newW = Math.max(MIN_UNITS, Math.round(width * scale));
              newH = Math.max(MIN_UNITS, Math.round(height * scale));
            }
            // enforce linear bounds
            newW = Math.max(MIN_UNITS, Math.min(effectiveMax, newW));
            newH = Math.max(MIN_UNITS, Math.min(effectiveMax, newH));

            shop.width = newW;
            shop.height = newH;
            if (!shop.size) shop.size = {};
            shop.size.width = newW;
            shop.size.height = newH;
            scaledCount++;
          }
        });
      });

      if (scaledCount > 0) {
        toast(`Autoscaled ${scaledCount} shops to meet ${MAX_AREA_M2_LOCAL} m² and ${MIN_UNITS}-${MAX_UNITS} unit bounds.`, { icon: '⚠️' });
      }

      const response = await fetch('/api/station-manager/layout/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(exportedLayout),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Layout saved successfully!');
      } else {
        toast.error(data.error || 'Failed to save layout');
      }
    } catch (error) {
      console.error('Error saving layout with pricing:', error);
      toast.error('Failed to save layout. Please check console for details.');
    } finally {
      setSaving(false);
    }
  };
  

  const handleSaveLayout = async () => {
    if (!layout) {
      toast.error('No layout to save');
      return;
    }

    if (!stationInfo) {
      toast.error('Station information not loaded');
      return;
    }

    // Fetch fresh station data to get platform count
    try {
      const stationRes = await fetch('/api/station-manager/station', {
        credentials: 'same-origin',
      });
      const stationData = await stationRes.json();

      if (!stationData.success || !stationData.station) {
        toast.error('Failed to load station data');
        return;
      }

      const stationPlatformCount = stationData.station.platformsCount;

      // Validate layout with station platform count
      const validation = validateWithStationData(stationPlatformCount);
      if (!validation.isValid) {
        toast.error(
          <div>
            <div className="font-bold mb-1">Validation Failed:</div>
            {validation.errors.map((error, idx) => (
              <div key={idx} className="text-sm">• {error}</div>
            ))}
          </div>,
          { duration: 6000 }
        );
        return;
      }

      // Open pricing modal so manager can confirm/set pricing before saving
      const existingPricing = layout.pricing;
      if (existingPricing) {
        setUnitToMeters(existingPricing.unitToMeters ?? DEFAULT_UNIT_TO_METERS);
        setPricePer100x100Single(existingPricing.pricePer100x100Single ?? 0);
        setPricePer100x100Dual(existingPricing.pricePer100x100Dual ?? 0);
        setSecurityDeposit(existingPricing.securityDeposit ?? 0);
      } else {
        setUnitToMeters(DEFAULT_UNIT_TO_METERS);
        setPricePer100x100Single(0);
        setPricePer100x100Dual(0);
        setSecurityDeposit(0);
      }

      setShowPricingModal(true);
      return;
    } catch (error) {
      console.error('Error saving layout:', error);
      toast.error('Failed to save layout. Please check console for details.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportLayout = async () => {
    if (!layout) {
      toast.error('No layout to export');
      return;
    }

    try {
      const response = await fetch(
        `/api/station-manager/layout/export?stationId=${layout.stationId}`,
        { credentials: 'same-origin' }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `station-layout-${layout.stationCode}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Layout exported successfully!');
      } else {
        toast.error('Failed to export layout');
      }
    } catch (error) {
      console.error('Error exporting layout:', error);
      toast.error('Failed to export layout');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
  };

  const handleAddInfrastructure = (type: InfrastructureType) => {
    const dimensions = INFRASTRUCTURE_DEFAULTS[type];
    
    // Add infrastructure near center of canvas with slight randomness
    const x = 900 + Math.random() * 100;
    const y = 300 + Math.random() * 100;

    addInfrastructure({
      type,
      position: { x, y },
      dimensions,
      rotation: 0,
      isLocked: false,
      metadata: {},
    });

    toast.success(`${type.replace(/_/g, ' ')} added to canvas`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading layout editor...</p>
        </div>
      </div>
    );
  }

  const oversizedShops = computeOversizedShops();
  const oversizedCount = oversizedShops.length;

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-800">
                Station Layout Builder
              </h1>
              {stationInfo && (
                <p className="text-xs text-gray-600 mt-0.5">
                  {stationInfo.stationName} ({stationInfo.stationCode})
                </p>
              )}
              {layout?.pricing && (
                <p className="text-xs text-gray-600 mt-0.5">
                  Pricing: ₹{layout.pricing.pricePer100x100Single ?? 0} (100x100 single) • ₹{layout.pricing.pricePer100x100Dual ?? 0} (100x100 dual) • Deposit ₹{layout.pricing.securityDeposit ?? 0} • 1 unit = {layout.pricing.unitToMeters ?? unitToMeters} m
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/station-manager/dashboard')}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-xs font-medium transition-colors text-gray-800"
              >
                ← Back to Dashboard
              </button>
              <button
                onClick={async () => {
                  if (!layout) return toast.error('No layout loaded');
                  const input = window.prompt(`Enter default linear size for shops (${MIN_UNITS}-${MAX_UNITS} units)`, String(MIN_UNITS));
                  if (!input) return;
                  const val = Math.max(MIN_UNITS, Math.min(MAX_UNITS, Number(input)));
                  if (isNaN(val)) return toast.error('Invalid number');

                  // Export current layout, modify shop sizes, and reload
                  const exported = exportLayout();
                  if (!exported) return toast.error('Failed to export layout');

                  (exported.platforms || []).forEach((platform: any) => {
                    (platform.shops || []).forEach((shop: any) => {
                      // set both legacy and new size fields
                      shop.width = val;
                      if (!shop.size) shop.size = {};
                      shop.size.width = val;
                      shop.size.height = val;
                      shop.height = val;
                    });
                  });

                  // reload transformed layout into store
                  loadLayout(exported);
                  toast.success(`All shops reset to ${val} units`);
                }}
                className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs font-medium transition-colors"
              >
                Reset Shops to Default
              </button>
              
              <button
                onClick={() => setShowPreview(true)}
                disabled={!layout}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </button>
              
              <button
                onClick={handleExportLayout}
                disabled={!layout || saving}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Export JSON
              </button>

              <button
                onClick={handleSaveLayout}
                disabled={!layout || saving || oversizedCount > 0}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Save Layout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {oversizedCount > 0 && (
          <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-2">
            <div className="text-sm text-yellow-800 flex items-center justify-between">
              <div>
                <strong>Warning:</strong> {oversizedCount} shop(s) exceed the maximum allowed size ({MAX_UNITS} units or {MAX_AREA_M2} m²). Fix them before saving.
              </div>
              <div>
                <button
                  onClick={() => toast.error(`Oversized shops: ${oversizedShops.slice(0,5).map(s => `P:${s.platformNumber||s.platformId} S:${s.shopIndex} w:${s.width} h:${s.height} (${s.areaM2?.toFixed(2)}m²)`).join('; ')}`)}
                  className="px-2 py-1 bg-yellow-600 text-white rounded text-xs"
                >
                  View Examples
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Editor Area */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Floating Left Panels */}
          <div className="absolute left-0 top-0 bottom-0 z-20 flex pointer-events-none">
            <div className="pointer-events-auto">
              <InfrastructureToolbar onAddInfrastructure={handleAddInfrastructure} />
            </div>
            <div className="pointer-events-auto">
              <TrackManager />
            </div>
          </div>
          
          {/* Floating Right Panel */}
          <div className="absolute right-0 top-0 bottom-20 z-20 pointer-events-none">
            <div className="pointer-events-auto h-full">
              <ShopZoneEditor />
            </div>
          </div>
          
          {/* Center - Canvas (Full Width) */}
          <div className="flex-1 relative">
            <DroppableCanvas />
          </div>
        </div>

        {/* Preview Modal */}
        <LayoutPreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} />

        {/* Pricing Modal */}
        {showPricingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowPricingModal(false)} />
            <div className="bg-white rounded-lg shadow-lg z-60 w-full max-w-md mx-4 p-6">
              <h3 className="text-lg font-bold mb-3">Layout Pricing & Settings</h3>

              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs text-gray-600">1 unit equals (meters)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={unitToMeters}
                    onChange={(e) => setUnitToMeters(Number(e.target.value))}
                    className="mt-1 w-full border rounded px-2 py-1"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600">Price per 100x100 (single-track)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={pricePer100x100Single}
                    onChange={(e) => setPricePer100x100Single(Number(e.target.value))}
                    className="mt-1 w-full border rounded px-2 py-1"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600">Price per 100x100 (dual-track)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={pricePer100x100Dual}
                    onChange={(e) => setPricePer100x100Dual(Number(e.target.value))}
                    className="mt-1 w-full border rounded px-2 py-1"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600">Security deposit</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(Number(e.target.value))}
                    className="mt-1 w-full border rounded px-2 py-1"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShowPricingModal(false)}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSaveWithPricing}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                >
                  Save Layout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help Instructions */}
        <div className="bg-blue-50 border-t border-blue-200 px-4 py-2">
          <div className="text-[10px] text-blue-800 flex items-center gap-3 flex-wrap">
            <strong className="text-xs">Quick Guide:</strong> 
            <span>Add tracks in Track Manager panel</span>
            <span>•</span>
            <span>Click infrastructure items to add them</span>
            <span>•</span>
            <span>Scroll or drag canvas to navigate</span>
            <span>•</span>
            <span className="font-semibold">Shift+Drag Track to move vertically</span>
            <span>•</span>
            <span className="font-semibold">Shift+Drag Platform to move horizontally</span>
            <span>•</span>
            <span className="text-red-700 font-semibold">Red border at track side = No shops</span>
            <span>•</span>
            <span>Select platform to add shops</span>
          </div>
        </div>
      </div>
    </DndContext>
  );
}

export default function LayoutBuilderPage() {
  return (
    <ProtectedRoute allowedRoles={['STATION_MANAGER']}>
      <LayoutBuilderContent />
    </ProtectedRoute>
  );
}

