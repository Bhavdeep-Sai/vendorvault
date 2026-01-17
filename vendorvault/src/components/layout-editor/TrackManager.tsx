/**
 * TrackManager Component
 * 
 * Panel for managing tracks, platforms, and restricted zones independently
 */

'use client';

import React, { useState } from 'react';
import { useLayoutStore } from '@/store/layoutStore';

export const TrackManager: React.FC = () => {
  const {
    layout,
    removePlatform,
    selectPlatform,
    selectedPlatformId,
    togglePlatformInvert,
  } = useLayoutStore();

  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!layout) return null;

  if (isCollapsed) {
    return (
      <div className="w-10 h-full bg-white border-r border-gray-200 flex flex-col items-center py-2">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          title="Expand Track Manager"
        >
          <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 h-full bg-white border-r border-gray-200 shadow-xl flex flex-col">
      <div className="p-3 space-y-4 flex-1 overflow-y-auto track-manager-scroll">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-800">
            Track Manager
          </h3>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Collapse"
          >
            <svg className="w-3.5 h-3.5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        </div>

        {/* Add Items Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-800">Add Elements</h4>
          
          {/* Add Complete Platform Button */}
          <button
            onClick={() => useLayoutStore.getState().addCompletePlatform()}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Platform
          </button>
          
          <div className="text-[10px] text-gray-500 italic text-center">
            Platform with track and no-shop zone
          </div>

          {/* Add Dual-Track Platform Button */}
          <button
            onClick={() => useLayoutStore.getState().addDualTrackPlatform()}
            className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16M4 19h16M4 12h16" />
            </svg>
            2-Track Platform
          </button>
          
          <div className="text-[10px] text-gray-500 italic text-center">
            Platform between two tracks
          </div>
        </div>

        {/* Platforms List */}
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-800">
              Railway Platforms
            </h4>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {layout.platforms?.reduce((count, p) => count + (p.isDualTrack ? 2 : 1), 0) || 0}
            </span>
          </div>
          
          {(!layout.platforms || layout.platforms.length === 0) ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-xs text-gray-500">No platforms added yet</p>
              <p className="text-[10px] text-gray-400 mt-1">Click "Add Platform" to create one</p>
            </div>
          ) : (
            <div className="space-y-2">
              {layout.platforms.map((platform) => (
                <div
                  key={platform.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedPlatformId === platform.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow'
                  }`}
                  onClick={() => selectPlatform(platform.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-700">
                          {platform.isDualTrack 
                            ? `${platform.platformNumber}-${parseInt(platform.platformNumber) + 1}`
                            : platform.platformNumber
                          }
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">
                          Platform {platform.isDualTrack 
                            ? `${platform.platformNumber}-${parseInt(platform.platformNumber) + 1}`
                            : platform.platformNumber
                          }
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {platform.shops?.length || 0} shop{platform.shops?.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Invert button - only for single-track platforms */}
                      {!platform.isDualTrack && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePlatformInvert(platform.id);
                          }}
                          className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                            platform.isInverted
                              ? 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                              : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                          title={platform.isInverted ? 'Track on top - Click to move to bottom' : 'Track on bottom - Click to move to top'}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove Platform ${platform.isDualTrack 
                            ? `${platform.platformNumber}-${parseInt(platform.platformNumber) + 1}`
                            : platform.platformNumber
                          }?`)) removePlatform(platform.id);
                        }}
                        className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  
                  {/* Platform Info */}
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="flex items-center gap-1 text-gray-600">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                      </svg>
                      <span>
                        {platform.isDualTrack 
                          ? `Track ${platform.topTrack?.trackNumber}-${platform.bottomTrack?.trackNumber}`
                          : `Track ${platform.track?.trackNumber}`
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>{platform.length}px long</span>
                    </div>
                  </div>
                  
                  {selectedPlatformId === platform.id && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <p className="text-[10px] text-blue-600">
                        ✓ Selected - Add shops using Shop Zone Editor
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

