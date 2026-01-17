'use client';

import React, { useState, useRef, useEffect } from 'react';

interface InfoTooltipProps {
  content: string;
  className?: string;
  wide?: boolean; // For wider tooltips with more content
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, className = '', wide = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLButtonElement>(null);

  // Handle click outside to close tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isVisible &&
        tooltipRef.current &&
        iconRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        !iconRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && iconRef.current) {
      const iconRect = iconRef.current.getBoundingClientRect();
      const spaceAbove = iconRect.top;
      const spaceBelow = window.innerHeight - iconRect.bottom;
      
      // Show tooltip on bottom if not enough space on top
      setPosition(spaceAbove < 150 && spaceBelow > 150 ? 'bottom' : 'top');
    }
  }, [isVisible]);

  // Split content by | for better formatting
  const contentParts = content.split('|').map(part => part.trim());
  const hasMultipleParts = contentParts.length > 1;

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={iconRef}
        type="button"
        onClick={(e) => {
          setIsVisible(!isVisible);
          // Remove focus ring when closing
          if (isVisible) {
            e.currentTarget.blur();
          }
        }}
        className="inline-flex items-center justify-center w-4 h-4 text-cyan-600 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 rounded-full transition-colors"
        aria-label="More information"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-4 h-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
      </button>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 ${wide ? 'w-96' : 'w-72'} text-sm text-white bg-gray-900 rounded-lg shadow-xl max-h-[400px] overflow-y-auto ${
            position === 'top'
              ? 'bottom-full mb-2 right-0'
              : 'top-full mt-2 right-0'
          }`}
          role="tooltip"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 #1e293b' }}
        >
          <div className="relative px-4 py-3">
            {hasMultipleParts ? (
              <div className="space-y-2.5">
                {contentParts.map((part, index) => {
                  // Check if part starts with a bullet point marker
                  if (part.startsWith('• ')) {
                    return (
                      <div key={index} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-cyan-400 flex-shrink-0">•</span>
                        <span className="flex-1">{part.substring(2)}</span>
                      </div>
                    );
                  }
                  // Check if it's a section header (ends with :)
                  if (part.endsWith(':')) {
                    return (
                      <div key={index} className="font-semibold text-cyan-300 leading-relaxed mt-1">
                        {part}
                      </div>
                    );
                  }
                  return (
                    <div key={index} className="leading-relaxed">
                      {part}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="leading-relaxed">{content}</div>
            )}
            {/* Arrow */}
            <div
              className={`absolute w-2 h-2 bg-gray-900 rotate-45 ${
                position === 'top' ? '-bottom-1 right-4' : '-top-1 right-4'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoTooltip;
