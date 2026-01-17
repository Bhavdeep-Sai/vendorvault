/**
 * Railway Station Layout Editor - Type Definitions
 * 
 * Comprehensive type system for station layout editor
 * supporting tracks, platforms, shops, and infrastructure blocks
 */

export type ShopCategory = 
  | 'food' 
  | 'retail' 
  | 'kiosk' 
  | 'bookstore' 
  | 'pharmacy' 
  | 'electronics'
  | 'clothing'
  | 'other'
  | 'general'; // Generic allocation area (not category-specific)

export type InfrastructureType =
  | 'ENTRANCE'
  | 'EXIT'
  | 'FOOT_OVER_BRIDGE'
  | 'UNDERPASS'
  | 'STAIRCASE'
  | 'ELEVATOR'
  | 'ESCALATOR'
  | 'TICKET_COUNTER'
  | 'WAITING_HALL'
  | 'WASHROOM'
  | 'DRINKING_WATER'
  | 'SECURITY_CHECK'
  | 'INFORMATION_DESK'
  | 'PARKING'
  | 'TAXI_STAND';

export interface Position {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface ShopZone {
  id: string;
  shopId?: string; // Assigned later when vendor is allocated
  x: number; // Position within platform
  width: number; // Length of shop zone
  height?: number; // Height of shop zone (optional, defaults to width for square)
  category: ShopCategory;
  minWidth: number; // Minimum allowed width
  maxWidth: number; // Maximum allowed width
  isAllocated: boolean; // Whether vendor is assigned
  vendorId?: string;
  rent?: number;
  notes?: string;
}

export interface Platform {
  id: string;
  platformNumber: string;
  x: number; // Horizontal position in canvas
  y: number; // Vertical position in canvas
  length: number; // Total platform length
  width: number; // Platform width (perpendicular to track)
  shops: ShopZone[];
  restrictedZones: { x: number; width: number; height?: number; side?: 'track' | 'end' }[]; // No shops allowed here
  
  // Integrated track and restricted zone
  track?: {
    trackNumber: number;
    height: number;
  };
  restrictedZone?: {
    height: number;
  };
  isInverted?: boolean; // For single-track platforms: flip track position (top instead of bottom)
  
