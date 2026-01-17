/**
 * StationCanvas Component
 *
 * Main canvas component that renders the station layout
 * with tracks, platforms, and shop zones
 */

"use client";

import React, { useRef } from "react";
import { useLayoutStore } from "@/store/layoutStore";
import {
  CANVAS_CONSTANTS,
  type Track,
  type Platform,
  type RestrictedZone,
  type InfrastructureBlock,
  type ElementGroup,
  type StationLayout,
  type ShopZone,
} from "@/types/layout";

export const StationCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = React.useState(false);
  const [panStart, setPanStart] = React.useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });

  const {
    layout,
    zoom,
    panOffset,
    showGrid,
    selectedTrackId,
    selectedPlatformId,
    selectedElementIds,
    selectedGroupId,
    selectTrack,
    selectPlatform,
    toggleElementSelection,
    selectGroup,
    moveGroup,
    setPanOffset,
    clearSelection,
    setZoom,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useLayoutStore();

  // Center the origin on initial mount
  React.useEffect(() => {
    if (canvasRef.current && panOffset.x === 100 && panOffset.y === 100) {
      const rect = canvasRef.current.getBoundingClientRect();
      setPanOffset({ x: rect.width / 2, y: rect.height / 2 });
    }
  }, [panOffset.x, panOffset.y, setPanOffset]);

  // Canvas panning handlers - useEffect must be before conditional returns
  React.useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - panStart.x;
      const newY = e.clientY - panStart.y;
      setPanOffset({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPanning, panStart, setPanOffset]);

  if (!layout) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">No Layout Loaded</h3>
          <p className="text-gray-600">
            Initialize a new layout or load an existing one
          </p>
        </div>
      </div>
    );
  }

  // Canvas panning handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only pan when clicking on the background (not on elements)
    if (
      e.target === e.currentTarget ||
      (e.target as HTMLElement).classList.contains("canvas-background")
    ) {
      clearSelection(); // Deselect all elements when clicking background
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      e.preventDefault();
    }
  };

  // Track mouse position for coordinates display
  const handleMouseMove = (e: React.MouseEvent) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.round((e.clientX - rect.left - panOffset.x) / zoom);
      const y = Math.round((e.clientY - rect.top - panOffset.y) / zoom);
      setMousePos({ x, y });
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const delta = -e.deltaY * 0.001;
      const newZoom = Math.max(
        CANVAS_CONSTANTS.MIN_ZOOM,
        Math.min(CANVAS_CONSTANTS.MAX_ZOOM, zoom + delta)
      );
      setZoom(newZoom);
    }
  };

  return (
    <div
      ref={canvasRef}
      className={`relative w-full h-full bg-gray-50 overflow-hidden ${
        isPanning ? "cursor-grabbing" : "cursor-grab"
      }`}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
    >
      {/* Coordinate Display with Undo/Redo - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-50 bg-black/80 text-white rounded-lg font-mono text-xs flex items-center gap-3 shadow-2xl">
        <div className="px-3 py-2 flex flex-col gap-1 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Cursor:</span>
            <span>
              X: {mousePos.x} Y: {mousePos.y}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Zoom:</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
        </div>
        <div className="flex gap-1 pr-2 pointer-events-auto">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="p-1.5 hover:bg-white/20 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="p-1.5 hover:bg-white/20 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className="canvas-background absolute inset-0"
        style={{
          minHeight: "3000px",
          minWidth: "3000px",
          backgroundImage: showGrid
            ? `radial-gradient(circle, rgba(229, 231, 235, 0.15) 1px, transparent 1px)`
            : "none",
          backgroundSize: `${CANVAS_CONSTANTS.GRID_SIZE}px ${CANVAS_CONSTANTS.GRID_SIZE}px`,
          backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
        }}
      >
        <div
          className="absolute"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: "top left",
            transition: isPanning ? "none" : "transform 0.1s ease-out",
          }}
        >
          {/* Origin Marker - Simple dot at center */}
          <div
            className="absolute pointer-events-none z-10"
            style={{
              left: "-6px",
              top: "-6px",
            }}
          >
            {/* Center dot with ring */}
            <div
              className="absolute bg-blue-500 rounded-full border-2 border-white shadow-lg"
              style={{
                width: "12px",
                height: "12px",
              }}
            />
            {/* Origin label */}
            <div
              className="absolute bg-blue-500 text-white px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap"
              style={{
                left: "18px",
                top: "-6px",
              }}
            >
              Origin (0, 0)
            </div>
          </div>

          {/* Render group containers first (behind elements) */}
          {(layout.groups || []).map((group) => (
            <GroupContainer
              key={group.id}
              group={group}
              layout={layout}
              isSelected={selectedGroupId === group.id}
              onSelectGroup={selectGroup}
              onMoveGroup={moveGroup}
            />
          ))}

          {/* Render all tracks */}
          {layout.tracks.map((track) => {
            // Check if track is part of a group
            const isInGroup = (layout.groups || []).some((g) =>
              g.elementIds.includes(track.id)
            );
            return (
              <TrackRenderer
                key={track.id}
                track={track}
                isSelected={
                  selectedTrackId === track.id ||
                  selectedElementIds.includes(track.id)
                }
                isInGroup={isInGroup}
                onSelectTrack={selectTrack}
                onToggleSelection={toggleElementSelection}
              />
            );
          })}

          {/* Render all platforms */}
          {(layout.platforms || []).map((platform) => {
            // Check if platform is part of a group
            const isInGroup = (layout.groups || []).some((g) =>
              g.elementIds.includes(platform.id)
            );
            return (
              <PlatformRenderer
                key={platform.id}
                platform={platform}
                isSelected={
                  selectedPlatformId === platform.id ||
                  selectedElementIds.includes(platform.id)
                }
                isInGroup={isInGroup}
                onSelectPlatform={selectPlatform}
                onToggleSelection={toggleElementSelection}
              />
            );
          })}

          {/* Render all restricted zones (red boxes) */}
          {(layout.restrictedZones || []).map((zone) => {
            // Check if zone is part of a group
            const isInGroup = (layout.groups || []).some((g) =>
              g.elementIds.includes(zone.id)
            );
            return (
              <RestrictedZoneRenderer
                key={zone.id}
                zone={zone}
                isSelected={selectedElementIds.includes(zone.id)}
                isInGroup={isInGroup}
                onToggleSelection={toggleElementSelection}
              />
            );
          })}

          {/* Render infrastructure blocks */}
          {layout.infrastructureBlocks.map((block, index) => (
            <InfrastructureBlockRenderer key={block.id || `infra-${index}`} block={block} />
          ))}
        </div>
      </div>
    </div>
  );
};

