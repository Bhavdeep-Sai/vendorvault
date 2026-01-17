/**
 * InfrastructureToolbar Component
 * 
 * Clickable toolbar with railway infrastructure elements
 * Click to add infrastructure to canvas
 */

'use client';

import React from 'react';
import { InfrastructureType } from '@/types/layout';

interface InfrastructureItemProps {
  type: InfrastructureType;
  icon: React.ReactNode;
  label: string;
  onClick: (type: InfrastructureType) => void;
}

const InfrastructureItem: React.FC<InfrastructureItemProps> = ({ type, icon, label, onClick }) => {
  return (
    <button
      onClick={() => onClick(type)}
      className="flex flex-col items-center justify-center p-2.5 bg-white border border-gray-200 rounded-md cursor-pointer hover:border-blue-500 hover:bg-blue-50 hover:shadow-sm transition-all group active:scale-95"
    >
      <div className="text-gray-700 group-hover:text-blue-600 transition-colors mb-1.5">
        {icon}
      </div>
      <div className="text-[10px] font-medium text-center leading-tight text-gray-700">
        {label}
      </div>
    </button>
  );
};

// SVG Icon Components
const EntranceIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M3 12h12"/>
  </svg>
);

const ExitIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
  </svg>
);

const FOBIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M6 10v11M18 10v11M10 10v11M14 10v11"/>
  </svg>
);

const UnderpassIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 21h18M5 21v-8a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v8M12 9V3M9 6l3-3 3 3"/>
  </svg>
);

const StairsIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 21h14M5 21v-4h4v-4h4v-4h4V5"/>
  </svg>
);

const ElevatorIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="2" width="16" height="20" rx="2"/>
    <path d="M10 8l-2 2 2 2M14 14l2-2-2-2"/>
  </svg>
);

const EscalatorIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 21h4a2 2 0 0 0 1.5-.7l8-9.3a2 2 0 0 1 1.5-.7h4M6 3h4a2 2 0 0 1 1.5.7l8 9.3a2 2 0 0 0 1.5.7h4"/>
  </svg>
);

const TicketIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="10" rx="2"/>
    <circle cx="12" cy="12" r="1"/>
    <path d="M7 12h.01M17 12h.01"/>
  </svg>
);

const WaitingHallIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9zM9 21V9M15 21V9M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"/>
  </svg>
);

const WashroomIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="7" r="2"/>
    <path d="M9 9v6l-2 4M9 15l2 4M15 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM15 9v10"/>
  </svg>
);

const WaterIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
  </svg>
);

const SecurityIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const InfoDeskIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4M12 8h.01"/>
  </svg>
);

const ParkingIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M9 8h4a3 3 0 0 1 0 6H9V8z"/>
  </svg>
);

const TaxiIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 11h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2zM7 11V8l1.5-3h7L17 8v3"/>
    <circle cx="7" cy="17" r="1"/>
    <circle cx="17" cy="17" r="1"/>
  </svg>
);

