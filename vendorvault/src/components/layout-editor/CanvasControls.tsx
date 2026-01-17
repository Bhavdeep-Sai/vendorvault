/**
 * CanvasControls Component
 * 
 * Control panel for zoom, pan, grid, and other canvas settings
 */

'use client';

import React from 'react';
import { useLayoutStore } from '@/store/layoutStore';
import { CANVAS_CONSTANTS } from '@/types/layout';

export const CanvasControls: React.FC = () => {
  const {
    zoom,
    showGrid,
    snapToGrid,
    setZoom,
    toggleGrid,
    toggleSnapToGrid,
    resetView,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useLayoutStore();

  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const handleZoomIn = () => {
    setZoom(zoom + CANVAS_CONSTANTS.ZOOM_STEP);
  };

  const handleZoomOut = () => {
    setZoom(zoom - CANVAS_CONSTANTS.ZOOM_STEP);
  };

  const handleZoomReset = () => {
    resetView();
  };

  if (isCollapsed) {
    return (
      <div className="absolute top-3 right-16 z-30">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 bg-white rounded-md shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          title="Show Controls"
        >
          <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1"/>
            <circle cx="19" cy="12" r="1"/>
            <circle cx="5" cy="12" r="1"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-3 right-16 bg-white rounded-md shadow-lg p-2 space-y-1.5 z-30 border border-gray-200">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-gray-700">Controls</span>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-0.5 hover:bg-gray-200 rounded transition-colors"
          title="Hide Controls"
        >
          <svg className="w-3 h-3 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Zoom Controls */}
      <div className="space-y-1">
        <div className="text-[10px] font-semibold text-gray-700 mb-1">
          Zoom: {Math.round(zoom * 100)}%
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= CANVAS_CONSTANTS.MIN_ZOOM}
            className="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-gray-800"
            title="Zoom Out"
          >
            −
          </button>
          <button
            onClick={handleZoomReset}
            className="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-[10px] text-gray-800"
            title="Reset Zoom"
          >
            100%
          </button>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= CANVAS_CONSTANTS.MAX_ZOOM}
            className="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-gray-800"
            title="Zoom In"
          >
            +
          </button>
        </div>
      </div>

      {/* Grid Controls */}
      <div className="space-y-1 pt-1.5 border-t border-gray-200">
        <button
          onClick={toggleGrid}
          className={`w-full px-2 py-1 rounded text-[10px] font-medium transition-colors ${
            showGrid
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          {showGrid ? '✓' : ''} Show Grid
        </button>
        <div className="text-[9px] text-gray-600 px-2 py-1">
          💡 Click & drag canvas to pan
        </div>
      </div>

      {/* Undo/Redo */}
      <div className="flex gap-1 pt-1.5 border-t border-gray-200">
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="flex-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed text-[10px] text-gray-800"
          title="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="flex-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed text-[10px] text-gray-800"
          title="Redo (Ctrl+Y)"
        >
          ↷
        </button>
      </div>
    </div>
  );
};