interface TrackRendererProps {
  track: Track;
  isSelected: boolean;
  isInGroup: boolean;
  onSelectTrack: (id: string) => void;
  onToggleSelection: (id: string) => void;
}

const TrackRenderer: React.FC<TrackRendererProps> = ({
  track,
  isSelected,
  isInGroup,
  onSelectTrack,
  onToggleSelection,
}) => {
  const { moveTrack, updateTrackLength } = useLayoutStore();
  const [isDragging, setIsDragging] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState<"left" | "right" | false>(
    false
  );
  const [dragStart, setDragStart] = React.useState({
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    startLength: 0,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (e.ctrlKey) {
      // Ctrl+Click for multi-select
      e.preventDefault();
      onToggleSelection(track.id);
      return;
    }

    if (!isInGroup) {
      // Only allow dragging if not in a group
      onSelectTrack(track.id);
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        startX: track.x,
        startY: track.y,
        startLength: track.length,
      });
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (isInGroup) return; // Don't allow resizing if in a group

    e.stopPropagation();
    onSelectTrack(track.id);
    setIsResizing("right");
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      startX: track.x,
      startY: track.y,
      startLength: track.length,
    });
  };

  React.useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const state = useLayoutStore.getState();
        const currentZoom = state.zoom || 1;
        const deltaX = (e.clientX - dragStart.x) / currentZoom;
        const deltaY = (e.clientY - dragStart.y) / currentZoom;
        const newX = dragStart.startX + deltaX;
        const newY = dragStart.startY + deltaY;
        moveTrack(track.id, newX, newY);
      } else if (isResizing) {
        const state = useLayoutStore.getState();
        const currentZoom = state.zoom || 1;
        const deltaX = (e.clientX - dragStart.x) / currentZoom;
        if (isResizing === "right") {
          const newLength = Math.max(100, dragStart.startLength + deltaX);
          updateTrackLength(track.id, newLength);
        } else if (isResizing === "left") {
          const newLength = Math.max(100, dragStart.startLength - deltaX);
          const newX = dragStart.startX + (dragStart.startLength - newLength);
          moveTrack(track.id, newX, track.y);
          updateTrackLength(track.id, newLength);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    isResizing,
    dragStart,
    track.id,
    track.y,
    moveTrack,
    updateTrackLength,
  ]);

  return (
    <div
      className={`absolute group ${isSelected ? "ring-2 ring-gray-500" : ""} ${
        isInGroup ? "pointer-events-none opacity-90" : ""
      } ${
        isDragging
          ? "cursor-grabbing"
          : "cursor-move hover:ring-2 hover:ring-gray-300"
      }`}
      style={{
        left: track.x,
        top: track.y,
        width: track.length,
        height: track.height,
        background: "#4B5563",
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="absolute -left-16 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-700">
        T{track.trackNumber}
      </div>

      {/* Resize handles for length - only show if not in group */}
      {!isInGroup && (
        <>
          {/* Left edge resize */}
          <div
            className="absolute top-0 left-0 w-2 h-full cursor-ew-resize bg-gray-600 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => {
              if (isInGroup) return;
              e.stopPropagation();
              onSelectTrack(track.id);
              setIsResizing("left");
              setDragStart({
                x: e.clientX,
                y: e.clientY,
                startX: track.x,
                startY: track.y,
                startLength: track.length,
              });
            }}
            style={{ zIndex: 10 }}
          />
          {/* Right edge resize */}
          <div
            className="absolute top-0 right-0 w-2 h-full cursor-ew-resize bg-gray-600 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
            onMouseDown={handleResizeMouseDown}
            style={{ zIndex: 10 }}
          />
        </>
      )}
    </div>
  );
};

