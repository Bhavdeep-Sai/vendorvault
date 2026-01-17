'use client';

import React, { useState, useRef, useEffect } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  label?: string;
  errorMessage?: string;
}

export const Select: React.FC<SelectProps> = ({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  required = false,
  disabled = false,
  error = false,
  className = '',
  label,
  errorMessage,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selected = options.find(opt => opt.value === value);
    setSelectedLabel(selected?.label || '');
  }, [value, options]);

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
    };
  }, [isOpen]);

  const handleSelect = (option: SelectOption) => {
    const syntheticEvent = {
      target: { name: name || '', value: option.value },
    } as React.ChangeEvent<HTMLSelectElement>;
    
    onChange(syntheticEvent);
    setIsOpen(false);
  };

  const baseClasses = "w-full px-4 py-3 bg-white border-2 rounded-xl text-gray-900 focus:outline-none transition-all duration-200 cursor-pointer";
  
  const stateClasses = error
    ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500'
    : isOpen
    ? 'border-cyan-500 ring-2 ring-cyan-500'
    : 'border-gray-200 hover:border-gray-300';
  
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
        {/* Custom Select Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`${baseClasses} ${stateClasses} ${disabledClasses} flex items-center justify-between`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={selectedLabel ? 'text-gray-900' : 'text-gray-400'}>
            {selectedLabel || placeholder}
          </span>
          
          {/* Dropdown arrow */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className={`w-5 h-5 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            } ${error ? 'text-red-500' : 'text-gray-400'}`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>

        {/* Hidden native select for form submission */}
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className="sr-only"
          tabIndex={-1}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Custom Dropdown Menu */}
        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-cyan-500 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {options.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full px-4 py-3 text-left transition-all duration-150 ${
                    option.value === value
                      ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold'
                      : 'text-gray-700 hover:bg-cyan-50 hover:text-cyan-700'
                  } ${index !== 0 ? 'border-t border-gray-100' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option.label}</span>
                    {option.value === value && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {errorMessage && error && (
        <p className="text-red-600 text-xs mt-1">{errorMessage}</p>
      )}
    </div>
  );
};

export default Select;
