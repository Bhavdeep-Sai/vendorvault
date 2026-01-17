import { useState, useEffect } from 'react';
import { XMarkIcon } from '@/components/Icons';
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

interface ReferenceStationModalProps {
  station: ReferenceStation | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReferenceStationModal({ station, onClose, onSuccess }: ReferenceStationModalProps) {
  const [formData, setFormData] = useState({
    stationName: '',
    stationCode: '',
    railwayZone: '',
    division: '',
    stationCategory: '',
    platformsCount: '',
    dailyFootfallAvg: '',
    city: '',
    state: '',
    pincode: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (station) {
      setFormData({
        stationName: station.stationName,
        stationCode: station.stationCode,
        railwayZone: station.railwayZone,
        division: station.division || '',
        stationCategory: station.stationCategory,
        platformsCount: station.platformsCount.toString(),
        dailyFootfallAvg: station.dailyFootfallAvg.toString(),
        city: station.city || '',
        state: station.state || '',
        pincode: station.pincode || '',
        address: station.address || '',
      });
    }
  }, [station]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = station 
        ? `/api/railway-admin/reference-stations/${station._id}`
        : '/api/railway-admin/reference-stations';
      
      const method = station ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(station ? 'Station updated successfully' : 'Station created successfully');
        onSuccess();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save station');
      }
    } catch (error) {
      toast.error('Failed to save station');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {station ? 'Edit Reference Station' : 'Add Reference Station'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Station Name *</label>
                <input
                  type="text"
                  required
                  value={formData.stationName}
                  onChange={(e) => setFormData({ ...formData, stationName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Station Code *</label>
                <input
                  type="text"
                  required
                  value={formData.stationCode}
                  onChange={(e) => setFormData({ ...formData, stationCode: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Railway Zone *</label>
                <select
                  required
                  value={formData.railwayZone}
                  onChange={(e) => setFormData({ ...formData, railwayZone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <option value="">Select Zone</option>
                  <option value="Northern Railway">Northern Railway</option>
                  <option value="Southern Railway">Southern Railway</option>
                  <option value="Eastern Railway">Eastern Railway</option>
                  <option value="Western Railway">Western Railway</option>
                  <option value="Central Railway">Central Railway</option>
                  <option value="South Central Railway">South Central Railway</option>
                  <option value="South Eastern Railway">South Eastern Railway</option>
                  <option value="North Eastern Railway">North Eastern Railway</option>
                  <option value="North Western Railway">North Western Railway</option>
                  <option value="South Western Railway">South Western Railway</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Division</label>
                <input
                  type="text"
                  value={formData.division}
                  onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select
                  required
                  value={formData.stationCategory}
                  onChange={(e) => setFormData({ ...formData, stationCategory: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <option value="">Select Category</option>
                  <option value="A1">A1</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platforms Count *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.platformsCount}
                  onChange={(e) => setFormData({ ...formData, platformsCount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Daily Footfall *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.dailyFootfallAvg}
                  onChange={(e) => setFormData({ ...formData, dailyFootfallAvg: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                <input
                  type="text"
                  pattern="[0-9]{6}"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : station ? 'Update Station' : 'Create Station'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
