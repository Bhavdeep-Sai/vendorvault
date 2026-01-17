/**
 * Layout Preview Modal
 * Shows how vendors will see the station layout with visual canvas
 */

'use client';

import React from 'react';
import { useLayoutStore } from '@/store/layoutStore';
import { SHOP_CATEGORY_COLORS } from '@/types/layout';

interface LayoutPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LayoutPreviewModal: React.FC<LayoutPreviewModalProps> = ({ isOpen, onClose }) => {
  const { layout } = useLayoutStore();

  if (!isOpen || !layout) return null;

  const platforms = layout.platforms || [];
  const tracks = layout.tracks || [];
  const infrastructureBlocks = layout.infrastructureBlocks || [];
  const totalShops = platforms.reduce((acc, p) => acc + p.shops.length, 0);
  const availableShops = platforms.reduce((acc, p) => acc + p.shops.filter(s => !s.isAllocated).length, 0);

  // Calculate canvas bounds (include infrastructure in bounds calculation)
  const allElements = [...tracks, ...platforms, ...infrastructureBlocks.map(b => ({
    x: b.position.x,
    y: b.position.y,
    length: b.dimensions.width,
    width: b.dimensions.height
  }))];
  const minX = Math.min(...allElements.map(e => e.x || 0), 0) - 150; // Extra space for labels
  const maxX = Math.max(...allElements.map(e => (e.x || 0) + (e.length || 1000))) + 100;
  const minY = Math.min(...allElements.map(e => e.y || 0), 0) - 100;
  const maxY = Math.max(...allElements.map(e => (e.y || 0) + ((e as any).width || 60))) + 100;

