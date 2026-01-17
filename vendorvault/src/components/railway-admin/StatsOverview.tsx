import { UsersIcon, UserIcon, ClockIcon, TrainIcon, MapPinIcon, DocumentIcon } from '@/components/Icons';

interface AdminStats {
  totalUsers: number;
  totalStationManagers: number;
  pendingStationManagers: number;
  approvedStationManagers: number;
  totalVendors: number;
  totalInspectors: number;
  totalStations: number;
  pendingStations: number;
  totalReferenceStations: number;
  totalPlatforms: number;
  pendingDocuments: number;
}

interface StatsOverviewProps {
  stats: AdminStats;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <UsersIcon className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        {/* Station Managers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Station Managers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStationManagers}</p>
              <p className="text-xs text-green-600 mt-1">{stats.approvedStationManagers} approved</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <UserIcon className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        {/* Pending Applications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Applications</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.pendingStationManagers}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <ClockIcon className="text-orange-600" size={24} />
            </div>
          </div>
        </div>

        {/* Vendors */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vendors</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalVendors}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <UsersIcon className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        {/* Stations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Station Applications</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStations}</p>
              <p className="text-xs text-orange-600 mt-1">{stats.pendingStations} pending</p>
            </div>
            <div className="bg-cyan-100 p-3 rounded-lg">
              <TrainIcon className="text-cyan-600" size={24} />
            </div>
          </div>
        </div>

        {/* Reference Stations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Reference Stations</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalReferenceStations}</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-lg">
              <MapPinIcon className="text-indigo-600" size={24} />
            </div>
          </div>
        </div>

        {/* Platforms */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Platforms</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalPlatforms}</p>
            </div>
            <div className="bg-teal-100 p-3 rounded-lg">
              <TrainIcon className="text-teal-600" size={24} />
            </div>
          </div>
        </div>

        {/* Pending Documents */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Documents</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.pendingDocuments}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <DocumentIcon className="text-red-600" size={24} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