  // Dual-track configuration (platform between two tracks)
  isDualTrack?: boolean;
  topTrack?: {
    trackNumber: number;
    height: number;
  };
  topRestrictedZone?: {
    height: number;
  };
  bottomTrack?: {
    trackNumber: number;
    height: number;
  };
  bottomRestrictedZone?: {
    height: number;
  };
}

export interface Track {
  id: string;
  trackNumber: number;
  x: number; // Horizontal position in canvas
  y: number; // Vertical position in canvas
  length: number; // Total track length
  height: number; // Track height
}

export interface RestrictedZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementGroup {
  id: string;
  name: string;
  elementIds: string[]; // IDs of tracks, platforms, and restricted zones
  createdAt: string;
}

export interface InfrastructureBlock {
  id: string;
  type: InfrastructureType;
  position: Position;
  dimensions: Dimensions;
  rotation: number; // Degrees
  isLocked: boolean; // Prevent accidental movement
  metadata?: {
    label?: string;
    capacity?: number;
    [key: string]: any;
  };
  // Platform connections for bridges, underpasses, etc.
  connectedPlatforms?: string[]; // Array of platform IDs this infrastructure connects
  isConnector?: boolean; // If true, this infrastructure connects platforms
}

export interface StationLayout {
  stationId: string;
  stationName: string;
  stationCode: string;
  tracks: Track[];
  platforms: Platform[]; // Independent platforms array
  restrictedZones: RestrictedZone[]; // Independent restricted zones array
  groups: ElementGroup[]; // Groups of elements
  infrastructureBlocks: InfrastructureBlock[];
  canvasSettings: {
    width: number;
    height: number;
    gridSize: number;
    snapToGrid: boolean;
    scale: number; // Zoom level
  };
  metadata: {
    version: string;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    isLocked: boolean; // Lock entire layout
  };
}

// Drag and drop types
export interface DragItem {
  type: 'INFRASTRUCTURE' | 'SHOP_ZONE';
  infrastructureType?: InfrastructureType;
  shopZone?: ShopZone;
  sourceType: 'toolbar' | 'canvas';
}

// Editor action history for undo/redo
export interface EditorAction {
  type: 
    | 'ADD_TRACK'
    | 'REMOVE_TRACK'
    | 'ADD_PLATFORM'
    | 'REMOVE_PLATFORM'
    | 'ADD_SHOP_ZONE'
    | 'REMOVE_SHOP_ZONE'
    | 'UPDATE_SHOP_ZONE'
    | 'ADD_INFRASTRUCTURE'
    | 'REMOVE_INFRASTRUCTURE'
    | 'MOVE_INFRASTRUCTURE'
    | 'UPDATE_CANVAS_SETTINGS';
  timestamp: number;
  data: any;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Export format for API
export interface LayoutExportData {
  layout: StationLayout;
  exportedAt: string;
  exportFormat: 'json' | 'mongodb';
}

// Infrastructure block dimensions and defaults
export const INFRASTRUCTURE_DEFAULTS: Record<InfrastructureType, Dimensions> = {
  ENTRANCE: { width: 80, height: 60 },
  EXIT: { width: 80, height: 60 },
  FOOT_OVER_BRIDGE: { width: 120, height: 40 },
  UNDERPASS: { width: 120, height: 40 },
  STAIRCASE: { width: 60, height: 80 },
  ELEVATOR: { width: 50, height: 50 },
  ESCALATOR: { width: 70, height: 100 },
  TICKET_COUNTER: { width: 100, height: 60 },
  WAITING_HALL: { width: 150, height: 120 },
  WASHROOM: { width: 80, height: 80 },
  DRINKING_WATER: { width: 40, height: 40 },
  SECURITY_CHECK: { width: 90, height: 60 },
  INFORMATION_DESK: { width: 70, height: 50 },
  PARKING: { width: 200, height: 150 },
  TAXI_STAND: { width: 150, height: 80 },
};

// Shop category colors
export const SHOP_CATEGORY_COLORS: Record<ShopCategory, string> = {
  food: '#EF4444', // Red
  retail: '#3B82F6', // Blue
  kiosk: '#F59E0B', // Amber
  bookstore: '#8B5CF6', // Purple
  pharmacy: '#10B981', // Green
  electronics: '#06B6D4', // Cyan
  clothing: '#EC4899', // Pink
  other: '#6B7280', // Gray
  general: '#3B82F6', // Blue (generic allocation area)
};

// Infrastructure icons (using emoji for simplicity, can replace with SVG)
export const INFRASTRUCTURE_ICONS: Record<InfrastructureType, string> = {
  ENTRANCE: '🚪',
  EXIT: '🚪',
  FOOT_OVER_BRIDGE: '🌉',
  UNDERPASS: '🚇',
  STAIRCASE: '🪜',
  ELEVATOR: '🛗',
  ESCALATOR: '⬆️',
  TICKET_COUNTER: '🎫',
  WAITING_HALL: '💺',
  WASHROOM: '🚻',
  DRINKING_WATER: '🚰',
  SECURITY_CHECK: '🔒',
  INFORMATION_DESK: 'ℹ️',
  PARKING: '🅿️',
  TAXI_STAND: '🚕',
};

// Canvas constants
export const CANVAS_CONSTANTS = {
  MIN_ZOOM: 0.25,
  MAX_ZOOM: 2.0,
  ZOOM_STEP: 0.1,
  GRID_SIZE: 20,
  TRACK_HEIGHT: 40,
  PLATFORM_HEIGHT: 150,
  PLATFORM_SPACING: 20,
  RESTRICTED_ZONE_WIDTH: 150, // Red zone width at platform ends where shops can't be placed
  MIN_SHOP_WIDTH: 50,
  MAX_SHOP_WIDTH: 200,
  DEFAULT_SHOP_WIDTH: 100, // Default shop width
  DEFAULT_SHOP_HEIGHT: 100, // Default shop height (shops span platform width)
  DEFAULT_CANVAS_WIDTH: 2000,
  DEFAULT_CANVAS_HEIGHT: 2400, // Increased for better visibility of multiple platforms
  SNAP_THRESHOLD: 15, // Pixels within which edges snap together
};
