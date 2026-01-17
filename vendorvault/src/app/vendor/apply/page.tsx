'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { VendorLayout, Alert } from '@/components/vendor';
import { 
  BuildingStorefrontIcon,
  MapIcon,
  CurrencyRupeeIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ShoppingCartIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useLayoutStore } from '@/store/layoutStore';

interface Shop {
  x: number;
  width: number;
  height?: number;
  category: string;
  minWidth?: number;
  maxWidth?: number;
  isAllocated: boolean;
  _id: string;
  // Legacy fields (might exist)
  shopNumber?: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  status?: string;
}

interface Platform {
  _id: string;
  platformNumber: string;
  x: number;
  y: number;
  length: number;
  width: number;
  shops: Shop[];
  isDualTrack?: boolean;
  isInverted?: boolean;
  track?: {
    x?: number;
    y?: number;
    length?: number;
    height?: number;
    trackNumber?: number;
  };
  restrictedZone?: {
    height?: number;
  };
  topTrack?: {
    x?: number;
    y?: number;
    length?: number;
    height?: number;
    trackNumber?: number;
  };
  bottomTrack?: {
    x?: number;
    y?: number;
    length?: number;
    height?: number;
    trackNumber?: number;
  };
  bottomRestrictedZone?: {
    height?: number;
  };
  topRestrictedZone?: {
    height?: number;
  };
}

interface InfrastructureBlock {
  id?: string;
  _id?: string;
  type: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  isConnector?: boolean;
}

interface VendorStationLayout {
  _id: string;
  stationId: string;
  stationName: string;
  stationCode: string;
  platforms: Platform[];
  infrastructureBlocks: InfrastructureBlock[];
}

interface Station {
  _id: string;
  stationName: string;
  stationCode: string;
  railwayZone: string;
  stationCategory: string;
  platformsCount: number;
}

