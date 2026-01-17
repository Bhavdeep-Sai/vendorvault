/**
 * DroppableCanvas Component
 * 
 * Enhanced canvas component with drag-and-drop support and pan functionality
 * Handles dropping infrastructure blocks and shop zones
 * Click and drag on empty space to pan the canvas
 */

'use client';

import React, { useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useLayoutStore } from '@/store/layoutStore';
import { StationCanvas } from './StationCanvas';

export const DroppableCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-droppable',
  });

  const { panOffset, setPanOffset } = useLayoutStore();

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start panning if clicking directly on the canvas (not on elements)
    if (e.target === e.currentTarget || (e.target as HTMLElement).id === 'canvas-droppable') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  return (
    <div
      id="canvas-droppable"
      ref={(node) => {
        setNodeRef(node);
        if (canvasRef.current !== node) {
          canvasRef.current = node;
        }
      }}
      className={`relative w-full h-full overflow-auto ${isOver ? 'ring-4 ring-blue-400' : ''} ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <StationCanvas />
    </div>
  );
};