interface PlatformRendererProps {
  platform: Platform;
  isSelected: boolean;
  isInGroup: boolean;
  onSelectPlatform: (id: string) => void;
  onToggleSelection: (id: string) => void;
}

const PlatformRenderer: React.FC<PlatformRendererProps> = ({
  platform,
  isSelected,
  isInGroup,
  onSelectPlatform,
  onToggleSelection,
}) => {
  const { movePlatform, updatePlatformLength } = useLayoutStore();
  const [isDragging, setIsDragging] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState<
    "left" | "right" | "top" | "bottom" | "corner" | null
  >(null);
  const [dragStart, setDragStart] = React.useState({
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    startLength: 0,
    startWidth: 0,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (e.ctrlKey) {
      // Ctrl+Click for multi-select
      e.preventDefault();
      onToggleSelection(platform.id);
      return;
    }

    // Always allow selecting platform (for shop placement), even if grouped
    onSelectPlatform(platform.id);

    if (!isInGroup) {
      // Only allow dragging if not in a group
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        startX: platform.x,
        startY: platform.y,
        startLength: platform.length,
        startWidth: platform.width,
      });
    }
  };

  const handleResizeMouseDown = (
    e: React.MouseEvent,
    direction: "left" | "right" | "top" | "bottom" | "corner"
  ) => {
    if (isInGroup) return; // Don't allow resizing if in a group

    e.stopPropagation();
    onSelectPlatform(platform.id);
    setIsResizing(direction);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      startX: platform.x,
      startY: platform.y,
      startLength: platform.length,
      startWidth: platform.width,
    });
  };

  React.useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const state = useLayoutStore.getState();
        const currentZoom = state.zoom || 1;
        const deltaX = (e.clientX - dragStart.x) / currentZoom;
        const deltaY = (e.clientY - dragStart.y) / currentZoom;
        const newX = dragStart.startX + deltaX;
        const newY = dragStart.startY + deltaY;
        movePlatform(platform.id, newX, newY);
      } else if (isResizing) {
        const state = useLayoutStore.getState();
        const currentZoom = state.zoom || 1;
        const deltaX = (e.clientX - dragStart.x) / currentZoom;
        const deltaY = (e.clientY - dragStart.y) / currentZoom;

        if (isResizing === "right" || isResizing === "corner") {
          const newLength = Math.max(100, dragStart.startLength + deltaX);
          updatePlatformLength(platform.id, newLength);
        }

        if (isResizing === "left") {
          const newLength = Math.max(100, dragStart.startLength - deltaX);
          const newX = dragStart.startX + (dragStart.startLength - newLength);
          movePlatform(platform.id, newX, platform.y);
          updatePlatformLength(platform.id, newLength);
        }

        if (isResizing === "bottom" || isResizing === "corner") {
          const newWidth = Math.max(50, dragStart.startWidth + deltaY);
          // Update platform width
          const state = useLayoutStore.getState();
          if (state.layout) {
            useLayoutStore.setState({
              layout: {
                ...state.layout,
                platforms: (state.layout.platforms || []).map((p: Platform) =>
                  p.id === platform.id ? { ...p, width: newWidth } : p
                ),
              },
            });
          }
        }

        if (isResizing === "top") {
          const newWidth = Math.max(50, dragStart.startWidth - deltaY);
          const newY = dragStart.startY + (dragStart.startWidth - newWidth);
          movePlatform(platform.id, platform.x, newY);
          const state = useLayoutStore.getState();
          if (state.layout) {
            useLayoutStore.setState({
              layout: {
                ...state.layout,
                platforms: (state.layout.platforms || []).map((p: Platform) =>
                  p.id === platform.id ? { ...p, width: newWidth } : p
                ),
              },
            });
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    isResizing,
    dragStart,
    platform.id,
    platform.x,
    platform.y,
    movePlatform,
    updatePlatformLength,
  ]);

  return (
    <>
      {/* Dual-Track Configuration: Top Track */}
      {platform.isDualTrack && platform.topTrack && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: platform.x,
            top:
              platform.y -
              (platform.topRestrictedZone?.height || 0) -
              platform.topTrack.height,
            width: platform.length,
            height: platform.topTrack.height,
            backgroundColor: "#4B5563",
            border: "2px solid #1F2937",
          }}
        >
          <div className="absolute -left-12 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-200">
            T{platform.topTrack.trackNumber}
          </div>
        </div>
      )}

      {/* Dual-Track Configuration: Top Restricted Zone */}
      {platform.isDualTrack && platform.topRestrictedZone && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: platform.x,
            top: platform.y - platform.topRestrictedZone.height,
            width: platform.length,
            height: platform.topRestrictedZone.height,
            backgroundColor: "#DC2626",
            border: "2px solid #991B1B",
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)",
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded text-xs font-bold text-red-700">
            NO SHOPS ZONE
          </div>
        </div>
      )}

      {/* Main Platform */}
      <div
        className={`absolute group ${
          isSelected ? "ring-2 ring-blue-500" : ""
        } ${isInGroup ? "opacity-90" : ""} ${
          isDragging
            ? "cursor-grabbing"
            : "cursor-move hover:ring-2 hover:ring-blue-400"
        }`}
        style={{
          left: platform.x,
          top: platform.y,
          width: platform.length,
          height: platform.width,
          border: "3px solid #1F2937",
          backgroundColor: "#F3F4F6",
          willChange: isDragging ? "transform" : "auto",
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Platform labels - show P1 and P2 for dual-track */}
        {platform.isDualTrack ? (
          <>
            <div className="absolute -left-12 top-1/4 -translate-y-1/2 text-xs font-semibold text-gray-700">
              P{platform.platformNumber}
            </div>
            <div className="absolute -left-12 top-3/4 -translate-y-1/2 text-xs font-semibold text-gray-700">
              P{parseInt(platform.platformNumber) + 1}
            </div>
          </>
        ) : (
          <div className="absolute -left-12 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-700">
            P{platform.platformNumber}
          </div>
        )}

        {/* Render shop zones */}
        {platform.shops &&
          Array.isArray(platform.shops) &&
          platform.shops.map((shop) => (
            <ShopZoneRenderer
              key={shop.id}
              shop={shop}
              platformId={platform.id}
              isInGroup={isInGroup}
              platformWidth={platform.width}
            />
          ))}

        {/* Resize handles - only show if not in group */}
        {!isInGroup && (
          <>
            {/* Left edge resize */}
            <div
              className="absolute top-0 left-0 w-2 h-full cursor-ew-resize bg-blue-500 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
              onMouseDown={(e) => handleResizeMouseDown(e, "left")}
              style={{ zIndex: 10 }}
            />
            {/* Right edge resize */}
            <div
              className="absolute top-0 right-0 w-2 h-full cursor-ew-resize bg-blue-500 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
              onMouseDown={(e) => handleResizeMouseDown(e, "right")}
              style={{ zIndex: 10 }}
            />
            {/* Top edge resize */}
            <div
              className="absolute top-0 left-0 w-full h-2 cursor-ns-resize bg-blue-500 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
              onMouseDown={(e) => handleResizeMouseDown(e, "top")}
              style={{ zIndex: 10 }}
            />
            {/* Bottom edge resize */}
            <div
              className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize bg-blue-500 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
              onMouseDown={(e) => handleResizeMouseDown(e, "bottom")}
              style={{ zIndex: 10 }}
            />
            {/* Corner resize */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-blue-600 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
              onMouseDown={(e) => handleResizeMouseDown(e, "corner")}
              style={{ zIndex: 11 }}
            />
          </>
        )}
      </div>

      {/* Single Track Configuration: Restricted Zone - position depends on isInverted */}
      {!platform.isDualTrack && platform.restrictedZone && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: platform.x,
            top: platform.isInverted 
              ? platform.y - platform.restrictedZone.height
              : platform.y + platform.width,
            width: platform.length,
            height: platform.restrictedZone.height,
            backgroundColor: "#DC2626",
            border: "2px solid #991B1B",
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)",
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded text-xs font-bold text-red-700">
            NO SHOPS ZONE
          </div>
        </div>
      )}

      {/* Single Track Configuration: Track - position depends on isInverted */}
      {!platform.isDualTrack && platform.track && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: platform.x,
            top: platform.isInverted
              ? platform.y - (platform.restrictedZone?.height || 0) - platform.track.height
              : platform.y + platform.width + (platform.restrictedZone?.height || 0),
            width: platform.length,
            height: platform.track.height,
            backgroundColor: "#4B5563",
            border: "2px solid #1F2937",
          }}
        >
          <div className="absolute -left-12 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-200">
            T{platform.track.trackNumber}
          </div>
        </div>
      )}

      {/* Dual Track Configuration: Bottom Restricted Zone */}
      {platform.isDualTrack && platform.bottomRestrictedZone && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: platform.x,
            top: platform.y + platform.width,
            width: platform.length,
            height: platform.bottomRestrictedZone.height,
            backgroundColor: "#DC2626",
            border: "2px solid #991B1B",
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)",
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded text-xs font-bold text-red-700">
            NO SHOPS ZONE
          </div>
        </div>
      )}

      {/* Dual Track Configuration: Bottom Track */}
      {platform.isDualTrack && platform.bottomTrack && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: platform.x,
            top:
              platform.y +
              platform.width +
              (platform.bottomRestrictedZone?.height || 0),
            width: platform.length,
            height: platform.bottomTrack.height,
            backgroundColor: "#4B5563",
            border: "2px solid #1F2937",
          }}
        >
          <div className="absolute -left-12 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-200">
            T{platform.bottomTrack.trackNumber}
          </div>
        </div>
      )}
    </>
  );
};