export default function VendorApplyPageNew() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Step 1: Select Station
  const [step, setStep] = useState(1);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [stationLayout, setStationLayout] = useState<VendorStationLayout | null>(null);
  
  // Step 2: Select Shops (multiple)
  interface SelectedShopItem {
    platform: Platform;
    shop: Shop;
    proposedPrice: string;
    shopName?: string; // official shop name (required by flow)
    shopDescription?: string; // description of goods sold (required before submit)
  }
  const [selectedShops, setSelectedShops] = useState<SelectedShopItem[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Vendor-visible pricing/unit defaults
  // Enforce units range: 50 - 200 where 200 units == 10 m²
  const MIN_UNITS = 50;
  const MAX_UNITS = 200;
  const MAX_AREA_M2 = 10;
  // Default unitToMeters so that 200 units == 10 m^2 -> utm = sqrt(10)/200
  const DEFAULT_UNIT_TO_METERS = Math.sqrt(10) / 200;
  const [vendorUnitToMeters, setVendorUnitToMeters] = useState<number>(DEFAULT_UNIT_TO_METERS);
  const [vendorPricePer100x100Single, setVendorPricePer100x100Single] = useState<number>(0);
  const [vendorPricePer100x100Dual, setVendorPricePer100x100Dual] = useState<number>(0);
  const [vendorSecurityDeposit, setVendorSecurityDeposit] = useState<number>(0);
  
  // Validation state
  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    profileComplete: boolean;
    documentsComplete: boolean;
    missingProfileFields: string[];
    missingDocuments: string[];
    message: string;
  } | null>(null);
  const [checkingValidation, setCheckingValidation] = useState(true);

  useEffect(() => {
    checkValidation();
  }, []);

  useEffect(() => {
    if (validationStatus?.isValid) {
      fetchStations();
    }
  }, [validationStatus]);

  const checkValidation = async () => {
    setCheckingValidation(true);
    try {
      const res = await fetch('/api/vendor/validation', { credentials: 'same-origin' });
      const data = await res.json();
      setValidationStatus(data);
      
      if (!data.isValid) {
        const issues = [];
        if (!data.profileComplete) {
          issues.push(`incomplete profile (missing: ${data.missingProfileFields.join(', ')})`);
        }
        if (!data.documentsComplete) {
          issues.push(`missing documents (required: ${data.missingDocuments.join(', ')})`);
        }
        toast.error(`Cannot apply: ${issues.join(' and ')}`);
      }
    } catch (error) {
      toast.error('Failed to check profile status');
    } finally {
      setCheckingValidation(false);
    }
  };

  const fetchStations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stations', { credentials: 'same-origin' });
      const data = await res.json();
      if (data.success) {
        setStations(data.stations);
      } else {
        toast.error(data.error || 'Failed to fetch stations');
      }
    } catch (error) {
      toast.error('Failed to load stations');
    } finally {
      setLoading(false);
    }
  };

  const handleStationSelect = async (station: Station) => {
    setLoading(true);
    try {
      // Fetch station layout using public endpoint
      const res = await fetch(`/api/stations/${station.stationCode}/layout`, {
        credentials: 'same-origin',
      });
      const data = await res.json();
      
      if (data.success && data.layout) {
        // Use the layout from API which includes _id
        setStationLayout(data.layout);
        // Also load into layout store for any transformations
        useLayoutStore.getState().loadLayout(data.layout);
        // Set vendor-visible pricing defaults
        const pricing = data.layout.pricing ?? {};
        setVendorUnitToMeters(pricing.unitToMeters ?? DEFAULT_UNIT_TO_METERS);
        setVendorPricePer100x100Single(pricing.pricePer100x100Single ?? 0);
        setVendorPricePer100x100Dual(pricing.pricePer100x100Dual ?? 0);
        setVendorSecurityDeposit(pricing.securityDepositRate ?? 0);
        setSelectedStation(station);
        setStep(2);
      } else {
        toast.error(data.error || 'This station does not have a layout configured yet');
      }
    } catch (error) {
      toast.error('Failed to load station layout');
    } finally {
      setLoading(false);
    }
  };

  const handleShopClick = (platform: Platform, shop: Shop) => {
    // Check if shop is available (not allocated)
    const shopWidth = shop.size?.width ?? shop.width ?? 80;
    const explicitShopHeight = shop.size?.height ?? shop.height;
    const fallbackShopHeight = shop.size?.width ?? shop.width;
    const shopHeight = explicitShopHeight ?? fallbackShopHeight ?? 70;
    const exceedsMax = (shopWidth > MAX_UNITS) || (shopHeight > MAX_UNITS);
    const isAvailable = !shop.isAllocated && (shop.status?.toUpperCase() !== 'OCCUPIED') && !exceedsMax;

    if (!isAvailable) {
      toast.error(exceedsMax ? `Shop exceeds maximum allowed ${MAX_UNITS} units` : 'This shop is not available');
      return;
    }
    
    // Normalize shop unique id (support both _id and id fields)
    const shopUniqueId = (shop as any)._id ?? (shop as any).id ?? '';
    // Check if shop is already selected
    const alreadySelected = selectedShops.some(item => ((item.shop as any)._id ?? (item.shop as any).id ?? '') === shopUniqueId);
    if (alreadySelected) {
      toast.error('This shop is already in your cart');
      return;
    }
    
    // Estimate rent using layout pricing (price per 100x100 units).
    // Prefer the pricing embedded in the loaded layout (authoritative), fall back to vendor-visible defaults.
    const layoutPricing = useLayoutStore.getState().layout?.pricing ?? {};
    const pricePerBlock = platform.isDualTrack
      ? (layoutPricing.pricePer100x100Dual ?? vendorPricePer100x100Dual)
      : (layoutPricing.pricePer100x100Single ?? vendorPricePer100x100Single);
    const areaUnits = shopWidth * shopHeight; // units^2
    const blocks = areaUnits / (100 * 100); // number of 100x100 blocks
    // If pricePerBlock is not provided, show 0 instead of an arbitrary fallback to avoid misleading values
    const estimatedRent = pricePerBlock ? Math.max(0, Math.round(blocks * pricePerBlock)) : 0;
    
    // Add to cart (preserve optional shopName if shop provides one)
    setSelectedShops([...selectedShops, {
      platform,
      shop: { ...(shop as any), _id: shopUniqueId },
      proposedPrice: estimatedRent.toString(),
      shopName: (shop as any).shopNumber || (shop as any).shopName || '',
      shopDescription: (shop as any).description || '',
    }]);
    toast.success('Shop added to cart');
  };
  
  const handleRemoveShop = (shopId: string) => {
    setSelectedShops(selectedShops.filter(item => item.shop._id !== shopId));
    toast.success('Shop removed from cart');
  };
  
  const handlePriceChange = (shopId: string, newPrice: string) => {
    setSelectedShops(selectedShops.map(item => 
      item.shop._id === shopId ? { ...item, proposedPrice: newPrice } : item
    ));
  };

  const handleSubmitApplication = async () => {
    if (!selectedStation || selectedShops.length === 0) {
      toast.error('Please select at least one shop');
      return;
    }

    // Ensure official shop names are provided for every selected shop
    const missingNames = selectedShops.filter(s => !s.shopName || !s.shopName.trim());
    if (missingNames.length > 0) {
      toast.error('Please enter the official Shop Name for all selected shops before submitting.');
      return;
    }

    // Validate all prices
    const invalidPrices = selectedShops.filter(item => !item.proposedPrice || parseFloat(item.proposedPrice) <= 0);
    if (invalidPrices.length > 0) {
      toast.error('Please enter valid prices for all shops');
      return;
    }

    setSubmitting(true);
    try {
      let successCount = 0;
      let failCount = 0;
      const applicationIds: string[] = [];

      // Submit each shop application
      for (const item of selectedShops) {
        try {
          const res = await fetch('/api/vendor/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              stationCode: selectedStation.stationCode,
              stationName: selectedStation.stationName,
              platformNumber: item.platform.platformNumber,
              shopId: item.shop._id,
              shopName: item.shopName || (item.shop as any).shopNumber || null,
              shopDescription: item.shopDescription || null,
              shopWidth: item.shop.width,
              proposedMonthlyRent: parseFloat(item.proposedPrice),
            }),
          });

          const data = await res.json();
          
          if (res.ok && data.success) {
            successCount++;
            applicationIds.push(data.applicationId);
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} application(s) submitted successfully!${failCount > 0 ? ` (${failCount} failed)` : ''}`);
        // Redirect to dashboard to see all applications
        router.push('/vendor/dashboard');
      } else {
        toast.error('All applications failed. Please try again.');
      }
    } catch (error) {
      toast.error('Failed to submit applications');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStationList = () => (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Select a Railway Station</h2>
      
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading stations...</p>
        </div>
      ) : stations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600">No stations available at the moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stations.map((station) => (
            <button
              key={station._id}
              onClick={() => handleStationSelect(station)}
              className="bg-white p-6 rounded-lg border border-gray-200 hover:border-indigo-500 hover:shadow-lg transition-all text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900">
                {station.stationName}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Code: {station.stationCode} | Zone: {station.railwayZone}
              </p>
              <p className="text-sm text-gray-600">
                Category: {station.stationCategory} | Platforms: {station.platformsCount}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderStationLayout = () => {
    if (!stationLayout || !selectedStation) return null;

    const CANVAS_WIDTH = 1200;
    const CANVAS_HEIGHT = 800;
    const VIEW_PAD_H = 120; // horizontal padding
    const VIEW_PAD_TOP = 40; // smaller top pad to raise layout
    const VIEW_PAD_BOTTOM = 120; // bottom pad

    // Calculate canvas bounds from actual platform data structure
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    stationLayout.platforms.forEach(platform => {
      // Platform base dimensions
      if (typeof platform.x === 'number' && typeof platform.y === 'number' && 
          typeof platform.length === 'number' && typeof platform.width === 'number') {
        minX = Math.min(minX, platform.x);
        maxX = Math.max(maxX, platform.x + platform.length);
        minY = Math.min(minY, platform.y);
        maxY = Math.max(maxY, platform.y + platform.width);
      }
      
      // Track dimensions (if exists)
      if (platform.track && typeof platform.track.x === 'number' && typeof platform.track.y === 'number' &&
          typeof platform.track.length === 'number' && typeof platform.track.height === 'number') {
        minX = Math.min(minX, platform.track.x);
        maxX = Math.max(maxX, platform.track.x + platform.track.length);
        minY = Math.min(minY, platform.track.y);
        maxY = Math.max(maxY, platform.track.y + platform.track.height);
      }
      
      // Check shops with safety checks
      if (platform.shops && Array.isArray(platform.shops)) {
        platform.shops.forEach(shop => {
          if (shop.position && shop.size) {
            minX = Math.min(minX, shop.position.x);
            maxX = Math.max(maxX, shop.position.x + shop.size.width);
            minY = Math.min(minY, shop.position.y);
            maxY = Math.max(maxY, shop.position.y + shop.size.height);
          }
        });
      }
    });
    
    // Use default canvas dimensions if no valid bounds found
    if (!isFinite(minX)) minX = 0;
    if (!isFinite(maxX)) maxX = CANVAS_WIDTH;
    if (!isFinite(minY)) minY = 0;
    if (!isFinite(maxY)) maxY = CANVAS_HEIGHT;

    const viewBox = `${minX - VIEW_PAD_H} ${minY - VIEW_PAD_TOP} ${maxX - minX + VIEW_PAD_H * 2} ${maxY - minY + VIEW_PAD_TOP + VIEW_PAD_BOTTOM}`;

    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedStation.stationName} ({selectedStation.stationCode})
            </h2>
            <p className="text-gray-600 mt-1">Click on an available (green) shop to select it</p>
          </div>
          <button
            onClick={() => {
              setStep(1);
              setStationLayout(null);
              setSelectedStation(null);
              setSelectedShops([]);
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Back to Stations
          </button>
        </div>

        {/* Station Layout Preview */}
        <div className="mb-3 text-sm text-gray-700">
          {(() => {
            const utm = Number(vendorUnitToMeters) || DEFAULT_UNIT_TO_METERS;
            const maxUnitsDerived = Math.floor(Math.sqrt(MAX_AREA_M2) / utm);
            const effectiveMax = Math.min(MAX_UNITS, Math.max(MIN_UNITS, maxUnitsDerived));
            return (
              <>
                <strong>Unit scale:</strong> 1 unit = {utm.toFixed(4)} m — <strong>Range:</strong> {MIN_UNITS}–{MAX_UNITS} units (200 units ≈ {MAX_AREA_M2} m²) — <strong>Max linear units (derived):</strong> {effectiveMax}
              </>
            );
          })()}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <svg
            width="100%"
            height="600"
            viewBox={viewBox}
            className="border border-gray-300 rounded"
            style={{ backgroundColor: '#f9fafb' }}
          >
            {/* Render Platforms */}
            {stationLayout.platforms.map((platform, idx) => {
              const platformX = platform.x || 0;
              const platformY = platform.y || 0;
              const platformLength = platform.length || 600;
              const platformWidth = platform.width || 80;
              
              const trackHeight = platform.track?.height || 60;
              const restrictedZoneHeight = platform.restrictedZone?.height || 50;
              
              return (
                <g key={platform._id || idx}>
                  {/* Single Track Platform */}
                  {!platform.isDualTrack && (
                    <>
                      {platform.isInverted ? (
                        // Inverted: Track (top) -> Restricted Zone -> Platform
                        <>
                          {/* Track at top - follow StationCanvas positioning */}
                          <rect
                            x={platformX}
                            y={platformY - (restrictedZoneHeight || 0) - trackHeight}
                            width={platformLength}
                            height={trackHeight}
                            fill="#374151"
                            stroke="#1f2937"
                            strokeWidth="2"
                          />
                          {/* Restricted Zone (passenger area) */}
                          <rect
                            x={platformX}
                            y={platformY - restrictedZoneHeight}
                            width={platformLength}
                            height={restrictedZoneHeight}
                            fill="#ef4444"
                            opacity="0.6"
                            stroke="#dc2626"
                            strokeWidth="2"
                          />
                          {/* Platform */}
                          <rect
                            x={platformX}
                            y={platformY}
                            width={platformLength}
                            height={platformWidth}
                            fill="#fef3c7"
                            stroke="#f59e0b"
                            strokeWidth="2"
                          />
                        </>
                      ) : (
                        // Normal: Platform -> Restricted Zone -> Track (bottom)
                        <>
                          {/* Platform at top */}
                          <rect
                            x={platformX}
                            y={platformY}
                            width={platformLength}
                            height={platformWidth}
                            fill="#fef3c7"
                            stroke="#f59e0b"
                            strokeWidth="2"
                          />
                          {/* Restricted Zone (passenger area) */}
                          <rect
                            x={platformX}
                            y={platformY + platformWidth}
                            width={platformLength}
                            height={restrictedZoneHeight}
                            fill="#ef4444"
                            opacity="0.6"
                            stroke="#dc2626"
                            strokeWidth="2"
                          />
                          {/* Track at bottom */}
                          <rect
                            x={platformX}
                            y={platformY + platformWidth + restrictedZoneHeight}
                            width={platformLength}
                            height={trackHeight}
                            fill="#374151"
                            stroke="#1f2937"
                            strokeWidth="2"
                          />
                        </>
                      )}
                    </>
                  )}

                  {/* Dual Track Platform */}
                  {platform.isDualTrack && (
                    <>
                      {/* Top Track - follow StationCanvas positioning (above platform.y) */}
                      <rect
                        x={platformX}
                        y={platformY - (platform.topRestrictedZone?.height || 0) - (platform.topTrack?.height || 60)}
                        width={platformLength}
                        height={platform.topTrack?.height || 60}
                        fill="#374151"
                        stroke="#1f2937"
                        strokeWidth="2"
                      />
                      {/* Top Restricted Zone */}
                      <rect
                        x={platformX}
                        y={platformY - (platform.topRestrictedZone?.height || 0)}
                        width={platformLength}
                        height={platform.topRestrictedZone?.height || 50}
                        fill="#ef4444"
                        opacity="0.6"
                        stroke="#dc2626"
                        strokeWidth="2"
                      />
                      {/* Platform (middle) */}
                      <rect
                        x={platformX}
                        y={platformY}
                        width={platformLength}
                        height={platformWidth}
                        fill="#fef3c7"
                        stroke="#f59e0b"
                        strokeWidth="2"
                      />
                      {/* Bottom Restricted Zone */}
                      <rect
                        x={platformX}
                        y={platformY + platformWidth}
                        width={platformLength}
                        height={platform.bottomRestrictedZone?.height || 50}
                        fill="#ef4444"
                        opacity="0.6"
                        stroke="#dc2626"
                        strokeWidth="2"
                      />
                      {/* Bottom Track */}
                      <rect
                        x={platformX}
                        y={platformY + platformWidth + (platform.bottomRestrictedZone?.height || 50)}
                        width={platformLength}
                        height={platform.bottomTrack?.height || 60}
                        fill="#374151"
                        stroke="#1f2937"
                        strokeWidth="2"
                      />
                    </>
                  )}

                  {/* Platform Label(s) - left margin labels. For dual-track show two labels (top/bottom), otherwise one centered label. */}
                  {platform.isDualTrack ? (
                    (() => {
                      // Compute the full stacked group's top and height so we can place labels at 25% and 75%
                      const topTrackH = platform.topTrack?.height || 60;
                      const topRestrictedH = platform.topRestrictedZone?.height || 50;
                      const bottomRestrictedH = platform.bottomRestrictedZone?.height || 50;
                      const bottomTrackH = platform.bottomTrack?.height || 60;
                      const groupTop = platformY - topRestrictedH - topTrackH;
                      const groupHeight = topTrackH + topRestrictedH + platformWidth + bottomRestrictedH + bottomTrackH;
                      const topLabelY = groupTop + platformWidth/2 + 20;
                      const bottomLabelY = platformY + platformWidth - 20; // align near bottom track center, nudged up
                      const labelX = platformX - 50; // bring labels closer horizontally

                      return (
                        <>
                          <text x={labelX} y={topLabelY} fontSize="30" fontWeight="bold" fill="#1f2937" textAnchor="start">
                            {`P${platform.platformNumber}`}
                          </text>
                          <text x={labelX} y={bottomLabelY} fontSize="30" fontWeight="bold" fill="#1f2937" textAnchor="start">
                            {`P${parseInt(platform.platformNumber) + 1}`}
                          </text>
                        </>
                      );
                    })()
                  ) : (
                    <text
                      x={platformX - 50}
                      y={(() => {
                        // Calculate center Y position of the actual platform (beige area)
                        if (platform.isInverted) {
                          const trackH = platform.track?.height || 60;
                          const restrictedH = platform.restrictedZone?.height || 50;
                          return platformY + trackH + restrictedH + platformWidth / 2;
                        }
                        return platformY + platformWidth / 2;
                      })()}
                      fontSize="30"
                      fontWeight="bold"
                      fill="#1f2937"
                    >
                      {`P${platform.platformNumber}`}
                    </text>
                  )}

                  {/* Shops */}
                  {platform.shops && Array.isArray(platform.shops) && platform.shops.map((shop, shopIdx) => {
                    // Handle both old and new shop data structures
                    // Prefer `shop.x` (used by StationCanvas) over `shop.position.x` to keep alignment
                    const shopX = platformX + ((shop as any).x ?? shop.position?.x ?? 0);
                    const shopWidth = shop.size?.width ?? shop.width ?? 80;
                    
                    // Calculate shop Y position - shops are placed ON the platform
                    let shopY, shopHeight;
                    // prefer explicit shop height if present in layout data
                    const explicitShopHeight = shop.size?.height ?? shop.height;
                    // If height is not provided, StationCanvas falls back to shop.width.
                    // Mirror that here to keep visual parity.
                    const fallbackShopHeight = shop.size?.width ?? shop.width;
                    // compute final shopHeight and topOffset (center vertically inside platform)
                    const shopHeightComputed = explicitShopHeight ?? fallbackShopHeight ?? (platformWidth - 10);
                    const topOffset = (platformWidth - shopHeightComputed) / 2;
                    // Shops are positioned inside the platform container at `platform.y`.
                    // StationCanvas renders tracks/restricted zones around the platform but
                    // the shop Y should be relative to the platform top (platformY + topOffset).
                    shopY = platformY + topOffset;
                    shopHeight = shopHeightComputed;
                    
                    // Use shop index for numbering (Area 1, Area 2, etc.)
                    const areaNumber = shopIdx + 1;
                    const isSelected = selectedShops.some(item => ((item.shop as any)._id ?? (item.shop as any).id ?? '') === ((shop as any)._id ?? (shop as any).id ?? ''));
                    // Enforce max units and max area: mark as not available if exceeds limits
                    const utm = Number(vendorUnitToMeters) || DEFAULT_UNIT_TO_METERS;
                    const areaM2 = shopWidth * shopHeight * utm * utm;
                    const exceedsLinear = (shopWidth > MAX_UNITS) || (shopHeight > MAX_UNITS);
                    const exceedsArea = areaM2 > MAX_AREA_M2;
                    const exceedsMax = exceedsLinear || exceedsArea;
                    const isAvailable = !shop.isAllocated && (shop.status?.toUpperCase() !== 'OCCUPIED') && !exceedsMax;
                    const availabilityNote = exceedsArea ? `Exceeds max area ${MAX_AREA_M2} m²` : exceedsLinear ? `Exceeds max ${MAX_UNITS} units` : undefined;
                    
                    return (
                      <g
                        key={(shop as any)._id ?? (shop as any).id ?? shopIdx}
                        onClick={() => handleShopClick(platform, shop)}
                        style={{ cursor: isAvailable ? 'pointer' : 'not-allowed' }}
                      >
                        <rect
                          x={shopX}
                          y={shopY}
                          width={shopWidth}
                          height={shopHeight}
                          fill={isSelected ? '#3b82f6' : isAvailable ? '#10b981' : exceedsMax ? '#f59e0b' : '#ef4444'}
                          stroke={isSelected ? '#1d4ed8' : isAvailable ? '#059669' : exceedsMax ? '#b45309' : '#dc2626'}
                          strokeWidth="3"
                          opacity="0.9"
                        />
                        <text
                          x={shopX + shopWidth / 2}
                          y={shopY + shopHeight / 2}
                          fontSize="12"
                          fontWeight="bold"
                          fill="white"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          Area {areaNumber}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* Infrastructure Blocks - Rendered with transparency to show they're overlay elements */}
            {stationLayout.infrastructureBlocks && Array.isArray(stationLayout.infrastructureBlocks) && 
             stationLayout.infrastructureBlocks.map((block, idx) => {
              // Thorough validation of block properties
              if (!block || !block.position || !block.dimensions) return null;
              if (typeof block.position.x !== 'number' || typeof block.position.y !== 'number') return null;
              if (typeof block.dimensions.width !== 'number' || typeof block.dimensions.height !== 'number') return null;
              
              const blockColor = block.isConnector ? '#a855f7' : '#3b82f6';
              const strokeColor = block.isConnector ? '#7c3aed' : '#2563eb';
              
              return (
                <g key={block.id || block._id || idx}>
                  <rect
                    x={block.position.x}
                    y={block.position.y}
                    width={block.dimensions.width}
                    height={block.dimensions.height}
                    fill={blockColor}
                    stroke={strokeColor}
                    strokeWidth="3"
                    opacity="0.5"
                    rx="4"
                  />
                  {/* Infrastructure label */}
                  <text
                    x={block.position.x + block.dimensions.width / 2}
                    y={block.position.y + block.dimensions.height / 2}
                    fontSize="10"
                    fontWeight="bold"
                    fill="white"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    opacity="0.9"
                  >
                    {block.type?.replace(/_/g, ' ')}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Available Shop</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>In Cart</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Occupied Shop</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-700 rounded"></div>
              <span>Railway Track</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-500 rounded"></div>
              <span>Restricted Zone</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 opacity-70 rounded"></div>
              <span>Infrastructure</span>
            </div>
          </div>
        </div>

        {/* Shopping Cart */}
        {selectedShops.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Your Shop Cart ({selectedShops.length} {selectedShops.length === 1 ? 'shop' : 'shops'})
              </h3>
              <button
                onClick={() => setSelectedShops([])}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear All
              </button>
            </div>
            
            <div className="space-y-4">
              {selectedShops.map((item, index) => (
                <div key={item.shop._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {item.shopName ? `${item.shopName}` : `Shop ${index + 1}`} • Platform {item.platform.platformNumber}
                      </h4>
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name *</label>
                        <input
                          type="text"
                          value={item.shopName || ''}
                          onChange={(e) => setSelectedShops(selectedShops.map(s => s.shop._id === item.shop._id ? { ...s, shopName: e.target.value } : s))}
                          placeholder="Enter official shop name (required)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description of Goods Sold *</label>
                        <textarea
                          value={item.shopDescription || ''}
                          onChange={(e) => setSelectedShops(selectedShops.map(s => s.shop._id === item.shop._id ? { ...s, shopDescription: e.target.value } : s))}
                          placeholder="Describe what is sold at this shop (e.g., fresh snacks, tea, stationery)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          rows={3}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-3">
                        <div>Shop Width: <span className="font-medium text-gray-900">{item.shop.width} units</span></div>
                        <div>Category: <span className="font-medium text-gray-900">{item.shop.category || 'General'}</span></div>
                        <div>Estimated Rent: <span className="font-medium text-gray-900">{(() => {
                          const layoutPricing = useLayoutStore.getState().layout?.pricing ?? {};
                          const isDual = item.platform?.isDualTrack ?? false;
                          const pricePerBlock = isDual
                            ? (layoutPricing.pricePer100x100Dual ?? vendorPricePer100x100Dual)
                            : (layoutPricing.pricePer100x100Single ?? vendorPricePer100x100Single);
                          const shopW = item.shop.width || 0;
                          const shopH = (item.shop as any).height ?? item.shop.width ?? 0;
                          const areaUnits = shopW * shopH;
                          const blocks = areaUnits / (100 * 100);
                          const est = pricePerBlock ? Math.max(0, Math.round(blocks * pricePerBlock)) : 0;
                          return `₹${est.toLocaleString()}`;
                        })()}</span></div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveShop(item.shop._id)}
                      className="text-red-600 hover:text-red-700 ml-4"
                      title="Remove from cart"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Proposed Monthly Rent (₹) *
                    </label>
                    <input
                      type="number"
                      value={item.proposedPrice}
                      onChange={(e) => handlePriceChange(item.shop._id, e.target.value)}
                      placeholder="Enter your proposed rent"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                      min="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      You can propose a different rent. The station manager will review and negotiate with you.
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">Total Applications</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedShops.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Proposed Rent</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    ₹{selectedShops.reduce((sum, item) => sum + (parseFloat(item.proposedPrice) || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedShops([])}
                  className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50"
                >
                  Clear Cart
                </button>
                <button
                  onClick={() => {
                    const missing = selectedShops.filter(s => !s.shopName || !s.shopName.trim());
                    if (missing.length > 0) {
                      toast.error(`Please enter official Shop Name for ${missing.length} selected shop(s)`);
                      return;
                    }
                    setStep(3);
                  }}
                  disabled={selectedShops.length === 0}
                  className="w-full bg-indigo-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Review & Submit ({selectedShops.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instruction Card */}
        {selectedShops.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="shrink-0">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">How to Apply for Shops</h3>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Click on any green (available) shop to add it to your cart</li>
                  <li>You can select multiple shops from different platforms</li>
                  <li>Set your proposed rent for each shop</li>
                  <li>Submit all applications at once</li>
                  <li>Each application will go through separate negotiation with the station manager</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <ProtectedRoute allowedRoles={['VENDOR']}>
      <VendorLayout
        title="Apply for Shop"
        subtitle="Browse available shops and submit your application"
      >
        {checkingValidation ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking your profile status...</p>
          </div>
        ) : !validationStatus?.isValid ? (
          <div className="max-w-4xl mx-auto">
            <Alert
              type="warning"
              title="Complete Your Profile to Apply"
              message="Before you can apply for a shop, you need to complete your profile and upload required documents."
              className="mb-6"
              actions={
                <div className="space-y-3">
                  {!validationStatus?.profileComplete && (
                    <div>
                      <h4 className="font-medium text-yellow-800 mb-2">Missing Profile Information:</h4>
                      <ul className="list-disc list-inside text-yellow-700 ml-2 mb-3">
                        {validationStatus?.missingProfileFields.map((field) => (
                          <li key={field}>{field.replace(/([A-Z])/g, ' $1').trim()}</li>
                        ))}
                      </ul>
                      <a
                        href="/vendor/profile"
                        className="inline-block bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        Complete Profile
                      </a>
                    </div>
                  )}
                  
                  {!validationStatus?.documentsComplete && (
                    <div className="pt-3 border-t border-yellow-200">
                      <h4 className="font-medium text-yellow-800 mb-2">Required Documents Not Uploaded:</h4>
                      <ul className="list-disc list-inside text-yellow-700 ml-2 mb-3">
                        {validationStatus?.missingDocuments.map((doc) => (
                          <li key={doc}>{doc.replace(/_/g, ' ')}</li>
                        ))}
                      </ul>
                      <a
                        href="/vendor/documents"
                        className="inline-block bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        Upload Documents
                      </a>
                    </div>
                  )}
                </div>
              }
            />
            
            <div className="text-center">
              <a
                href="/vendor/dashboard"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back to Dashboard
              </a>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {/* Progress Steps */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-center">
                <div className="flex items-center space-x-8">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      1
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-900">Select Station</span>
                  </div>
                  
                  <ArrowRightIcon className="w-5 h-5 text-gray-400" />
                  
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      2
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-900">Choose Shops</span>
                  </div>
                  
                  <ArrowRightIcon className="w-5 h-5 text-gray-400" />
                  
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      3
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-900">Review & Submit</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step Content */}
            {step === 1 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <BuildingStorefrontIcon className="w-6 h-6 text-blue-600 mr-3" />
                    Select Railway Station
                  </h2>
                  <p className="text-gray-600 mt-1">Choose the station where you want to apply for a shop</p>
                </div>

                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading stations...</p>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {stations.map((station) => (
                        <div
                          key={station._id}
                          onClick={() => handleStationSelect(station)}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {station.stationName}
                              </h3>
                              <p className="text-sm text-gray-500 mt-1">
                                {station.stationCode} • {station.railwayZone}
                              </p>
                              <div className="mt-2 flex items-center text-sm text-gray-600">
                                <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                                  {station.stationCategory}
                                </span>
                                <span className="ml-2">
                                  {station.platformsCount} Platform{station.platformsCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                            <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Review & Submit Applications</h2>
                      <p className="text-gray-600 mt-1">Review your selection before submitting all applications.</p>
                    </div>
                    <div>
                      <button onClick={() => setStep(2)} className="text-sm text-gray-600 hover:text-gray-800">← Back to Shop Selection</button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 border border-gray-100 rounded">
                      <p className="text-sm text-gray-600">Station</p>
                      <h3 className="text-lg font-semibold">{selectedStation?.stationName} ({selectedStation?.stationCode})</h3>
                    </div>

                    {selectedShops.map((item, idx) => (
                      <div key={item.shop._id} className="p-4 border border-gray-100 rounded flex items-start justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Shop {idx + 1}</p>
                          <h4 className="font-semibold">{item.shopName || (item.shop as any).shopNumber || `Area ${idx + 1}`}</h4>
                          <p className="text-sm text-gray-600">Platform {item.platform.platformNumber} • Width: {item.shop.width}m</p>
                          <p className="text-sm text-gray-600 mt-2">{item.shopDescription || ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Proposed Rent</p>
                          <p className="text-lg font-bold">₹{(parseFloat(item.proposedPrice) || 0).toLocaleString()}/month</p>
                        </div>
                      </div>
                    ))}

                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Total Applications</p>
                          <p className="text-2xl font-bold text-gray-900">{selectedShops.length}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total Proposed Rent</p>
                          <p className="text-2xl font-bold text-indigo-600">₹{selectedShops.reduce((sum, item) => sum + (parseFloat(item.proposedPrice) || 0), 0).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <button onClick={() => setStep(2)} className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg">Edit Selection</button>
                        <button
                          onClick={handleSubmitApplication}
                          disabled={submitting || selectedShops.length === 0}
                          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? 'Submitting Applications...' : `Submit ${selectedShops.length} Application${selectedShops.length !== 1 ? 's' : ''}`}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                {/* Station Header */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                        <MapIcon className="w-6 h-6 text-blue-600 mr-3" />
                        {selectedStation?.stationName}
                      </h2>
                      <p className="text-gray-600">Select shops from the layout below</p>
                    </div>
                    <button
                      onClick={() => setStep(1)}
                      className="flex items-center text-gray-600 hover:text-gray-800"
                    >
                      <ArrowLeftIcon className="w-4 h-4 mr-1" />
                      Change Station
                    </button>
                  </div>
                </div>

                {/* Shopping Cart */}
                {selectedShops.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                      <ShoppingCartIcon className="w-5 h-5 text-green-600 mr-2" />
                      Selected Shops ({selectedShops.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedShops.map((item, idx) => (
                          <div key={item.shop._id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">
                                {item.shopName || (item.shop as any).shopNumber || `Shop ${idx + 1}`} • Platform {item.platform.platformNumber}
                              </p>
                              <p className="text-sm text-gray-600">Width: {item.shop.width}m</p>
                              <div className="mt-2">
                                <input
                                  type="text"
                                  value={item.shopName || ''}
                                  onChange={(e) => setSelectedShops(selectedShops.map(s => s.shop._id === item.shop._id ? { ...s, shopName: e.target.value } : s))}
                                  placeholder="Enter official shop name (required)"
                                  className="mt-1 w-64 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                  required
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center">
                                <CurrencyRupeeIcon className="w-4 h-4 text-gray-400" />
                                <input
                                  type="number"
                                  value={item.proposedPrice}
                                  onChange={(e) => handlePriceChange(item.shop._id, e.target.value)}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  min="1"
                                />
                                <span className="text-sm text-gray-500 ml-1">/mo</span>
                              </div>
                              <button
                                onClick={() => handleRemoveShop(item.shop._id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">
                        Total: ₹{selectedShops.reduce((sum, item) => sum + (parseFloat(item.proposedPrice) || 0), 0).toLocaleString()}/month
                      </span>
                      <button
                        onClick={() => setStep(3)}
                        disabled={selectedShops.length === 0}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Review & Submit ({selectedShops.length})
                      </button>
                    </div>
                  </div>
                )}

                {/* Station Layout */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Station Layout</h3>
                  {renderStationLayout()}
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                    How to Apply
                  </h4>
                  <ul className="text-blue-700 space-y-1 text-sm">
                    <li>• Click on any green (available) shop to add it to your cart</li>
                    <li>• Set your proposed monthly rent for each shop</li>
                    <li>• You can select multiple shops from different platforms</li>
                    <li>• Submit all applications at once for review</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </VendorLayout>
    </ProtectedRoute>
  );
}

