import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, XMarkIcon, EyeIcon } from '@/components/Icons';
import toast from 'react-hot-toast';

interface Station {
  _id: string;
  stationName: string;
  stationCode: string;
  railwayZone: string;
  stationCategory: string;
  platformsCount: number;
  dailyFootfallAvg: number;
  approvalStatus: string;
  operationalStatus: string;
  stationManagerId?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

interface StationsManagementProps {
  stations: Station[];
  onRefresh: () => void;
}

export function StationsManagement({ stations, onRefresh }: StationsManagementProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleApproveStation = async (stationId: string, status: 'APPROVED' | 'REJECTED') => {
    setLoading(true);
    try {
      const res = await fetch('/api/railway-admin/stations/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId, approvalStatus: status }),
      });

      if (res.ok) {
        toast.success(`Station application ${status.toLowerCase()}`);
        onRefresh();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update station');
      }
    } catch (error) {
      toast.error('Failed to update station');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Station Applications</h2>
      </div>

      {/* Stations Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Station</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Zone</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Manager</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stations.map((station) => (
                <tr key={station._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{station.stationName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{station.stationCode}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{station.railwayZone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{station.stationCategory}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{station.stationManagerId?.name || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{station.stationManagerId?.email || ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      station.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      station.approvalStatus === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {station.approvalStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => router.push(`/railway-admin/station-application/${station._id}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                        title="View Details"
                      >
                        <EyeIcon size={20} />
                      </button>
                      {station.approvalStatus === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApproveStation(station._id, 'APPROVED')}
                            disabled={loading}
                            className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                            title="Approve Station"
                          >
                            <CheckIcon size={20} />
                          </button>
                          <button
                            onClick={() => handleApproveStation(station._id, 'REJECTED')}
                            disabled={loading}
                            className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                            title="Reject Station"
                          >
                            <XMarkIcon size={20} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stations.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No station applications found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