interface RestrictedZoneRendererProps {
  zone: RestrictedZone;
  isSelected: boolean;
  isInGroup: boolean;
  onToggleSelection: (id: string) => void;
}

const RestrictedZoneRenderer: React.FC<RestrictedZoneRendererProps> = ({
  zone,
  isSelected,
  isInGroup,
  onToggleSelection,
}) => {
  const { moveRestrictedZone, resizeRestrictedZone } = useLayoutStore();
  const [isDragging, setIsDragging] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState<
    "left" | "right" | "top" | "bottom" | "corner" | null
  >(null);
  const [dragStart, setDragStart] = React.useState({
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (e.ctrlKey) {
      // Ctrl+Click for multi-select
      e.preventDefault();
      onToggleSelection(zone.id);
      return;
    }

    if (!isInGroup) {
      // Only allow dragging if not in a group
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        startX: zone.x,
        startY: zone.y,
        startWidth: zone.width,
        startHeight: zone.height,
      });
    }
  };

  const handleResizeMouseDown = (
    e: React.MouseEvent,
    direction: "left" | "right" | "top" | "bottom" | "corner"
  ) => {
    if (isInGroup) return; // Don't allow resizing if in a group

    e.stopPropagation();
    setIsResizing(direction);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      startX: zone.x,
      startY: zone.y,
      startWidth: zone.width,
      startHeight: zone.height,
    });
  };

  React.useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        const newX = dragStart.startX + deltaX;
        const newY = dragStart.startY + deltaY;
        moveRestrictedZone(zone.id, newX, newY);
      } else if (isResizing) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;

        let newWidth = dragStart.startWidth;
        let newHeight = dragStart.startHeight;
        let newX = dragStart.startX;
        let newY = dragStart.startY;

        if (isResizing === "right" || isResizing === "corner") {
          newWidth = Math.max(50, dragStart.startWidth + deltaX);
        }

        if (isResizing === "left") {
          newWidth = Math.max(50, dragStart.startWidth - deltaX);
          newX = dragStart.startX + (dragStart.startWidth - newWidth);
        }

        if (isResizing === "bottom" || isResizing === "corner") {
          newHeight = Math.max(50, dragStart.startHeight + deltaY);
        }

        if (isResizing === "top") {
          newHeight = Math.max(50, dragStart.startHeight - deltaY);
          newY = dragStart.startY + (dragStart.startHeight - newHeight);
        }

        if (newX !== dragStart.startX || newY !== dragStart.startY) {
          moveRestrictedZone(zone.id, newX, newY);
        }
        resizeRestrictedZone(zone.id, newWidth, newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    isResizing,
    dragStart,
    zone.id,
    moveRestrictedZone,
    resizeRestrictedZone,
  ]);

  return (
    <div
      className={`absolute group ${isSelected ? "ring-2 ring-red-500" : ""} ${
        isInGroup ? "pointer-events-none opacity-90" : ""
      } ${
        isDragging
          ? "cursor-grabbing"
          : "cursor-move hover:ring-2 hover:ring-red-400"
      }`}
      style={{
        left: zone.x,
        top: zone.y,
        width: zone.width,
        height: zone.height,
        background:
          "repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.5) 0px, rgba(239, 68, 68, 0.5) 10px, rgba(220, 38, 38, 0.5) 10px, rgba(220, 38, 38, 0.5) 20px)",
        border: "3px solid rgba(220, 38, 38, 0.8)",
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-red-800 bg-white bg-opacity-90 px-2 py-1 rounded shadow pointer-events-none">
        NO SHOPS ZONE
      </div>

      {/* Resize handles - only show if not in group */}
      {!isInGroup && (
        <>
          {/* Left edge resize */}
          <div
            className="absolute top-0 left-0 w-2 h-full cursor-ew-resize bg-red-500 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handleResizeMouseDown(e, "left")}
            style={{ zIndex: 10 }}
          />
          {/* Right edge resize */}
          <div
            className="absolute top-0 right-0 w-2 h-full cursor-ew-resize bg-red-500 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handleResizeMouseDown(e, "right")}
            style={{ zIndex: 10 }}
          />
          {/* Top edge resize */}
          <div
            className="absolute top-0 left-0 w-full h-2 cursor-ns-resize bg-red-500 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handleResizeMouseDown(e, "top")}
            style={{ zIndex: 10 }}
          />
          {/* Bottom edge resize */}
          <div
            className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize bg-red-500 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handleResizeMouseDown(e, "bottom")}
            style={{ zIndex: 10 }}
          />
          {/* Corner resize */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-red-600 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity rounded-sm"
            onMouseDown={(e) => handleResizeMouseDown(e, "corner")}
            style={{ zIndex: 11 }}
          />
        </>
      )}
    </div>
  );
};

interface ShopZoneRendererProps {
  shop: ShopZone;
  platformId: string;
  isInGroup: boolean;
  platformWidth: number; // Add platform width to calculate square dimensions
}

const ShopZoneRenderer: React.FC<ShopZoneRendererProps> = ({
  shop,
  isInGroup,
  platformWidth,
}) => {
  const { moveShopZone, resizeShopZone, updateShopZone, selectedShopZoneId, selectShopZone } =
    useLayoutStore();
  const [isDragging, setIsDragging] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState<"left" | "right" | "top" | "bottom" | null>(
    null
  );
  const [dragStart, setDragStart] = React.useState({
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
  });

  const shopColor =
    {
      food: "#FCD34D",
      retail: "#A78BFA",
      kiosk: "#60A5FA",
      bookstore: "#34D399",
      pharmacy: "#F87171",
      electronics: "#FBBF24",
      clothing: "#EC4899",
      general: "#9CA3AF",
      other: "#9CA3AF",
    }[shop.category] || "#9CA3AF";

  const isSelected = selectedShopZoneId === shop.id;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isInGroup) return;
    e.stopPropagation();

    selectShopZone(shop.id);
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      startX: shop.x,
      startY: 0,
      startWidth: shop.width,
      startHeight: shop.height || shop.width,
    });
  };

  const handleResizeMouseDown = (
    e: React.MouseEvent,
    direction: "left" | "right" | "top" | "bottom"
  ) => {
    if (isInGroup) return;
    e.stopPropagation();

    selectShopZone(shop.id);
    setIsResizing(direction);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      startX: shop.x,
      startY: 0,
      startWidth: shop.width,
      startHeight: shop.height || shop.width,
    });
  };

  React.useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const newX = Math.max(0, dragStart.startX + deltaX);
        moveShopZone(shop.id, newX);
      } else if (isResizing) {
        if (isResizing === "right") {
          // Resizing from right edge - only increase/decrease width
          const deltaX = e.clientX - dragStart.x;
          const newWidth = Math.max(50, dragStart.startWidth + deltaX);
          resizeShopZone(shop.id, newWidth);
        } else if (isResizing === "left") {
          // Resizing from left edge - move position and adjust width
          const deltaX = e.clientX - dragStart.x;
          const newWidth = Math.max(50, dragStart.startWidth - deltaX);
          const newX = dragStart.startX + (dragStart.startWidth - newWidth);
          
          // For left resize, we need to move the shop first, then resize
          // This prevents triggering the auto-repositioning of adjacent shops
          moveShopZone(shop.id, newX);
          
          // Use updateShopZone directly to avoid auto-repositioning
          const state = useLayoutStore.getState();
          if (state.layout) {
            const platform = state.layout.platforms.find(p => 
              p.shops.some(s => s.id === shop.id)
            );
            if (platform) {
              useLayoutStore.setState({
                layout: {
                  ...state.layout,
                  platforms: state.layout.platforms.map(p =>
                    p.id === platform.id
                      ? {
                          ...p,
                          shops: p.shops.map(s =>
                            s.id === shop.id ? { ...s, width: newWidth } : s
                          ),
                        }
                      : p
                  ),
                },
              });
            }
          }
        } else if (isResizing === "top" || isResizing === "bottom") {
          // Resizing from top or bottom edge - only adjust height
          const deltaY = e.clientY - dragStart.y;
          const newHeight = isResizing === "bottom"
            ? Math.max(50, dragStart.startHeight + deltaY)
            : Math.max(50, dragStart.startHeight - deltaY);
          
          // Update only height without affecting width or auto-repositioning
          updateShopZone(shop.id, { height: newHeight });
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    isResizing,
    dragStart,
    shop.id,
    moveShopZone,
    resizeShopZone,
  ]);

  // Calculate square dimensions: height = width or use explicit height if set
  const shopHeight = shop.height || shop.width;
  
  // Calculate vertical centering
  const topOffset = (platformWidth - shopHeight) / 2;

  return (
    <div
      className={`absolute group ${
        isSelected ? "ring-2 ring-yellow-500" : ""
      } ${
        isDragging
          ? "cursor-grabbing"
          : "cursor-move hover:ring-2 hover:ring-yellow-400"
      } ${isInGroup ? "pointer-events-none" : ""}`}
      style={{
        left: shop.x,
        top: topOffset, // Center vertically
        width: shop.width,
        height: shopHeight, // Make it square
        backgroundColor: shopColor,
        opacity: 0.7,
        border: "2px solid rgba(0,0,0,0.2)",
        zIndex: isSelected ? 5 : 1,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-xs font-semibold text-gray-900 bg-white bg-opacity-75 px-1 rounded">
          {shop.category}
        </span>
      </div>

      {/* Resize handles - only show if not in group */}
      {!isInGroup && (
        <>
          {/* Left edge resize */}
          <div
            className="absolute top-0 left-0 w-2 h-full cursor-ew-resize bg-yellow-500 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handleResizeMouseDown(e, "left")}
            style={{ zIndex: 10 }}
          />
          {/* Right edge resize */}
          <div
            className="absolute top-0 right-0 w-2 h-full cursor-ew-resize bg-yellow-500 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handleResizeMouseDown(e, "right")}
            style={{ zIndex: 10 }}
          />
          {/* Top edge resize */}
          <div
            className="absolute top-0 left-0 w-full h-2 cursor-ns-resize bg-yellow-500 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handleResizeMouseDown(e, "top")}
            style={{ zIndex: 10 }}
          />
          {/* Bottom edge resize */}
          <div
            className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize bg-yellow-500 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handleResizeMouseDown(e, "bottom")}
            style={{ zIndex: 10 }}
          />
        </>
      )}
    </div>
  );
};