export const InfrastructureToolbar: React.FC<{ onAddInfrastructure: (type: InfrastructureType) => void }> = ({ onAddInfrastructure }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const [showConnectorMode, setShowConnectorMode] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState<InfrastructureType | null>(null);

  const infrastructureItems: { type: InfrastructureType; label: string; icon: React.ReactNode; canConnect?: boolean }[] = [
    { type: 'ENTRANCE', label: 'Entrance', icon: <EntranceIcon /> },
    { type: 'EXIT', label: 'Exit', icon: <ExitIcon /> },
    { type: 'FOOT_OVER_BRIDGE', label: 'FOB', icon: <FOBIcon />, canConnect: true },
    { type: 'UNDERPASS', label: 'Underpass', icon: <UnderpassIcon />, canConnect: true },
    { type: 'STAIRCASE', label: 'Stairs', icon: <StairsIcon />, canConnect: true },
    { type: 'ELEVATOR', label: 'Elevator', icon: <ElevatorIcon />, canConnect: true },
    { type: 'ESCALATOR', label: 'Escalator', icon: <EscalatorIcon />, canConnect: true },
    { type: 'TICKET_COUNTER', label: 'Tickets', icon: <TicketIcon /> },
    { type: 'WAITING_HALL', label: 'Waiting Hall', icon: <WaitingHallIcon /> },
    { type: 'WASHROOM', label: 'Washroom', icon: <WashroomIcon /> },
    { type: 'DRINKING_WATER', label: 'Water', icon: <WaterIcon /> },
    { type: 'SECURITY_CHECK', label: 'Security', icon: <SecurityIcon /> },
    { type: 'INFORMATION_DESK', label: 'Info', icon: <InfoDeskIcon /> },
    { type: 'PARKING', label: 'Parking', icon: <ParkingIcon /> },
    { type: 'TAXI_STAND', label: 'Taxi Stand', icon: <TaxiIcon /> },
  ];

  const handleItemClick = (type: InfrastructureType) => {
    const item = infrastructureItems.find(i => i.type === type);
    if (item?.canConnect) {
      setSelectedType(type);
      setShowConnectorMode(true);
    } else {
      onAddInfrastructure(type);
    }
  };

  const handleCancelConnector = () => {
    setShowConnectorMode(false);
    setSelectedType(null);
  };

  if (isCollapsed) {
    return (
      <div className="w-10 h-full bg-gray-50 border-r border-gray-200 flex flex-col items-center py-2">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          title="Expand Infrastructure Toolbar"
        >
          <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    );
  }

  if (showConnectorMode && selectedType) {
    return (
      <div className="w-56 h-full bg-gray-50 border-r border-gray-200 shadow-xl">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-gray-800">
              Connect Platforms
            </h3>
            <button
              onClick={handleCancelConnector}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Cancel"
            >
              <svg className="w-3.5 h-3.5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm font-semibold text-blue-800 mb-1">
              {selectedType.replace('_', ' ')}
            </div>
            <div className="text-[10px] text-blue-600">
              Ctrl+Click platforms to connect
            </div>
          </div>

          <ConnectorPlatformSelector
            infrastructureType={selectedType}
            onCancel={handleCancelConnector}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-56 h-full bg-gray-50 border-r border-gray-200 overflow-y-auto shadow-xl">
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-gray-800">
            Infrastructure
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
        <p className="text-[10px] text-gray-600 mb-3">
          Click to add to canvas
        </p>
        
        <div className="grid grid-cols-3 gap-2">
          {infrastructureItems.map((item) => (
            <div key={item.type} className="relative">
              <InfrastructureItem
                type={item.type}
                icon={item.icon}
                label={item.label}
                onClick={handleItemClick}
              />
              {item.canConnect && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Connector Platform Selector Component
const ConnectorPlatformSelector: React.FC<{
  infrastructureType: InfrastructureType;
  onCancel: () => void;
}> = ({ infrastructureType, onCancel }) => {
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<string[]>([]);
  const { layout, addConnectorInfrastructure } = useLayoutStore();

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleCreate = () => {
    if (selectedPlatforms.length >= 2) {
      addConnectorInfrastructure(infrastructureType, selectedPlatforms);
      onCancel();
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-gray-800">
        Select Platforms ({selectedPlatforms.length} selected)
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {layout?.platforms?.map((platform) => (
          <button
            key={platform.id}
            onClick={() => handlePlatformToggle(platform.id)}
            className={`w-full p-2 rounded-lg border text-left transition-all ${
              selectedPlatforms.includes(platform.id)
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                selectedPlatforms.includes(platform.id)
                  ? 'border-green-500 bg-green-500'
                  : 'border-gray-300'
              }`}>
                {selectedPlatforms.includes(platform.id) && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium text-gray-800">
                Platform {platform.platformNumber}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={selectedPlatforms.length < 2}
          className={`flex-1 px-3 py-2 text-xs font-medium text-white rounded ${
            selectedPlatforms.length >= 2
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Create Connection
        </button>
      </div>

      {selectedPlatforms.length < 2 && (
        <div className="text-[10px] text-orange-600 text-center">
          Select at least 2 platforms to connect
        </div>
      )}
    </div>
  );
};

// Import useLayoutStore
import { useLayoutStore } from '@/store/layoutStore';

