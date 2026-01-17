import { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@/components/Icons';
import { ReferenceStationModal } from './ReferenceStationModal';
import toast from 'react-hot-toast';

interface ReferenceStation {
  _id: string;
  stationName: string;
  stationCode: string;
  railwayZone: string;
  division?: string;
  stationCategory: string;
  platformsCount: number;
  dailyFootfallAvg: number;
  city?: string;
  state?: string;
  pincode?: string;
  address?: string;
}

interface ReferenceStationsManagementProps {
  stations: ReferenceStation[];
  onRefresh: () => void;
}

export function ReferenceStationsManagement({ stations, onRefresh }: ReferenceStationsManagementProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedStation, setSelectedStation] = useState<ReferenceStation | null>(null);

  const handleEdit = (station: ReferenceStation) => {
    setSelectedStation(station);
    setShowModal(true);
  };

  const handleAdd = () => {
    setSelectedStation(null);
    setShowModal(true);
  };

  const handleDelete = async (stationId: string) => {
    if (!confirm('Are you sure you want to delete this reference station?')) return;

    try {
      const res = await fetch(`/api/railway-admin/reference-stations/${stationId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Station deleted successfully');
        onRefresh();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete station');
      }
    } catch (error) {
      toast.error('Failed to delete station');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedStation(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Reference Stations Management</h2>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
        >
          <PlusIcon size={20} />
          Add Station
        </button>
      </div>

      {/* Reference Stations Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Station Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Zone</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Division</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Platforms</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stations.map((station) => (
                <tr key={station._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{station.stationName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{station.stationCode}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{station.railwayZone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{station.division || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{station.stationCategory}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {station.city && station.state ? `${station.city}, ${station.state}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{station.platformsCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(station)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit Station"
                      >
                        <PencilIcon size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(station._id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete Station"
                      >
                        <TrashIcon size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stations.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No reference stations found
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ReferenceStationModal
          station={selectedStation}
          onClose={handleModalClose}
          onSuccess={() => {
            handleModalClose();
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