interface InfrastructureBlockRendererProps {
  block: InfrastructureBlock;
}

const InfrastructureBlockRenderer: React.FC<
  InfrastructureBlockRendererProps
> = ({ block }) => {
  const { moveInfrastructure, layout } = useLayoutStore();
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ 
    x: 0, 
    y: 0,
    startX: 0,
    startY: 0,
  });

  const SNAP_THRESHOLD = 30; // pixels

  const snapToEdge = React.useCallback(
    (x: number, y: number) => {
      if (!layout) return { x, y };

      let snappedX = x;
      let snappedY = y;
      let minDistX = Infinity;
      let minDistY = Infinity;

      // Check all platforms for snapping
      (layout.platforms || []).forEach((platform) => {
        const platformLeft = platform.x;
        const platformRight = platform.x + platform.length;
        const platformTop = platform.y;
        const platformBottom = platform.y + platform.width;

        // Snap to left edge
        const distToLeft = Math.abs(x - platformLeft);
        if (distToLeft < SNAP_THRESHOLD && distToLeft < minDistX) {
          snappedX = platformLeft;
          minDistX = distToLeft;
        }

        // Snap to right edge
        const distToRight = Math.abs(
          x + block.dimensions.width - platformRight
        );
        if (distToRight < SNAP_THRESHOLD && distToRight < minDistX) {
          snappedX = platformRight - block.dimensions.width;
          minDistX = distToRight;
        }

        // Snap to top edge
        const distToTop = Math.abs(y - platformTop);
        if (distToTop < SNAP_THRESHOLD && distToTop < minDistY) {
          snappedY = platformTop;
          minDistY = distToTop;
        }

        // Snap to bottom edge
        const distToBottom = Math.abs(
          y + block.dimensions.height - platformBottom
        );
        if (distToBottom < SNAP_THRESHOLD && distToBottom < minDistY) {
          snappedY = platformBottom - block.dimensions.height;
          minDistY = distToBottom;
        }
      });

      return { x: snappedX, y: snappedY };
    },
    [layout, block.dimensions.width, block.dimensions.height]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (block.isLocked) return;
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      startX: block.position.x,
      startY: block.position.y,
    });
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const state = useLayoutStore.getState();
      const currentZoom = state.zoom || 1;
      const deltaX = (e.clientX - dragStart.x) / currentZoom;
      const deltaY = (e.clientY - dragStart.y) / currentZoom;
      const newX = dragStart.startX + deltaX;
      const newY = dragStart.startY + deltaY;
      const snapped = snapToEdge(newX, newY);
      moveInfrastructure(block.id, snapped.x, snapped.y);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, block.id, moveInfrastructure, snapToEdge]);

  const getInfraIcon = (type: string) => {
    switch (type) {
      case "ENTRANCE":
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M3 12h12" />
          </svg>
        );
      case "EXIT":
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        );
      case "FOOT_OVER_BRIDGE":
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 21h18M3 10h18M5 6l7-3 7 3M6 10v11M18 10v11M10 10v11M14 10v11" />
          </svg>
        );
      case "UNDERPASS":
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 21h18M5 21v-8a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v8M12 9V3M9 6l3-3 3 3" />
          </svg>
        );
      case "STAIRCASE":
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 21h14M5 21v-4h4v-4h4v-4h4V5" />
          </svg>
        );
      case "ELEVATOR":
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <path d="M10 8l-2 2 2 2M14 14l2-2-2-2" />
          </svg>
        );
      case "ESCALATOR":
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 21h4a2 2 0 0 0 1.5-.7l8-9.3a2 2 0 0 1 1.5-.7h4M6 3h4a2 2 0 0 1 1.5.7l8 9.3a2 2 0 0 0 1.5.7h4" />
          </svg>
        );
      case "TICKET_COUNTER":
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="7" width="20" height="10" rx="2" />
            <circle cx="12" cy="12" r="1" />
            <path d="M7 12h.01M17 12h.01" />
          </svg>
        );
      case "WAITING_HALL":
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9zM9 21V9M15 21V9M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" />
          </svg>
        );
      case "WASHROOM":
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="9" cy="7" r="2" />
            <path d="M9 9v6l-2 4M9 15l2 4M15 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM15 9v10" />
          </svg>
        );
      case "DRINKING_WATER":
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
        );
      case "SECURITY_CHECK":
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        );
      case "INFORMATION_DESK":
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        );
      case "PARKING":
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 8h4a3 3 0 0 1 0 6H9V8z" />
          </svg>
        );
      case "TAXI_STAND":
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 11h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2zM7 11V8l1.5-3h7L17 8v3" />
            <circle cx="7" cy="17" r="1" />
            <circle cx="17" cy="17" r="1" />
          </svg>
        );
      default:
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        );
    }
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        left: block.position.x,
        top: block.position.y,
        width: block.dimensions.width,
        height: block.dimensions.height,
        transform: `rotate(${block.rotation}deg)`,
        cursor: block.isLocked
          ? "not-allowed"
          : isDragging
          ? "grabbing"
          : "grab",
        willChange: isDragging ? "transform" : "auto",
        zIndex: 100, // High z-index to appear above platforms
      }}
      className={`border-4 rounded-sm shadow-2xl flex items-center justify-center  transition-all ${
        block.isConnector
          ? "border-purple-700 bg-gradient-to-b from-purple-200 to-purple-300 hover:border-purple-800 hover:shadow-purple-500/50"
          : "border-blue-700 bg-gradient-to-b from-blue-200 to-blue-300 hover:border-blue-800 hover:shadow-blue-500/50"
      } hover:scale-105 ${block.isLocked ? "opacity-50" : ""}`}
    >
      {block.isConnector ? (
        // Vertical connector layou
        <div className="flex flex-col items-center justify-between h-full w-full pointer-events-none overflow-hidden py-1 ">
          <div
            className="text-purple-900 bg-white rounded-full p-1 shadow-lg flex-shrink-0"
            style={{ transform: "scaleY(-1)" }}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>
          <div className="flex-1 flex items-center justify-center my-1 min-h-0">
            <div
              className="text-[10px] font-bold text-purple-950 bg-white/90 px-1 py-0.5 rounded shadow-md"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              {block.type.replace(/_/g, " ")}
            </div>
          </div>
          <div className="text-purple-900 bg-white rounded-full p-1 shadow-lg flex-shrink-0">
                        <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>
        </div>
      ) : (
        // Regular infrastructure layout
        <div className="flex flex-col items-center justify-center pointer-events-none">
          <div className="text-blue-900 bg-white rounded-full p-3 shadow-lg mb-2">
            {getInfraIcon(block.type)}
          </div>
          <div className="text-xs font-bold text-blue-950 text-center bg-white/90 px-3 py-1 rounded shadow-md">
            {block.type.replace(/_/g, " ")}
          </div>
        </div>
      )}
    </div>
  );
};

