'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface StationData {
  _id?: string;
  stationName: string;
  stationCode: string;
  railwayZone: string;
  division?: string;
  stationCategory: string;
  platformsCount?: number;
  dailyFootfallAvg?: number;
  city?: string;
  state?: string;
  pincode?: string;
  address?: string;
}

interface StationAutocompleteProps {
  id?: string;
  name?: string;
  value: string;
  onStationSelect: (station: StationData) => void;
  onInputChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  label?: string;
  errorMessage?: string;
}

export const StationAutocomplete: React.FC<StationAutocompleteProps> = ({
  id,
  name,
  value,
  onStationSelect,
  onInputChange,
  placeholder = 'Search for a station',
  required = false,
  disabled = false,
  error = false,
  className = '',
  label,
  errorMessage,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<StationData[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Clear debounce timer on unmount
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isOpen]);

  const searchStations = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/stations/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.stations || []);
        setIsOpen(data.stations?.length > 0);
      }
    } catch (error) {
      console.error('Failed to search stations:', error);
      setSearchResults([]);
      setIsOpen(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onInputChange(inputValue);
    
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    if (inputValue.length >= 2) {
      setIsSearching(true); // Show loading immediately
      // Debounce the API call by 300ms
      debounceTimerRef.current = setTimeout(() => {
        searchStations(inputValue);
      }, 300);
      setHighlightedIndex(-1);
    } else {
      setSearchResults([]);
      setIsOpen(false);
      setIsSearching(false);
    }
  };

  const handleStationSelect = (station: StationData) => {
    onStationSelect(station);
    setIsOpen(false);
    setSearchResults([]);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
          const selectedStation = searchResults[highlightedIndex];
          if (selectedStation) {
            handleStationSelect(selectedStation);
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const baseClasses = "w-full px-4 py-3 bg-white border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none transition-all duration-200";
  
  const stateClasses = error
    ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500'
    : isOpen
    ? 'border-cyan-500 ring-2 ring-cyan-500'
    : 'border-gray-200 hover:border-gray-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500';
  
  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed bg-gray-50'
    : '';

  const labelClasses = "block text-sm font-semibold text-gray-700 mb-2";

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className={labelClasses}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative" ref={dropdownRef}>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchResults.length > 0) {
              setIsOpen(true);
            }
          }}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          className={`${baseClasses} ${stateClasses} ${disabledClasses}`}
          autoComplete="off"
        />

        {/* Search Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>

        {/* Dropdown Results */}
        {isOpen && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-cyan-500 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
            <div className="py-2">
              {searchResults.map((station, index) => (
                <button
                  key={station.stationCode}
                  type="button"
                  onClick={() => handleStationSelect(station)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-4 py-3 hover:bg-cyan-50 transition-colors ${
                    highlightedIndex === index ? 'bg-cyan-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{station.stationName}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="font-medium text-cyan-600">{station.stationCode}</span>
                        {' • '}
                        <span>{station.railwayZone}</span>
                        {' • '}
                        <span>Category {station.stationCategory}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {station.platformsCount || 0} platforms • {((station.dailyFootfallAvg || 0) / 1000).toFixed(0)}K daily footfall
                      </div>
                    </div>
                    <div className="ml-3">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-cyan-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {isOpen && value.length >= 2 && searchResults.length === 0 && (
          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-300 rounded-xl shadow-lg p-4">
            <p className="text-gray-500 text-sm text-center">No stations found matching &ldquo;{value}&rdquo;</p>
            <p className="text-gray-400 text-xs text-center mt-1">Try searching by station name or code</p>
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="text-red-600 text-xs mt-1">{errorMessage}</p>
      )}
      
      {!errorMessage && value.length > 0 && value.length < 2 && (
        <p className="text-gray-500 text-xs mt-1">Type at least 2 characters to search</p>
      )}
    </div>
  );
};

export default StationAutocomplete;
