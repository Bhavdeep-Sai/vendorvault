/**
 * ShopZoneEditor Component
 * 
 * Interactive editor for shop allocation zones
 * Supports adding, moving, resizing, and deleting shop zones
 */

'use client';

import React, { useState } from 'react';
import { useLayoutStore } from '@/store/layoutStore';
import { ShopCategory, SHOP_CATEGORY_COLORS, CANVAS_CONSTANTS } from '@/types/layout';

export const ShopZoneEditor: React.FC = () => {
  const {
    layout,
    selectedPlatformId,
    selectedShopZoneId,
    addShopZone,
    removeShopZone,
    updateShopZone,
    selectShopZone,
  } = useLayoutStore();

  const [newShopWidth, setNewShopWidth] = useState(100);
  const [shopCounter, setShopCounter] = useState(1);
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (!layout) return null;

  // Find selected platform from independent platforms array
  const selectedPlatform = (layout.platforms || []).find(
    platform => platform.id === selectedPlatformId
  );

  // Find selected shop zone
  const selectedShopZone = selectedPlatform?.shops.find(
    shop => shop.id === selectedShopZoneId
  );

  const handleAddShopZone = () => {
    if (!selectedPlatform) {
      alert('Please select a platform first');
      return;
    }

    // Find the next available position
    const existingShops = selectedPlatform.shops.sort((a, b) => a.x - b.x);
    let startX = 0;

    if (existingShops.length > 0) {
      const lastShop = existingShops[existingShops.length - 1];
      if (lastShop) {
        startX = lastShop.x + lastShop.width + 10; // 10px gap
      }
    }

    // Check if there's enough space
    if (startX + newShopWidth > selectedPlatform.length) {
      alert('Not enough space on the platform');
      return;
    }

    // CHECK: Validate shop doesn't overlap with restricted zones
    const shopEndX = startX + newShopWidth;
    const overlapsRestricted = selectedPlatform.restrictedZones?.some(zone => {
      // For track-side zones (horizontal strip at bottom), shops are automatically constrained by height
      // For end zones (vertical strips), check x-position overlap
      if (zone.side === 'track') {
        return false; // Track-side zones don't block horizontal placement, only constrain height
      }
      const zoneEndX = zone.x + zone.width;
      return !(shopEndX <= zone.x || startX >= zoneEndX);
    });

    if (overlapsRestricted) {
      alert('Cannot place shop in restricted zone');
      return;
    }

    addShopZone(selectedPlatform.id, {
      x: startX,
      width: newShopWidth,
      category: 'general', // Generic allocation area
      minWidth: CANVAS_CONSTANTS.MIN_SHOP_WIDTH,
      maxWidth: CANVAS_CONSTANTS.MAX_SHOP_WIDTH,
      isAllocated: false,
    });
    
    setShopCounter(prev => prev + 1);
  };

  const handleDeleteShopZone = () => {
    if (!selectedShopZoneId) return;
    
    if (confirm('Are you sure you want to delete this shop zone?')) {
      removeShopZone(selectedShopZoneId);
    }
  };

  const handleUpdateCategory = (category: ShopCategory) => {
    if (!selectedShopZoneId) return;
    updateShopZone(selectedShopZoneId, { category });
  };

  const handleUpdateWidth = (width: number) => {
    if (!selectedShopZoneId) return;
    const clampedWidth = Math.max(
      CANVAS_CONSTANTS.MIN_SHOP_WIDTH,
      Math.min(CANVAS_CONSTANTS.MAX_SHOP_WIDTH, width)
    );
    // Update both width and height to maintain square proportions
    updateShopZone(selectedShopZoneId, { width: clampedWidth, height: clampedWidth });
  };

  const handleUpdateHeight = (height: number) => {
    if (!selectedShopZoneId) return;
    const clampedHeight = Math.max(
      CANVAS_CONSTANTS.MIN_SHOP_WIDTH,
      Math.min(CANVAS_CONSTANTS.MAX_SHOP_WIDTH, height)
    );
    // Update both height and width to maintain square proportions
    updateShopZone(selectedShopZoneId, { height: clampedHeight, width: clampedHeight });
  };

  if (isCollapsed) {
    return (
      <div className="w-10 h-full bg-gray-50 border-l border-gray-200 flex flex-col items-center py-2">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          title="Expand Shop Area Manager"
        >
          <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 h-full bg-white border-l border-gray-200 shadow-xl flex flex-col">
      <div className="flex-1 overflow-y-auto shop-editor-scroll">
        <div className="p-3 pb-20 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-800">
            Shop Area Manager
          </h3>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Collapse"
          >
            <svg className="w-3.5 h-3.5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        {/* Platform Info */}
        {selectedPlatform ? (
          <div className="p-3 bg-white rounded-lg border border-gray-200">
            <div className="text-sm font-semibold mb-2">Selected Platform</div>
            <div className="text-xs text-gray-600">
              Platform {selectedPlatform.platformNumber}
            </div>
            <div className="text-xs text-gray-600">
              Length: {selectedPlatform.length}px
            </div>
            <div className="text-xs text-gray-600">
              Shops: {selectedPlatform.shops.length}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              Select a platform to add shop zones
            </p>
          </div>
        )}

        {/* Add Shop Zone */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-800">Add Shop Area</h4>
          <p className="text-[10px] text-gray-500">Create generic shop areas for vendor allocation</p>
          
          <div>
            <label className="block text-[10px] font-medium mb-1 text-gray-700">
              Width: {newShopWidth}px
            </label>
            <input
              type="range"
              min={CANVAS_CONSTANTS.MIN_SHOP_WIDTH}
              max={CANVAS_CONSTANTS.MAX_SHOP_WIDTH}
              value={newShopWidth}
              onChange={(e) => setNewShopWidth(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <button
            onClick={handleAddShopZone}
            disabled={!selectedPlatform}
            className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-xs font-medium transition-colors"
          >
            Add Shop Area
          </button>
        </div>

        {/* Edit Selected Shop Zone */}
        {selectedShopZone && (
          <div className="space-y-2 p-2.5 bg-white rounded-md border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-800">Edit Shop Area</h4>

            <div className="h-10 rounded flex items-center justify-center bg-blue-500 text-white text-xs font-medium">
              {selectedShopZone.isAllocated ? 'ALLOCATED' : 'AVAILABLE'}
            </div>

            <div className="text-[10px] text-gray-600">
              <p>Generic shop area - can be allocated to any vendor business type</p>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700">
                Width: {selectedShopZone.width}px (Height: {selectedShopZone.height || selectedShopZone.width}px)
              </label>
              <input
                type="range"
                min={selectedShopZone.minWidth}
                max={selectedShopZone.maxWidth}
                value={selectedShopZone.width}
                onChange={(e) => handleUpdateWidth(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-[10px] text-gray-500 mt-1">Adjusting width also adjusts height (square)</p>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700">
                Height: {selectedShopZone.height || selectedShopZone.width}px
              </label>
              <input
                type="range"
                min={selectedShopZone.minWidth}
                max={selectedShopZone.maxWidth}
                value={selectedShopZone.height || selectedShopZone.width}
                onChange={(e) => handleUpdateHeight(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-[10px] text-gray-500 mt-1">Adjusting height also adjusts width (square)</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600">Position:</span>
                <span className="ml-1 font-medium text-gray-800">{selectedShopZone.x}px</span>
              </div>
              <div>
                <span className="text-gray-600">Size:</span>
                <span className="ml-1 font-medium text-gray-800">{selectedShopZone.width}×{selectedShopZone.height || selectedShopZone.width}px</span>
              </div>
            </div>

            {selectedShopZone.isAllocated && (
              <div className="p-2 bg-green-50 rounded text-xs">
                <span className="text-green-800">
                  ✓ Allocated to vendor
                </span>
              </div>
            )}

            <button
              onClick={handleDeleteShopZone}
              className="w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
            >
              Delete Shop Zone
            </button>
          </div>
        )}

        {/* Shop Areas List */}
        {selectedPlatform && selectedPlatform.shops.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-gray-800">Shop Areas</h4>
            <div className="space-y-1.5">
              {selectedPlatform.shops
                .sort((a, b) => a.x - b.x)
                .map((shop, idx) => (
                  <button
                    key={shop.id}
                    onClick={() => selectShopZone(shop.id)}
                    className={`w-full p-1.5 rounded text-left text-[10px] transition-all ${
                      selectedShopZoneId === shop.id
                        ? 'ring-2 ring-blue-500 bg-blue-50'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-2.5 h-2.5 rounded-full ${shop.isAllocated ? 'bg-red-500' : 'bg-green-500'}`} />
                      <span className="font-medium text-gray-800">Area {idx + 1}</span>
                      <span className="text-gray-500">{shop.width}px</span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