// GroupContainer component - Figma-like group visualization
interface GroupContainerProps {
  group: ElementGroup;
  layout: StationLayout;
  isSelected: boolean;
  onSelectGroup: (groupId: string) => void;
  onMoveGroup: (groupId: string, deltaX: number, deltaY: number) => void;
}

const GroupContainer: React.FC<GroupContainerProps> = ({
  group,
  layout,
  isSelected,
  onSelectGroup,
  onMoveGroup,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  // Calculate bounding box for all elements in the group
  const getBoundingBox = () => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    group.elementIds.forEach((elementId) => {
      // Check tracks
      const track = layout.tracks.find((t) => t.id === elementId);
      if (track) {
        minX = Math.min(minX, track.x);
        minY = Math.min(minY, track.y);
        maxX = Math.max(maxX, track.x + track.length);
        maxY = Math.max(maxY, track.y + track.height);
      }

      // Check platforms
      const platform = (layout.platforms || []).find((p) => p.id === elementId);
      if (platform) {
        minX = Math.min(minX, platform.x);
        minY = Math.min(minY, platform.y);
        maxX = Math.max(maxX, platform.x + platform.length);
        maxY = Math.max(maxY, platform.y + platform.width);
      }

      // Check restricted zones
      const zone = (layout.restrictedZones || []).find(
        (z) => z.id === elementId
      );
      if (zone) {
        minX = Math.min(minX, zone.x);
        minY = Math.min(minY, zone.y);
        maxX = Math.max(maxX, zone.x + zone.width);
        maxY = Math.max(maxY, zone.y + zone.height);
      }
    });

    // Add padding around the group
    const padding = 20;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };
  };

  const boundingBox = getBoundingBox();

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (e.ctrlKey) {
      return; // Don't drag when ctrl-clicking
    }

    onSelectGroup(group.id);
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    });
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      onMoveGroup(group.id, deltaX, deltaY);

      setDragStart({
        x: e.clientX,
        y: e.clientY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart, group.id, onMoveGroup]);

  // Return null if bounding box is invalid (no elements found)
  if (!isFinite(boundingBox.x) || !isFinite(boundingBox.y)) {
    return null;
  }

  return (
    <div
      className={`absolute pointer-events-auto transition-all ${
        isSelected
          ? "border-2 border-green-500 bg-green-500/5"
          : "border-2 border-dashed border-purple-400 bg-purple-500/5 hover:border-purple-500 hover:bg-purple-500/10"
      } ${isDragging ? "cursor-grabbing shadow-2xl" : "cursor-grab"}`}
      style={{
        left: boundingBox.x,
        top: boundingBox.y,
        width: boundingBox.width,
        height: boundingBox.height,
        zIndex: isDragging ? 1000 : 0,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Group label */}
      <div
        className={`absolute -top-6 left-0 px-2 py-0.5 rounded text-xs font-semibold shadow-sm ${
          isSelected ? "bg-green-500 text-white" : "bg-purple-500 text-white"
        }`}
      >
        <span className="flex items-center gap-1">
          <svg
            className="w-3 h-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
          {group.name}
          <span className="opacity-75">({group.elementIds.length})</span>
        </span>
      </div>

      {/* Corner drag handle indicator */}
      {isSelected && (
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-md" />
      )}
    </div>
  );
};

