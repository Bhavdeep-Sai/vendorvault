'use client';

import { useAuth } from '@/context/AuthContext';
import { NotificationBell } from '@/components/NotificationBell';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftOnRectangleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

interface DashboardNavProps {
  title: string;
}

export function DashboardNav({ title }: DashboardNavProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'VENDOR':
        return 'bg-blue-100 text-blue-800';
      case 'STATION_MANAGER':
        return 'bg-green-100 text-green-800';
      case 'RAILWAY_ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'INSPECTOR':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplay = (role?: string) => {
    switch (role) {
      case 'VENDOR':
        return 'Vendor';
      case 'STATION_MANAGER':
        return 'Station Manager';
      case 'RAILWAY_ADMIN':
        return 'Railway Admin';
      case 'INSPECTOR':
        return 'Inspector';
      default:
        return role;
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Title */}
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {title}
            </h1>
          </div>

          {/* Right: User info, notifications, logout */}
          <div className="flex items-center gap-4">
            {/* User Badge */}
            {user && (
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <UserCircleIcon className="w-6 h-6 text-gray-600" />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      {user.email}
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                  {getRoleDisplay(user.role)}
                </span>
              </div>
            )}

            {/* Notification Bell */}
            <NotificationBell />

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Logout"
            >
              <ArrowLeftOnRectangleIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