  const canvasWidth = maxX - minX;
  const canvasHeight = maxY - minY;
  const scale = Math.min(800 / canvasWidth, 500 / canvasHeight, 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Vendor Preview - {layout.stationName}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              This is how vendors will see your station layout
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center gap-8 text-sm">
            <div>
              <span className="text-gray-600">Total Platforms:</span>
              <span className="ml-2 font-bold text-blue-600">{platforms.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Total Shop Zones:</span>
              <span className="ml-2 font-bold text-blue-600">{totalShops}</span>
            </div>
            <div>
              <span className="text-gray-600">Available:</span>
              <span className="ml-2 font-bold text-green-600">{availableShops}</span>
            </div>
            <div>
              <span className="text-gray-600">Allocated:</span>
              <span className="ml-2 font-bold text-red-600">{totalShops - availableShops}</span>
            </div>
          </div>
        </div>

        {/* Visual Canvas Preview */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          <div className="bg-white rounded-lg border-2 border-gray-300 p-4 overflow-auto" style={{ minHeight: '500px' }}>
            <div
              className="relative"
              style={{
                width: canvasWidth * scale,
                height: canvasHeight * scale,
                margin: '0 auto',
              }}
            >
              {/* Render Tracks */}
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="absolute"
                  style={{
                    left: (track.x - minX) * scale,
                    top: (track.y - minY) * scale,
                    width: track.length * scale,
                    height: 60 * scale,
                    backgroundColor: '#4B5563',
                    border: '3px solid #1F2937',
                    zIndex: 1,
                  }}
                >
                  <div
                    className="absolute text-xs font-bold text-white"
                    style={{ 
                      fontSize: Math.max(10, 12 * scale),
                      left: '-40px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  >
                    T{track.trackNumber}
                  </div>
                </div>
              ))}

              {/* Render Platforms */}
              {platforms.map((platform) => (
                <React.Fragment key={platform.id}>
                  {/* Dual-Track Configuration: Top Track */}
                  {platform.isDualTrack && platform.topTrack && (
                    <div
                      className="absolute"
                      style={{
                        left: (platform.x - minX) * scale,
                        top: ((platform.y - (platform.topRestrictedZone?.height || 0) - platform.topTrack.height) - minY) * scale,
                        width: platform.length * scale,
                        height: platform.topTrack.height * scale,
                        backgroundColor: '#4B5563',
                        border: '2px solid #1F2937',
                        zIndex: 1,
                      }}
                    >
                      <div
                        className="absolute text-xs font-bold text-white"
                        style={{ 
                          fontSize: Math.max(8, 10 * scale),
                          left: '-35px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                      >
                        T{platform.topTrack.trackNumber}
                      </div>
                    </div>
                  )}

                  {/* Dual-Track: Top Restricted Zone */}
                  {platform.isDualTrack && platform.topRestrictedZone && (
                    <div
                      className="absolute"
                      style={{
                        left: (platform.x - minX) * scale,
                        top: ((platform.y - platform.topRestrictedZone.height) - minY) * scale,
                        width: platform.length * scale,
                        height: platform.topRestrictedZone.height * scale,
                        backgroundColor: '#DC2626',
                        border: '2px solid #991B1B',
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)',
                        zIndex: 2,
                      }}
                    />
                  )}

                  {/* Main Platform */}
                  <div
                    className="absolute"
                    style={{
                      left: (platform.x - minX) * scale,
                      top: (platform.y - minY) * scale,
                      width: platform.length * scale,
                      height: platform.width * scale,
                      backgroundColor: '#F3F4F6',
                      border: '3px solid #1F2937',
                      zIndex: 2,
                    }}
                  >
                    <div
                      className="absolute text-xs font-bold text-white"
                      style={{ 
                        fontSize: Math.max(10, 12 * scale),
                        left: '-40px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                      }}
                    >
                      P{platform.platformNumber}
                      {platform.isDualTrack && `-${parseInt(platform.platformNumber) + 1}`}
                    </div>

                    {/* Render Shops on Platform */}
                    {platform.shops.map((shop) => {
                      // Calculate square dimensions and vertical centering
                      const shopHeight = shop.height || shop.width;
                      const topOffset = (platform.width - shopHeight) / 2;
                      
                      return (
                        <div
                          key={shop.id}
                          className="absolute"
                          style={{
                            left: shop.x * scale,
                            top: topOffset * scale,
                            width: shop.width * scale,
                            height: shopHeight * scale,
                            backgroundColor: SHOP_CATEGORY_COLORS[shop.category],
                            opacity: shop.isAllocated ? 0.5 : 0.8,
                            border: '2px solid rgba(0,0,0,0.3)',
                            zIndex: 3,
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div
                                className="font-bold text-gray-900 capitalize"
                                style={{ fontSize: Math.max(8, 10 * scale) }}
                              >
                                {shop.category}
                              </div>
                              {shop.isAllocated && (
                                <div
                                  className="text-red-700 font-bold"
                                  style={{ fontSize: Math.max(7, 8 * scale) }}
                                >
                                  ALLOCATED
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                  {/* Single-Track: Restricted Zone - position depends on isInverted */}
                  {!platform.isDualTrack && platform.restrictedZone && (
                    <div
                      className="absolute"
                      style={{
                        left: (platform.x - minX) * scale,
                        top: platform.isInverted
                          ? ((platform.y - platform.restrictedZone.height) - minY) * scale
                          : ((platform.y + platform.width) - minY) * scale,
                        width: platform.length * scale,
                        height: platform.restrictedZone.height * scale,
                        backgroundColor: '#DC2626',
                        border: '2px solid #991B1B',
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)',
                        zIndex: 2,
                      }}
                    />
                  )}

                  {/* Single-Track: Track - position depends on isInverted */}
                  {!platform.isDualTrack && platform.track && (
                    <div
                      className="absolute"
                      style={{
                        left: (platform.x - minX) * scale,
                        top: platform.isInverted
                          ? ((platform.y - (platform.restrictedZone?.height || 0) - platform.track.height) - minY) * scale
                          : ((platform.y + platform.width + (platform.restrictedZone?.height || 0)) - minY) * scale,
                        width: platform.length * scale,
                        height: platform.track.height * scale,
                        backgroundColor: '#4B5563',
                        border: '2px solid #1F2937',
                        zIndex: 1,
                      }}
                    >
                      <div
                        className="absolute text-xs font-bold text-white"
                        style={{ 
                          fontSize: Math.max(8, 10 * scale),
                          left: '-35px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                      >
                        T{platform.track.trackNumber}
                      </div>
                    </div>
                  )}

                  {/* Dual-Track: Bottom Restricted Zone */}
                  {platform.isDualTrack && platform.bottomRestrictedZone && (
                    <div
                      className="absolute"
                      style={{
                        left: (platform.x - minX) * scale,
                        top: ((platform.y + platform.width) - minY) * scale,
                        width: platform.length * scale,
                        height: platform.bottomRestrictedZone.height * scale,
                        backgroundColor: '#DC2626',
                        border: '2px solid #991B1B',
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)',
                        zIndex: 2,
                      }}
                    />
                  )}

                  {/* Dual-Track: Bottom Track */}
                  {platform.isDualTrack && platform.bottomTrack && (
                    <div
                      className="absolute"
                      style={{
                        left: (platform.x - minX) * scale,
                        top: ((platform.y + platform.width + (platform.bottomRestrictedZone?.height || 0)) - minY) * scale,
                        width: platform.length * scale,
                        height: platform.bottomTrack.height * scale,
                        backgroundColor: '#4B5563',
                        border: '2px solid #1F2937',
                        zIndex: 1,
                      }}
                    >
                      <div
                        className="absolute text-xs font-bold text-white"
                        style={{ 
                          fontSize: Math.max(8, 10 * scale),
                          left: '-35px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                      >
                        T{platform.bottomTrack.trackNumber}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}

              {/* Render Infrastructure Blocks */}
              {infrastructureBlocks.map((block, index) => (
                <div
                  key={block.id || `infra-${index}`}
                  className="absolute"
                  style={{
                    left: (block.position.x - minX) * scale,
                    top: (block.position.y - minY) * scale,
                    width: block.dimensions.width * scale,
                    height: block.dimensions.height * scale,
                    backgroundColor: block.isConnector 
                      ? 'rgba(147, 51, 234, 0.4)' 
                      : 'rgba(59, 130, 246, 0.4)',
                    border: `2px solid ${block.isConnector ? '#9333ea' : '#3b82f6'}`,
                    borderRadius: '4px',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <div 
                    className="text-white font-bold text-center px-1"
                    style={{ 
                      fontSize: Math.max(8, 10 * scale),
                      wordBreak: 'break-word',
                    }}
                  >
                    {block.type.replace(/_/g, ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
            <h3 className="font-bold text-sm mb-2 text-gray-800">Shop Categories:</h3>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(SHOP_CATEGORY_COLORS).map(([category, color]) => (
                <div key={category} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs capitalize text-gray-700">{category}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};

