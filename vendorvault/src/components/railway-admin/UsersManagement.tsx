import { useState } from 'react';
import { CheckIcon, XMarkIcon } from '@/components/Icons';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  verificationStatus?: string;
  railwayEmployeeId?: string;
  documents?: {
    aadhaarCard?: string;
    panCard?: string;
    railwayIdCard?: string;
    photograph?: string;
    educationalCertificate?: string;
    experienceLetter?: string;
  };
  createdAt: string;
}

interface UsersManagementProps {
  users: User[];
  onRefresh: () => void;
  onViewDocuments: (user: User) => void;
}

export function UsersManagement({ users, onRefresh, onViewDocuments }: UsersManagementProps) {
  const [loading, setLoading] = useState(false);

  const handleVerifyUser = async (userId: string, status: 'VERIFIED' | 'REJECTED') => {
    setLoading(true);
    try {
      const res = await fetch('/api/railway-admin/users/verify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, verificationStatus: status }),
      });

      if (res.ok) {
        toast.success(`User ${status.toLowerCase()} successfully`);
        onRefresh();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update user status');
      }
    } catch (error) {
      toast.error('Failed to update user status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Verification</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Documents</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.railwayEmployeeId || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'RAILWAY_ADMIN' ? 'bg-red-100 text-red-700' :
                      user.role === 'STATION_MANAGER' ? 'bg-blue-100 text-blue-700' :
                      user.role === 'VENDOR' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      user.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      user.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                      user.verificationStatus === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                      user.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {user.verificationStatus || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.documents ? (
                      <button
                        onClick={() => onViewDocuments(user)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View ({Object.keys(user.documents).filter(k => user.documents![k]).length})
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">No documents</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {user.status === 'PENDING' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleVerifyUser(user._id, 'VERIFIED')}
                          disabled={loading}
                          className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                          title="Approve User"
                        >
                          <CheckIcon size={20} />
                        </button>
                        <button
                          onClick={() => handleVerifyUser(user._id, 'REJECTED')}
                          disabled={loading}
                          className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                          title="Reject User"
                        >
                          <XMarkIcon size={20} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No users found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
