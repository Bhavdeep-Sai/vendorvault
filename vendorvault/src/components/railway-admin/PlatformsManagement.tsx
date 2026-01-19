import { TrainIcon } from '@/components/Icons';

interface Platform {
  _id: string;
  platformNumber: number;
  platformType?: string;
  dimensions: {
    length: number;
    width: number;
  };
  stationId: {
    stationName: string;
    stationCode: string;
  };
}

interface PlatformsManagementProps {
  platforms: Platform[];
}

export function PlatformsManagement({ platforms }: PlatformsManagementProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Platform Management</h2>
      </div>

      {/* Platforms Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Platform Number</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Station</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Length (m)</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Width (m)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {platforms.map((platform) => (
                <tr key={platform._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    Platform {platform.platformNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{platform.stationId?.stationName || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{platform.stationId?.stationCode || ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{platform.platformType || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{platform.dimensions?.length || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{platform.dimensions?.width || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {platforms.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No platforms found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
