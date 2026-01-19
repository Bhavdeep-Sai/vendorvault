/**
 * Zustand Store - Layout Editor State Management
 * 
 * Manages the entire station layout editor state with undo/redo support
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { 
  StationLayout, 
  Track, 
  Platform,
  RestrictedZone,
  ElementGroup,
  ShopZone, 
  InfrastructureBlock,
  EditorAction,
  CANVAS_CONSTANTS 
} from '@/types/layout';

interface LayoutEditorState {
  // Current layout
  layout: StationLayout | null;
  
  // Editor state
  selectedTrackId: string | null;
  selectedPlatformId: string | null;
  selectedShopZoneId: string | null;
  selectedInfrastructureId: string | null;
  selectedElementIds: string[]; // Multi-select support
  selectedGroupId: string | null;
  
  // Canvas state
  zoom: number;
  panOffset: { x: number; y: number };
  showGrid: boolean;
  snapToGrid: boolean;
  
  // History for undo/redo
  history: StationLayout[];
  historyIndex: number;
  maxHistorySize: number;
  
  // UI state
  isDragging: boolean;
  isResizing: boolean;
  isSaving: boolean;
  
  // Actions - Layout Management
  initializeLayout: (stationId: string, stationName: string, stationCode: string, userId: string) => void;
  loadLayout: (layout: StationLayout) => void;
  clearLayout: () => void;
  
  // Actions - Track Management
  addIndependentTrack: () => void;
  removeTrack: (trackId: string) => void;
  moveTrack: (trackId: string, x: number, y: number) => void;
  updateTrackLength: (trackId: string, length: number) => void;
  
  // Actions - Platform Management  
  addCompletePlatform: () => void; // Add track + platform together
  addDualTrackPlatform: () => void; // Add platform between two tracks
  togglePlatformInvert: (platformId: string) => void; // Toggle single-track platform inversion
  addIndependentPlatform: () => void;
  removePlatform: (platformId: string) => void;
  movePlatform: (platformId: string, x: number, y: number) => void;
  updatePlatformLength: (platformId: string, length: number) => void;
  
  // Actions - Restricted Zone Management
  addRestrictedZone: () => void;
  removeRestrictedZone: (zoneId: string) => void;
  moveRestrictedZone: (zoneId: string, x: number, y: number) => void;
  resizeRestrictedZone: (zoneId: string, width: number, height: number) => void;
  
  // Actions - Shop Zone Management
  addShopZone: (platformId: string, shopZone: Omit<ShopZone, 'id'>) => void;
  removeShopZone: (shopZoneId: string) => void;
  updateShopZone: (shopZoneId: string, updates: Partial<ShopZone>) => void;
  moveShopZone: (shopZoneId: string, newX: number) => void;
  resizeShopZone: (shopZoneId: string, newWidth: number) => void;
  
  // Actions - Infrastructure Management
  addInfrastructure: (block: Omit<InfrastructureBlock, 'id'>) => void;
  addConnectorInfrastructure: (type: InfrastructureType, platformIds: string[]) => void;
  removeInfrastructure: (blockId: string) => void;
  moveInfrastructure: (blockId: string, x: number, y: number) => void;
  rotateInfrastructure: (blockId: string, rotation: number) => void;
  toggleInfrastructureLock: (blockId: string) => void;
  
  // Actions - Canvas Controls
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  resetView: () => void;
  
  // Actions - Selection
  selectTrack: (trackId: string | null) => void;
  selectPlatform: (platformId: string | null) => void;
  selectShopZone: (shopZoneId: string | null) => void;
  selectInfrastructure: (blockId: string | null) => void;
  toggleElementSelection: (elementId: string) => void;
  selectMultipleElements: (elementIds: string[]) => void;
  clearSelection: () => void;
  
  // Actions - Grouping
  createGroup: (name: string, elementIds: string[]) => void;
  removeGroup: (groupId: string) => void;
  addElementsToGroup: (groupId: string, elementIds: string[]) => void;
  removeElementsFromGroup: (groupId: string, elementIds: string[]) => void;
  selectGroup: (groupId: string | null) => void;
  moveGroup: (groupId: string, deltaX: number, deltaY: number) => void;
  
  // Actions - History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Actions - Validation & Export
  validateLayout: () => { isValid: boolean; errors: string[] };
  validateWithStationData: (stationPlatformCount: number) => { isValid: boolean; errors: string[] };
  exportLayout: () => StationLayout | null;
  
  // Actions - UI State
  setDragging: (isDragging: boolean) => void;
  setResizing: (isResizing: boolean) => void;
  setSaving: (isSaving: boolean) => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper to calculate edges for snapping
const getElementEdges = (element: Track | Platform | RestrictedZone, type: 'track' | 'platform' | 'zone') => {
  const edges = {
    left: element.x,
    right: 0,
    top: element.y,
    bottom: 0,
  };

  if (type === 'track') {
    const track = element as Track;
    edges.right = track.x + track.length;
    edges.bottom = track.y + track.height;
  } else if (type === 'platform') {
    const platform = element as Platform;
    edges.right = platform.x + platform.length;
    edges.bottom = platform.y + platform.width;
  } else {
    const zone = element as RestrictedZone;
    edges.right = zone.x + zone.width;
    edges.bottom = zone.y + zone.height;
  }

  return edges;
};

// Helper to snap position to nearby edges
const snapToEdges = (
  x: number,
  y: number,
  currentId: string,
  layout: StationLayout,
  elementType: 'track' | 'platform' | 'zone',
  elementWidth: number,
  elementHeight: number
): { x: number; y: number } => {
  const threshold = CANVAS_CONSTANTS.SNAP_THRESHOLD;
  let snappedX = x;
  let snappedY = y;

  const currentEdges = {
    left: x,
    right: x + elementWidth,
    top: y,
    bottom: y + elementHeight,
  };

  // Check against all tracks
  layout.tracks.forEach(track => {
    if (track.id === currentId) return;
    const edges = getElementEdges(track, 'track');

    // Snap left edge to right edge
    if (Math.abs(currentEdges.left - edges.right) < threshold) snappedX = edges.right;
    // Snap right edge to left edge
    if (Math.abs(currentEdges.right - edges.left) < threshold) snappedX = edges.left - elementWidth;
    // Snap left edge to left edge
    if (Math.abs(currentEdges.left - edges.left) < threshold) snappedX = edges.left;
    // Snap right edge to right edge
    if (Math.abs(currentEdges.right - edges.right) < threshold) snappedX = edges.right - elementWidth;

    // Snap top edge to bottom edge
    if (Math.abs(currentEdges.top - edges.bottom) < threshold) snappedY = edges.bottom;
    // Snap bottom edge to top edge
    if (Math.abs(currentEdges.bottom - edges.top) < threshold) snappedY = edges.top - elementHeight;
    // Snap top edge to top edge
    if (Math.abs(currentEdges.top - edges.top) < threshold) snappedY = edges.top;
    // Snap bottom edge to bottom edge
    if (Math.abs(currentEdges.bottom - edges.bottom) < threshold) snappedY = edges.bottom - elementHeight;
  });

  // Check against all platforms
  (layout.platforms || []).forEach(platform => {
    if (platform.id === currentId) return;
    const edges = getElementEdges(platform, 'platform');

    if (Math.abs(currentEdges.left - edges.right) < threshold) snappedX = edges.right;
    if (Math.abs(currentEdges.right - edges.left) < threshold) snappedX = edges.left - elementWidth;
    if (Math.abs(currentEdges.left - edges.left) < threshold) snappedX = edges.left;
    if (Math.abs(currentEdges.right - edges.right) < threshold) snappedX = edges.right - elementWidth;

    if (Math.abs(currentEdges.top - edges.bottom) < threshold) snappedY = edges.bottom;
    if (Math.abs(currentEdges.bottom - edges.top) < threshold) snappedY = edges.top - elementHeight;
    if (Math.abs(currentEdges.top - edges.top) < threshold) snappedY = edges.top;
    if (Math.abs(currentEdges.bottom - edges.bottom) < threshold) snappedY = edges.bottom - elementHeight;
  });

  // Check against all restricted zones
  (layout.restrictedZones || []).forEach(zone => {
    if (zone.id === currentId) return;
    const edges = getElementEdges(zone, 'zone');

    if (Math.abs(currentEdges.left - edges.right) < threshold) snappedX = edges.right;
    if (Math.abs(currentEdges.right - edges.left) < threshold) snappedX = edges.left - elementWidth;
    if (Math.abs(currentEdges.left - edges.left) < threshold) snappedX = edges.left;
    if (Math.abs(currentEdges.right - edges.right) < threshold) snappedX = edges.right - elementWidth;

    if (Math.abs(currentEdges.top - edges.bottom) < threshold) snappedY = edges.bottom;
    if (Math.abs(currentEdges.bottom - edges.top) < threshold) snappedY = edges.top - elementHeight;
    if (Math.abs(currentEdges.top - edges.top) < threshold) snappedY = edges.top;
    if (Math.abs(currentEdges.bottom - edges.bottom) < threshold) snappedY = edges.bottom - elementHeight;
  });

  return { x: snappedX, y: snappedY };
};

// Helper to save layout to history
const saveToHistory = (get: () => LayoutEditorState, set: (state: Partial<LayoutEditorState>) => void, newLayout: StationLayout) => {
  const state = get();
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(JSON.parse(JSON.stringify(newLayout)));
  
  // Keep history within max size
  if (newHistory.length > state.maxHistorySize) {
    newHistory.shift();
  }
  
  set({
    layout: newLayout,
    history: newHistory,
    historyIndex: newHistory.length - 1,
  });
};

// Debounced history save for continuous operations like dragging
let saveTimeout: NodeJS.Timeout | null = null;
const debouncedSaveToHistory = (get: () => LayoutEditorState, set: (state: Partial<LayoutEditorState>) => void, newLayout: StationLayout) => {
  set({ layout: newLayout }); // Update immediately for smooth UX
  
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveToHistory(get, set, newLayout);
  }, 500); // Save to history after 500ms of no changes
};

export const useLayoutStore = create<LayoutEditorState>()(
  devtools(
    (set, get) => ({
      // Initial state
      layout: null,
      selectedTrackId: null,
      selectedPlatformId: null,
      selectedShopZoneId: null,
      selectedInfrastructureId: null,
      selectedElementIds: [],
      selectedGroupId: null,
      zoom: 1,
      panOffset: { x: 100, y: 100 },
      showGrid: true,
      snapToGrid: true,
      history: [],
      historyIndex: -1,
      maxHistorySize: 50,
      isDragging: false,
      isResizing: false,
      isSaving: false,

      // Initialize new layout
      initializeLayout: (stationId, stationName, stationCode, userId) => {
        const newLayout: StationLayout = {
          stationId,
          stationName,
          stationCode,
          tracks: [],
          platforms: [],
          restrictedZones: [],
          groups: [],
          infrastructureBlocks: [],
          canvasSettings: {
            width: CANVAS_CONSTANTS.DEFAULT_CANVAS_WIDTH,
            height: CANVAS_CONSTANTS.DEFAULT_CANVAS_HEIGHT,
            gridSize: CANVAS_CONSTANTS.GRID_SIZE,
            snapToGrid: true,
            scale: 1,
          },
          metadata: {
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: userId,
            isLocked: false,
          },
        };
        
        set({ layout: newLayout, history: [], historyIndex: -1 });
      },

      // Load existing layout
      loadLayout: (layout) => {
        let platforms: Platform[] = [];
        let tracks: Track[] = [];
        
        // NEW STRUCTURE: Check if layout has platforms at top level (new platform-based architecture)
        if (layout.platforms && Array.isArray(layout.platforms) && layout.platforms.length > 0) {
          
          platforms = layout.platforms.map((platform: any) => ({
            id: platform.id || platform._id?.toString() || generateId(),
            platformNumber: platform.platformNumber?.toString() || '1',
            x: platform.x || 100,
            y: platform.y || 100,
            length: platform.length || 1500,
            width: platform.width || 100,
            shops: (platform.shops || []).map((shop: any) => ({
              id: shop.id || shop._id?.toString() || generateId(),
              x: shop.x || 0,
              width: shop.width || 100,
              category: shop.category || 'other',
              minWidth: shop.minWidth || 50,
              maxWidth: shop.maxWidth || 500,
              isAllocated: shop.isAllocated || false,
              vendorId: shop.vendorId,
              rent: shop.rent,
              notes: shop.notes,
            })),
            restrictedZones: platform.restrictedZones || [],
            // Single-track configuration
            ...(platform.track && {
              track: {
                trackNumber: platform.track.trackNumber,
                height: platform.track.height || 60,
              },
            }),
            ...(platform.restrictedZone && {
              restrictedZone: {
                height: platform.restrictedZone.height || 50,
              },
            }),
            isInverted: platform.isInverted || false,
            // Dual-track configuration
            isDualTrack: platform.isDualTrack || false,
            ...(platform.topTrack && {
              topTrack: {
                trackNumber: platform.topTrack.trackNumber,
                height: platform.topTrack.height || 60,
              },
            }),
            ...(platform.topRestrictedZone && {
              topRestrictedZone: {
                height: platform.topRestrictedZone.height || 50,
              },
            }),
            ...(platform.bottomTrack && {
              bottomTrack: {
                trackNumber: platform.bottomTrack.trackNumber,
                height: platform.bottomTrack.height || 60,
              },
            }),
            ...(platform.bottomRestrictedZone && {
              bottomRestrictedZone: {
                height: platform.bottomRestrictedZone.height || 50,
              },
            }),
          }));
          
        }
        // OLD STRUCTURE: Fallback to old track-based structure for backward compatibility
        else if (layout.tracks && Array.isArray(layout.tracks) && layout.tracks.length > 0) {
          
          layout.tracks.forEach((track: any, trackIndex: number) => {
            // Extract platforms from track
            if (track.platforms && Array.isArray(track.platforms)) {
              track.platforms.forEach((platform: any, platformIndex: number) => {
                const platformData = {
                  id: platform.id || platform._id?.toString() || generateId(),
                  platformNumber: platform.platformNumber?.toString() || (platformIndex + 1).toString(),
                  x: platform.x !== undefined ? platform.x : (platform.startX !== undefined ? platform.startX : 100),
                  y: platform.y !== undefined ? platform.y : (track.y !== undefined ? track.y + 10 : 100),
                  length: platform.length || 800,
                  width: platform.width || 60,
                  shops: (platform.shops || []).map((shop: any) => ({
                    id: shop.id || shop._id?.toString() || generateId(),
                    x: shop.x !== undefined ? shop.x : 0,
                    width: shop.width || 200,
                    category: shop.category || 'other',
                    minWidth: 50,
                    maxWidth: 500,
                    isAllocated: shop.isAllocated || false,
                  })),
                  restrictedZones: [],
                };
                
                platforms.push(platformData);
              });
            }
            
            // Add track without nested platforms
            const trackData = {
              id: track.id || track._id?.toString() || generateId(),
              trackNumber: track.trackNumber || (trackIndex + 1),
              x: track.x !== undefined ? track.x : 0,
              y: track.y !== undefined ? track.y : (trackIndex * 100),
              length: track.length || 2000,
              height: track.height !== undefined ? track.height : 60,
            };
            
            tracks.push(trackData);
          });
          
        } else {
        }

        const transformedLayout = {
          ...layout,
          tracks: tracks,
          platforms: platforms,
          restrictedZones: layout.restrictedZones || [],
          groups: layout.groups || [],
          infrastructureBlocks: layout.infrastructureBlocks || [],
        };

        set({ 
          layout: transformedLayout, 
          history: [], 
          historyIndex: -1,
          zoom: layout.canvasSettings?.scale || 1,
        });
      },

      // Clear layout
      clearLayout: () => {
        set({ 
          layout: null,
          selectedTrackId: null,
          selectedPlatformId: null,
          selectedShopZoneId: null,
          selectedInfrastructureId: null,
          history: [],
          historyIndex: -1,
        });
      },

      // Add complete platform (unified element with track and restricted zone)
      addCompletePlatform: () => {
        const state = get();
        if (!state.layout) return;

        // Find the next available platform number (accounting for dual-track platforms)
        const existingNumbers = (state.layout.platforms || [])
          .map(p => {
            const num = parseInt(p.platformNumber);
            return p.isDualTrack ? [num, num + 1] : [num];
          })
          .flat()
          .filter(n => !isNaN(n))
          .sort((a, b) => a - b);
        
        let platformNumber = 1;
        while (existingNumbers.includes(platformNumber)) {
          platformNumber++;
        }

        // Calculate next track number by finding the highest existing track number
        const existingTrackNumbers = state.layout.platforms.flatMap(p => {
          const numbers: number[] = [];
          if (p.track?.trackNumber) numbers.push(p.track.trackNumber);
          if (p.topTrack?.trackNumber) numbers.push(p.topTrack.trackNumber);
          if (p.bottomTrack?.trackNumber) numbers.push(p.bottomTrack.trackNumber);
          return numbers;
        });
        const trackNumber = existingTrackNumbers.length > 0 ? Math.max(...existingTrackNumbers) + 1 : 1;

        // Calculate Y position based on previous platforms' actual heights
        let baseY = 50; // Starting Y position with some top margin
        if ((state.layout.platforms || []).length > 0) {
          const platforms = state.layout.platforms || [];
          // Calculate total height of all existing platforms
          for (const p of platforms) {
            const platformHeight = p.width || 100;
            const trackHeight = p.track?.height || p.topTrack?.height || 60;
            const restrictedHeight = p.restrictedZone?.height || p.topRestrictedZone?.height || 50;
            const bottomTrackHeight = p.bottomTrack?.height || 0;
            const bottomRestrictedHeight = p.bottomRestrictedZone?.height || 0;
            
            // Total height for this platform group
            const totalHeight = platformHeight + restrictedHeight + trackHeight + bottomRestrictedHeight + bottomTrackHeight;
            baseY += totalHeight + 100; // Add spacing between platforms
          }
        }
        
        const xPosition = 100;
        const elementLength = 1500;

        // Dimensions
        const platformHeight = 100;
        const restrictedZoneHeight = 50;
        const trackHeight = 60;

        // Create unified platform element with track and restricted zone as sub-elements
        const newPlatform: Platform = {
          id: generateId(),
          platformNumber: String(platformNumber),
          x: xPosition,
          y: baseY,
          length: elementLength,
          width: platformHeight,
          shops: [],
          restrictedZones: [],
          // Track and restricted zone as nested properties
          track: {
            trackNumber,
            x: xPosition,
            y: baseY + platformHeight + restrictedZoneHeight,
            length: elementLength,
            height: trackHeight,
          },
          restrictedZone: {
            height: restrictedZoneHeight,
          },
        };

        set({
          layout: {
            ...state.layout,
            platforms: [...(state.layout.platforms || []), newPlatform],
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      // Add dual-track platform (platform between two tracks)
      // Toggle platform inversion (only for single-track platforms)
      togglePlatformInvert: (platformId: string) => {
        const state = get();
        if (!state.layout) return;

        set({
          layout: {
            ...state.layout,
            platforms: (state.layout.platforms || []).map(p => {
              if (p.id === platformId && !p.isDualTrack) {
                return { ...p, isInverted: !p.isInverted };
              }
              return p;
            }),
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      addDualTrackPlatform: () => {
        const state = get();
        if (!state.layout) return;

        // Find the highest platform number to determine next available numbers
        // For dual-track, we reserve 2 consecutive numbers even though it's one visual element
        const existingNumbers = (state.layout.platforms || [])
          .map(p => {
            const num = parseInt(p.platformNumber);
            return p.isDualTrack ? [num, num + 1] : [num];
          })
          .flat()
          .filter(n => !isNaN(n))
          .sort((a, b) => a - b);
        
        let platformNumber = 1;
        while (existingNumbers.includes(platformNumber) || existingNumbers.includes(platformNumber + 1)) {
          platformNumber++;
        }

        // Calculate next track numbers by finding the highest existing track number
        const existingTrackNumbers = state.layout.platforms.flatMap(p => {
          const numbers: number[] = [];
          if (p.track?.trackNumber) numbers.push(p.track.trackNumber);
          if (p.topTrack?.trackNumber) numbers.push(p.topTrack.trackNumber);
          if (p.bottomTrack?.trackNumber) numbers.push(p.bottomTrack.trackNumber);
          return numbers;
        });
        const maxTrackNumber = existingTrackNumbers.length > 0 ? Math.max(...existingTrackNumbers) : 0;
        const topTrackNumber = maxTrackNumber + 1;
        const bottomTrackNumber = maxTrackNumber + 2;

        // Calculate Y position based on previous platforms' actual heights
        let baseY = 50; // Starting Y position with some top margin
        if ((state.layout.platforms || []).length > 0) {
          const platforms = state.layout.platforms || [];
          // Calculate total height of all existing platforms
          for (const p of platforms) {
            const platformHeight = p.width || 100;
            const trackHeight = p.track?.height || p.topTrack?.height || 60;
            const restrictedHeight = p.restrictedZone?.height || p.topRestrictedZone?.height || 50;
            const bottomTrackHeight = p.bottomTrack?.height || 0;
            const bottomRestrictedHeight = p.bottomRestrictedZone?.height || 0;
            
            // Total height for this platform group
            const totalHeight = platformHeight + restrictedHeight + trackHeight + bottomRestrictedHeight + bottomTrackHeight;
            baseY += totalHeight + 100; // Add spacing between platforms
          }
        }
        
        const xPosition = 100;
        const elementLength = 1500;

        // Dimensions - dual track platform should be double the height of single platform
        const singlePlatformHeight = 120;
        const platformHeight = singlePlatformHeight * 2; // 240px for dual-track (2 platforms)
        const restrictedZoneHeight = 50;
        const trackHeight = 60;

        // Calculate Y positions from top to bottom:
        // topTrack -> topRestrictedZone -> platform (P1 + P2) -> bottomRestrictedZone -> bottomTrack
        const topTrackY = baseY;
        const topRestrictedZoneY = topTrackY + trackHeight;
        const platformY = topRestrictedZoneY + restrictedZoneHeight;
        const bottomRestrictedZoneY = platformY + platformHeight;
        const bottomTrackY = bottomRestrictedZoneY + restrictedZoneHeight;

        // Create dual-track platform element (visually one, but counts as 2 platforms)
        const newPlatform: Platform = {
          id: generateId(),
          platformNumber: String(platformNumber), // Represents P{n} and P{n+1}
          x: xPosition,
          y: platformY,
          length: elementLength,
          width: platformHeight,
          shops: [],
          restrictedZones: [],
          isDualTrack: true,
          // Top track and restricted zone
          topTrack: {
            trackNumber: topTrackNumber,
            height: trackHeight,
          },
          topRestrictedZone: {
            height: restrictedZoneHeight,
          },
          // Bottom track and restricted zone
          bottomTrack: {
            trackNumber: bottomTrackNumber,
            height: trackHeight,
          },
          bottomRestrictedZone: {
            height: restrictedZoneHeight,
          },
        };

        set({
          layout: {
            ...state.layout,
            platforms: [...(state.layout.platforms || []), newPlatform],
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      // Add independent track
      addIndependentTrack: () => {
        const state = get();
        if (!state.layout) return;

        const trackNumber = state.layout.tracks.length + 1;
        const yPosition = state.layout.tracks.length * 100;

        const newTrack: Track = {
          id: generateId(),
          trackNumber,
          x: 0,
          y: yPosition,
          length: 1000,
          height: CANVAS_CONSTANTS.TRACK_HEIGHT,
        };

        const newLayout = {
          ...state.layout,
          tracks: [...state.layout.tracks, newTrack],
          metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
        };
        
        saveToHistory(get, set, newLayout);
      },

      // Remove track
      removeTrack: (trackId) => {
        const state = get();
        if (!state.layout) return;

        set({
          layout: {
            ...state.layout,
            tracks: state.layout.tracks.filter(t => t.id !== trackId),
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
          selectedTrackId: state.selectedTrackId === trackId ? null : state.selectedTrackId,
        });
      },

      // Move track (both x and y)
      moveTrack: (trackId, x, y) => {
        const state = get();
        if (!state.layout) return;

        const track = state.layout.tracks.find(t => t.id === trackId);
        if (!track) return;

        // Apply edge snapping
        const snapped = snapToEdges(x, y, trackId, state.layout, 'track', track.length, track.height);

        const newLayout = {
          ...state.layout,
          tracks: state.layout.tracks.map(t =>
            t.id === trackId ? { ...t, x: snapped.x, y: snapped.y } : t
          ),
          metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
        };
        
        debouncedSaveToHistory(get, set, newLayout);
      },

      // Update track length
      updateTrackLength: (trackId, length) => {
        const state = get();
        if (!state.layout) return;

        set({
          layout: {
            ...state.layout,
            tracks: state.layout.tracks.map(track =>
              track.id === trackId ? { ...track, length } : track
            ),
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      // Add independent platform
      addIndependentPlatform: () => {
        const state = get();
        if (!state.layout) return;

        // Find the lowest missing platform number
        const existingNumbers = (state.layout.platforms || [])
          .map(p => parseInt(p.platformNumber))
          .filter(n => !isNaN(n))
          .sort((a, b) => a - b);
        
        let platformNumber = 1;
        for (const num of existingNumbers) {
          if (num === platformNumber) {
            platformNumber++;
          } else {
            break; // Found a gap, use this number
          }
        }

        const yPosition = (state.layout.platforms?.length || 0) * 150;

        const newPlatform: Platform = {
          id: generateId(),
          platformNumber: String(platformNumber),
          x: 0,
          y: yPosition,
          length: 1000,
          width: CANVAS_CONSTANTS.PLATFORM_HEIGHT,
          shops: [],
          restrictedZones: [],
        };

        set({
          layout: {
            ...state.layout,
            platforms: [...(state.layout.platforms || []), newPlatform],
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      // Remove platform
      removePlatform: (platformId) => {
        const state = get();
        if (!state.layout) return;

        set({
          layout: {
            ...state.layout,
            platforms: (state.layout.platforms || []).filter(p => p.id !== platformId),
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
          selectedPlatformId: state.selectedPlatformId === platformId ? null : state.selectedPlatformId,
        });
      },

      // Move platform (both x and y) with track-to-track magnetic snapping
      movePlatform: (platformId, x, y) => {
        const state = get();
        if (!state.layout) return;

        const platform = (state.layout.platforms || []).find(p => p.id === platformId);
        if (!platform) return;

        // Magnetic snapping for track-to-track connections
        const SNAP_DISTANCE = 30; // Pixels threshold for snapping
        let snappedY = y;
        let snappedX = x;

        // Get all other platforms
        const otherPlatforms = (state.layout.platforms || []).filter(p => p.id !== platformId);

        for (const otherPlatform of otherPlatforms) {
          // Calculate the track edges of the current platform being moved
          let currentBottomTrackY: number | null = null;
          let currentTopTrackY: number | null = null;

          if (platform.isDualTrack) {
            // Dual-track platform
            const topTrackHeight = platform.topTrack?.height || 0;
            const topRestrictedHeight = platform.topRestrictedZone?.height || 0;
            currentTopTrackY = y - topRestrictedHeight - topTrackHeight;
            
            const bottomRestrictedHeight = platform.bottomRestrictedZone?.height || 0;
            const bottomTrackHeight = platform.bottomTrack?.height || 0;
            currentBottomTrackY = y + platform.width + bottomRestrictedHeight + bottomTrackHeight;
          } else if (platform.track) {
            // Single-track platform
            const restrictedHeight = platform.restrictedZone?.height || 0;
            const trackHeight = platform.track.height;
            
            if (platform.isInverted) {
              // Inverted: track is on top
              currentTopTrackY = y - restrictedHeight - trackHeight;
            } else {
              // Normal: track is at bottom
              currentBottomTrackY = y + platform.width + restrictedHeight + trackHeight;
            }
          }

          // Calculate the track edges of the other platform
          let otherBottomTrackY: number | null = null;
          let otherTopTrackY: number | null = null;

          if (otherPlatform.isDualTrack) {
            const topTrackHeight = otherPlatform.topTrack?.height || 0;
            const topRestrictedHeight = otherPlatform.topRestrictedZone?.height || 0;
            otherTopTrackY = otherPlatform.y - topRestrictedHeight - topTrackHeight;
            
            const bottomRestrictedHeight = otherPlatform.bottomRestrictedZone?.height || 0;
            const bottomTrackHeight = otherPlatform.bottomTrack?.height || 0;
            otherBottomTrackY = otherPlatform.y + otherPlatform.width + bottomRestrictedHeight + bottomTrackHeight;
          } else if (otherPlatform.track) {
            const restrictedHeight = otherPlatform.restrictedZone?.height || 0;
            const trackHeight = otherPlatform.track.height;
            
            if (otherPlatform.isInverted) {
              // Inverted: track is on top
              otherTopTrackY = otherPlatform.y - restrictedHeight - trackHeight;
            } else {
              // Normal: track is at bottom
              otherBottomTrackY = otherPlatform.y + otherPlatform.width + restrictedHeight + trackHeight;
            }
          }

          // Check horizontal overlap (tracks should be roughly aligned)
          const horizontalOverlap = !(x + platform.length < otherPlatform.x || 
                                      x > otherPlatform.x + otherPlatform.length);

          if (horizontalOverlap) {
            // Snap bottom track of current platform to top track of other platform
            if (currentBottomTrackY !== null && otherTopTrackY !== null) {
              const distance = Math.abs(currentBottomTrackY - otherTopTrackY);
              if (distance < SNAP_DISTANCE) {
                // Calculate the Y adjustment needed
                const adjustment = otherTopTrackY - currentBottomTrackY;
                snappedY = y + adjustment;
              }
            }

            // Snap top track of current platform to bottom track of other platform
            if (currentTopTrackY !== null && otherBottomTrackY !== null) {
              const distance = Math.abs(currentTopTrackY - otherBottomTrackY);
              if (distance < SNAP_DISTANCE) {
                // Calculate the Y adjustment needed
                const adjustment = otherBottomTrackY - currentTopTrackY;
                snappedY = y + adjustment;
              }
            }
          }
        }

        const newLayout = {
          ...state.layout,
          platforms: (state.layout.platforms || []).map(p =>
            p.id === platformId ? { ...p, x: snappedX, y: snappedY } : p
          ),
          metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
        };
        
        debouncedSaveToHistory(get, set, newLayout);
      },

      // Update platform length
      updatePlatformLength: (platformId, length) => {
        const state = get();
        if (!state.layout) return;

        set({
          layout: {
            ...state.layout,
            platforms: (state.layout.platforms || []).map(platform =>
              platform.id === platformId ? { ...platform, length } : platform
            ),
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      // Add restricted zone (red box)
      addRestrictedZone: () => {
        const state = get();
        if (!state.layout) return;

        const zoneCount = (state.layout.restrictedZones?.length || 0);
        const yPosition = zoneCount * 150;

        const newZone: RestrictedZone = {
          id: generateId(),
          x: 0,
          y: yPosition,
          width: 200,
          height: 100,
        };

        set({
          layout: {
            ...state.layout,
            restrictedZones: [...(state.layout.restrictedZones || []), newZone],
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      // Remove restricted zone
      removeRestrictedZone: (zoneId) => {
        const state = get();
        if (!state.layout) return;

        set({
          layout: {
            ...state.layout,
            restrictedZones: (state.layout.restrictedZones || []).filter(z => z.id !== zoneId),
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      // Move restricted zone
      moveRestrictedZone: (zoneId, x, y) => {
        const state = get();
        if (!state.layout) return;

        const zone = (state.layout.restrictedZones || []).find(z => z.id === zoneId);
        if (!zone) return;

        // Apply edge snapping
        const snapped = snapToEdges(x, y, zoneId, state.layout, 'zone', zone.width, zone.height);

        const newLayout = {
          ...state.layout,
          restrictedZones: (state.layout.restrictedZones || []).map(z =>
            z.id === zoneId ? { ...z, x: snapped.x, y: snapped.y } : z
          ),
          metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
        };
        
        debouncedSaveToHistory(get, set, newLayout);
      },

      // Resize restricted zone
      resizeRestrictedZone: (zoneId, width, height) => {
        const state = get();
        if (!state.layout) return;

        set({
          layout: {
            ...state.layout,
            restrictedZones: (state.layout.restrictedZones || []).map(zone =>
              zone.id === zoneId ? { ...zone, width, height } : zone
            ),
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      // Add shop zone (kept for compatibility but works with independent platforms)
      addShopZone: (platformId, shopZone) => {
        const state = get();
        if (!state.layout) return;

        const platform = (state.layout.platforms || []).find(p => p.id === platformId);
        if (!platform) return;

        // Check for infrastructure overlap
        // Shop is positioned relative to platform's x coordinate
        const shopAbsoluteX = platform.x + shopZone.x;
        const shopEndX = shopAbsoluteX + shopZone.width;
        
        // For overlap detection, we only need to check if the shop overlaps
        // with infrastructure that is within the platform area
        // Platform area in Y direction
        const platformStartY = platform.y;
        const platformEndY = platform.y + platform.width;

        // Check if shop overlaps with any infrastructure within the platform bounds
        const overlappingInfra = state.layout.infrastructureBlocks.filter(infra => {
          const infraStartX = infra.position.x;
          const infraEndX = infra.position.x + infra.dimensions.width;
          const infraStartY = infra.position.y;
          const infraEndY = infra.position.y + infra.dimensions.height;

          // First check if infrastructure intersects with this platform's Y range
          const infraIntersectsPlatform = infraStartY < platformEndY && infraEndY > platformStartY;
          
          if (!infraIntersectsPlatform) return false;

          // Now check if shop's X position overlaps with infrastructure's X position
          const xOverlap = shopAbsoluteX < infraEndX && shopEndX > infraStartX;

          return xOverlap;
        });

        if (overlappingInfra.length > 0) {
          // Calculate blocked X ranges on this platform (convert to relative positions)
          const blockedRanges = overlappingInfra.map(infra => ({
            start: infra.position.x - platform.x,
            end: infra.position.x - platform.x + infra.dimensions.width
          }));

          // Sort blocked ranges by start position
          const sortedBlocked = [...blockedRanges].sort((a, b) => a.start - b.start);
          
          // Find first available gap that fits the shop
          const trackLength = platform.track?.length || 1500;
          let availableStart = 0;
          let foundSpace = false;

          // Check space before first blocked range
          if (sortedBlocked[0].start >= shopZone.width) {
            availableStart = 0;
            foundSpace = true;
          } else {
            // Check gaps between blocked ranges and after last one
            for (let i = 0; i < sortedBlocked.length; i++) {
              const gapStart = sortedBlocked[i].end;
              const gapEnd = i + 1 < sortedBlocked.length ? sortedBlocked[i + 1].start : trackLength;
              
              if (gapEnd - gapStart >= shopZone.width) {
                availableStart = gapStart;
                foundSpace = true;
                break;
              }
            }
          }

          if (!foundSpace) {
            alert('No space available on this platform for a shop of this size! Infrastructure is blocking the area.');
            return;
          }

          // Automatically adjust shop position
          shopZone.x = availableStart;
        }

        const newShopZone: ShopZone = {
          ...shopZone,
          id: generateId(),
        };

        set({
          layout: {
            ...state.layout,
            platforms: (state.layout.platforms || []).map(platform =>
              platform.id === platformId
                ? { ...platform, shops: [...platform.shops, newShopZone] }
                : platform
            ),
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      // Remove shop zone
      removeShopZone: (shopZoneId) => {
        const state = get();
        if (!state.layout) return;

        set({
          layout: {
            ...state.layout,
            platforms: (state.layout.platforms || []).map(platform => ({
              ...platform,
              shops: platform.shops.filter(shop => shop.id !== shopZoneId),
            })),
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
          selectedShopZoneId: state.selectedShopZoneId === shopZoneId ? null : state.selectedShopZoneId,
        });
      },

      // Update shop zone
      updateShopZone: (shopZoneId, updates) => {
        const state = get();
        if (!state.layout) return;

        set({
          layout: {
            ...state.layout,
            platforms: (state.layout.platforms || []).map(platform => ({
              ...platform,
              shops: platform.shops.map(shop =>
                shop.id === shopZoneId ? { ...shop, ...updates } : shop
              ),
            })),
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      // Move shop zone
      moveShopZone: (shopZoneId, newX) => {
        get().updateShopZone(shopZoneId, { x: newX });
      },

      // Resize shop zone
      resizeShopZone: (shopZoneId, newWidth) => {
        const state = get();
        if (!state.layout) return;

        // Find the platform containing this shop
        const platform = (state.layout.platforms || []).find(p => 
          p.shops.some(s => s.id === shopZoneId)
        );
        
        if (!platform) return;

        // Find the shop being resized
        const shopIndex = platform.shops.findIndex(s => s.id === shopZoneId);
        const shop = platform.shops[shopIndex];
        
        if (!shop) return;

        // Calculate the width change
        const widthDelta = newWidth - shop.width;

        // Update the shop width and adjust all shops to the right
        const updatedShops = platform.shops.map((s, index) => {
          if (s.id === shopZoneId) {
            // Resize this shop
            return { ...s, width: newWidth };
          } else if (index > shopIndex) {
            // Move shops to the right
            return { ...s, x: s.x + widthDelta };
          }
          return s;
        });

        // Update the layout
        set({
          layout: {
            ...state.layout,
            platforms: (state.layout.platforms || []).map(p =>
              p.id === platform.id
                ? { ...p, shops: updatedShops }
                : p
            ),
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      // Add infrastructure
      addInfrastructure: (block) => {
        const state = get();
        if (!state.layout) return;

        const newBlock: InfrastructureBlock = {
          ...block,
          id: generateId(),
        };

        set({
          layout: {
            ...state.layout,
            infrastructureBlocks: [...state.layout.infrastructureBlocks, newBlock],
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      // Add connector infrastructure (bridges, underpasses connecting platforms)
      addConnectorInfrastructure: (type, platformIds) => {
        const state = get();
        if (!state.layout || platformIds.length < 2) return;

        // Get the platforms
        const platforms = (state.layout.platforms || []).filter(p => 
          platformIds.includes(p.id)
        );

        if (platforms.length < 2) return;

        // Calculate vertical position: span from center of each platform's full structure
        // For inverted platforms, include the track on top; for normal, include track on bottom
        const platformCenters = platforms.map(p => {
          // Calculate the full extent of the platform including tracks
          let topExtent = p.y;
          let bottomExtent = p.y + p.width;
          
          // For inverted single-track platforms, track is on top
          if (!p.isDualTrack && p.isInverted && p.track && p.restrictedZone) {
            topExtent = p.y - p.restrictedZone.height - p.track.height;
          }
          // For normal single-track platforms, track is on bottom
          else if (!p.isDualTrack && !p.isInverted && p.track && p.restrictedZone) {
            bottomExtent = p.y + p.width + p.restrictedZone.height + p.track.height;
          }
          // For dual-track platforms, tracks on both sides
          else if (p.isDualTrack) {
            if (p.topTrack && p.topRestrictedZone) {
              topExtent = p.y - p.topRestrictedZone.height - p.topTrack.height;
            }
            if (p.bottomTrack && p.bottomRestrictedZone) {
              bottomExtent = p.y + p.width + p.bottomRestrictedZone.height + p.bottomTrack.height;
            }
          }
          
          // Return the center of the full structure
          return (topExtent + bottomExtent) / 2;
        });

        const minCenter = Math.min(...platformCenters);
        const maxCenter = Math.max(...platformCenters);
        
        // Position infrastructure from center to center
        const minY = minCenter;
        const maxY = maxCenter;
        const height = maxY - minY;

        // Calculate X position: center of platforms or specific positioning
        let xPosition: number;
        let width: number;
        
        if (type === 'FOOT_OVER_BRIDGE' || type === 'UNDERPASS') {
          // For FOB and Underpass: place at the side spanning all platforms
          const minX = Math.min(...platforms.map(p => p.x));
          xPosition = minX - 60; // 60px to the left of leftmost platform
          width = 40; // Narrow vertical bar
        } else {
          // For Stairs, Elevator, Escalator: center between platforms
          const avgX = platforms.reduce((sum, p) => sum + p.x + p.length / 2, 0) / platforms.length;
          xPosition = avgX - 25;
          width = 50;
        }

        const newBlock: InfrastructureBlock = {
          id: generateId(),
          type,
          position: { x: xPosition, y: minY },
          dimensions: { width, height },
          rotation: 0,
          isLocked: false,
          isConnector: true,
          connectedPlatforms: platformIds,
          metadata: {
            label: `${type.replace('_', ' ')} (${platforms.length} platforms)`,
          },
        };

        set({
          layout: {
            ...state.layout,
            infrastructureBlocks: [...state.layout.infrastructureBlocks, newBlock],
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      // Remove infrastructure
      removeInfrastructure: (blockId) => {
        const state = get();
        if (!state.layout) return;

        set({
          layout: {
            ...state.layout,
            infrastructureBlocks: state.layout.infrastructureBlocks.filter(b => b.id !== blockId),
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
          selectedInfrastructureId: state.selectedInfrastructureId === blockId ? null : state.selectedInfrastructureId,
        });
      },

      // Move infrastructure
      moveInfrastructure: (blockId, x, y) => {
        const state = get();
        if (!state.layout) return;

        set({
          layout: {
            ...state.layout,
            infrastructureBlocks: state.layout.infrastructureBlocks.map(block =>
              block.id === blockId
                ? { ...block, position: { x, y } }
                : block
            ),
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      // Rotate infrastructure
      rotateInfrastructure: (blockId, rotation) => {
        const state = get();
        if (!state.layout) return;

        set({
          layout: {
            ...state.layout,
            infrastructureBlocks: state.layout.infrastructureBlocks.map(block =>
              block.id === blockId ? { ...block, rotation } : block
            ),
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      // Toggle infrastructure lock
      toggleInfrastructureLock: (blockId) => {
        const state = get();
        if (!state.layout) return;

        set({
          layout: {
            ...state.layout,
            infrastructureBlocks: state.layout.infrastructureBlocks.map(block =>
              block.id === blockId ? { ...block, isLocked: !block.isLocked } : block
            ),
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      // Canvas controls
      setZoom: (zoom) => {
        const clampedZoom = Math.max(
          CANVAS_CONSTANTS.MIN_ZOOM,
          Math.min(CANVAS_CONSTANTS.MAX_ZOOM, zoom)
        );
        set({ zoom: clampedZoom });
      },

      setPanOffset: (offset) => set({ panOffset: offset }),

      toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

      toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),

      resetView: () => set({ zoom: 1, panOffset: { x: 0, y: 0 } }),

      // Selection
      selectTrack: (trackId) => set({ selectedTrackId: trackId }),
      selectPlatform: (platformId) => set({ selectedPlatformId: platformId }),
      selectShopZone: (shopZoneId) => set({ selectedShopZoneId: shopZoneId }),
      selectInfrastructure: (blockId) => set({ selectedInfrastructureId: blockId }),
      
      clearSelection: () => set({
        selectedTrackId: null,
        selectedPlatformId: null,
        selectedShopZoneId: null,
        selectedInfrastructureId: null,
      }),

      // History (simplified - full implementation would store state snapshots)
      undo: () => {
        const state = get();
        if (state.historyIndex > 0) {
          const previousLayout = state.history[state.historyIndex - 1];
          set({ 
            layout: previousLayout ? JSON.parse(JSON.stringify(previousLayout)) : null,
            historyIndex: state.historyIndex - 1 
          });
        }
      },

      redo: () => {
        const state = get();
        if (state.historyIndex < state.history.length - 1) {
          const nextLayout = state.history[state.historyIndex + 1];
          set({ 
            layout: nextLayout ? JSON.parse(JSON.stringify(nextLayout)) : null,
            historyIndex: state.historyIndex + 1 
          });
        }
      },

      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      // Validation
      validateLayout: () => {
        const state = get();
        const errors: string[] = [];

        if (!state.layout) {
          errors.push('No layout loaded');
          return { isValid: false, errors };
        }

        if (state.layout.tracks.length === 0) {
          errors.push('Layout must have at least one track');
        }

        if (!state.layout.platforms || state.layout.platforms.length === 0) {
          errors.push('Layout must have at least one platform');
        }

        // Validate platform numbering is sequential
        const platformNumbers = state.layout.platforms
          .map(p => parseInt(p.platformNumber))
          .filter(n => !isNaN(n))
          .sort((a, b) => a - b);
        
        if (platformNumbers.length > 0) {
          for (let i = 1; i < platformNumbers.length; i++) {
            if (platformNumbers[i] !== platformNumbers[i-1] && 
                platformNumbers[i] !== platformNumbers[i-1] + 1) {
              errors.push(`Platform numbering is not sequential. Missing platform ${platformNumbers[i-1] + 1}`);
              break;
            }
          }
        }

        return { isValid: errors.length === 0, errors };
      },

      // Validation with station platform count
      validateWithStationData: (stationPlatformCount: number) => {
        const state = get();
        const errors: string[] = [];

        if (!state.layout) {
          errors.push('No layout loaded');
          return { isValid: false, errors };
        }

        // Check if there's at least one track (either independent or from platforms)
        const hasTrack = state.layout.tracks.length > 0 || 
          state.layout.platforms?.some(p => p.track || p.topTrack || p.bottomTrack);
        
        if (!hasTrack) {
          errors.push('Layout must have at least one track');
        }

        if (!state.layout.platforms || state.layout.platforms.length === 0) {
          errors.push('Layout must have at least one platform');
        }

        // Calculate actual platform count (dual-track platforms count as 2)
        const actualPlatformCount = state.layout.platforms?.reduce((count, p) => {
          return count + (p.isDualTrack ? 2 : 1);
        }, 0) || 0;
        
        // Check if platform count matches station's expected count
        if (actualPlatformCount !== stationPlatformCount) {
          errors.push(
            `Platform count mismatch: Your station has ${stationPlatformCount} platform${stationPlatformCount !== 1 ? 's' : ''} ` +
            `but your layout has ${actualPlatformCount} platform${actualPlatformCount !== 1 ? 's' : ''}. ` +
            `Please ${actualPlatformCount < stationPlatformCount ? 'add' : 'remove'} ${Math.abs(stationPlatformCount - actualPlatformCount)} platform${Math.abs(stationPlatformCount - actualPlatformCount) !== 1 ? 's' : ''}.`
          );
        }

        // Validate platform numbering is sequential
        // For dual-track platforms, collect both numbers (n and n+1)
        const platformNumbers = state.layout.platforms
          .flatMap(p => {
            const num = parseInt(p.platformNumber);
            return p.isDualTrack ? [num, num + 1] : [num];
          })
          .filter(n => !isNaN(n))
          .sort((a, b) => a - b);
        
        if (platformNumbers.length > 0) {
          // Check if numbering starts from 1
          if (platformNumbers[0] !== 1) {
            errors.push('Platform numbering should start from 1');
          }
          
          // Check if all platforms from 1 to stationPlatformCount exist
          for (let i = 1; i <= stationPlatformCount; i++) {
            if (!platformNumbers.includes(i)) {
              errors.push(`Missing Platform ${i}`);
            }
          }
          
          // Check for sequential numbering
          for (let i = 1; i < platformNumbers.length; i++) {
            if (platformNumbers[i] !== platformNumbers[i-1] && 
                platformNumbers[i] !== platformNumbers[i-1] + 1) {
              errors.push(`Platform numbering is not sequential. Gap between Platform ${platformNumbers[i-1]} and ${platformNumbers[i]}`);
              break;
            }
          }
        }

        return { isValid: errors.length === 0, errors };
      },

      // Export
      exportLayout: () => {
        const state = get();
        if (!state.layout) return null;

        // For the new platform-based architecture, we export platforms directly
        // Each platform contains its own track information
        const exportedPlatforms = (state.layout.platforms || []).map(platform => ({
          id: platform.id,
          platformNumber: platform.platformNumber,
          x: platform.x,
          y: platform.y,
          length: platform.length,
          width: platform.width,
          shops: platform.shops.map(shop => ({
            id: shop.id,
            x: shop.x,
            width: shop.width,
            height: shop.height, // Include height field
            category: shop.category,
            isAllocated: shop.isAllocated || false,
          })),
          isDualTrack: platform.isDualTrack || false,
          isInverted: platform.isInverted || false,
          // Include track information based on platform type
          ...(platform.track && {
            track: {
              trackNumber: platform.track.trackNumber,
              x: platform.track.x,
              y: platform.track.y,
              length: platform.track.length,
              height: platform.track.height,
            }
          }),
          ...(platform.restrictedZone && {
            restrictedZone: {
              height: platform.restrictedZone.height,
            }
          }),
          ...(platform.topTrack && {
            topTrack: {
              trackNumber: platform.topTrack.trackNumber,
              height: platform.topTrack.height,
            }
          }),
          ...(platform.topRestrictedZone && {
            topRestrictedZone: {
              height: platform.topRestrictedZone.height,
            }
          }),
          ...(platform.bottomTrack && {
            bottomTrack: {
              trackNumber: platform.bottomTrack.trackNumber,
              height: platform.bottomTrack.height,
            }
          }),
          ...(platform.bottomRestrictedZone && {
            bottomRestrictedZone: {
              height: platform.bottomRestrictedZone.height,
            }
          }),
          restrictedZones: [], // Keep for backward compatibility
        }));

        const exportData = {
          stationId: state.layout.stationId,
          stationName: state.layout.stationName,
          stationCode: state.layout.stationCode,
          // Export empty tracks array for backward compatibility, 
          // actual track data is in platforms
          tracks: [],
          platforms: exportedPlatforms,
          infrastructureBlocks: state.layout.infrastructureBlocks || [],
          canvasSettings: {
            ...state.layout.canvasSettings,
            scale: state.zoom,
          },
          metadata: {
            ...state.layout.metadata,
            updatedAt: new Date().toISOString(),
          },
        };

        return exportData;
      },

      // UI state
      setDragging: (isDragging) => set({ isDragging }),
      setResizing: (isResizing) => set({ isResizing }),
      setSaving: (isSaving) => set({ isSaving }),

      // Multi-select actions
      toggleElementSelection: (elementId) => {
        const state = get();
        const isSelected = state.selectedElementIds.includes(elementId);
        
        set({
          selectedElementIds: isSelected
            ? state.selectedElementIds.filter(id => id !== elementId)
            : [...state.selectedElementIds, elementId],
        });
      },

      selectMultipleElements: (elementIds) => {
        set({ selectedElementIds: elementIds });
      },

      // Grouping actions
      createGroup: (name, elementIds) => {
        const state = get();
        if (!state.layout) return;

        const newGroup: ElementGroup = {
          id: generateId(),
          name,
          elementIds,
          createdAt: new Date().toISOString(),
        };

        set({
          layout: {
            ...state.layout,
            groups: [...(state.layout.groups || []), newGroup],
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
          selectedGroupId: newGroup.id,
          selectedElementIds: elementIds, // Keep elements selected so UI shows the new group
        });
      },

      removeGroup: (groupId) => {
        const state = get();
        if (!state.layout) return;

        set({
          layout: {
            ...state.layout,
            groups: (state.layout.groups || []).filter(g => g.id !== groupId),
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
          selectedGroupId: state.selectedGroupId === groupId ? null : state.selectedGroupId,
        });
      },

      addElementsToGroup: (groupId, elementIds) => {
        const state = get();
        if (!state.layout) return;

        set({
          layout: {
            ...state.layout,
            groups: (state.layout.groups || []).map(group =>
              group.id === groupId
                ? { ...group, elementIds: [...new Set([...group.elementIds, ...elementIds])] }
                : group
            ),
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      removeElementsFromGroup: (groupId, elementIds) => {
        const state = get();
        if (!state.layout) return;

        set({
          layout: {
            ...state.layout,
            groups: (state.layout.groups || []).map(group =>
              group.id === groupId
                ? { ...group, elementIds: group.elementIds.filter(id => !elementIds.includes(id)) }
                : group
            ),
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },

      selectGroup: (groupId) => {
        const state = get();
        if (!state.layout) return;

        const group = (state.layout.groups || []).find(g => g.id === groupId);
        
        set({
          selectedGroupId: groupId,
          selectedElementIds: group ? group.elementIds : [],
        });
      },

      moveGroup: (groupId, deltaX, deltaY) => {
        const state = get();
        if (!state.layout) return;

        const group = (state.layout.groups || []).find(g => g.id === groupId);
        if (!group) return;

        // Move all elements in the group
        const updatedTracks = state.layout.tracks.map(track => {
          if (group.elementIds.includes(track.id)) {
            return { ...track, x: track.x + deltaX, y: track.y + deltaY };
          }
          return track;
        });

        const updatedPlatforms = (state.layout.platforms || []).map(platform => {
          if (group.elementIds.includes(platform.id)) {
            return { ...platform, x: platform.x + deltaX, y: platform.y + deltaY };
          }
          return platform;
        });

        const updatedRestrictedZones = (state.layout.restrictedZones || []).map(zone => {
          if (group.elementIds.includes(zone.id)) {
            return { ...zone, x: zone.x + deltaX, y: zone.y + deltaY };
          }
          return zone;
        });

        set({
          layout: {
            ...state.layout,
            tracks: updatedTracks,
            platforms: updatedPlatforms,
            restrictedZones: updatedRestrictedZones,
            metadata: { ...state.layout.metadata, updatedAt: new Date().toISOString() },
          },
        });
      },
    }),
    { name: 'LayoutEditorStore' }
  )
);
