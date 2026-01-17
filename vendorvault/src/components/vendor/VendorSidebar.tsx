'use client';

import React, { useState } from 'react';
import { 
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  ChatBubbleBottomCenterTextIcon,
  UserIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  className?: string;
}

const VendorSidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/vendor/dashboard',
      icon: HomeIcon,
      description: 'Overview and analytics'
    },
    {
      name: 'Profile',
      href: '/vendor/profile',
      icon: UserIcon,
      description: 'Manage your information'
    },
    {
      name: 'Applications',
      href: '/vendor/applications',
      icon: ClipboardDocumentListIcon,
      description: 'View all applications'
    },
    {
      name: 'Apply for Shop',
      href: '/vendor/apply',
      icon: PlusIcon,
      description: 'Submit new application'
    },
    {
      name: 'Documents',
      href: '/vendor/documents',
      icon: DocumentTextIcon,
      description: 'Manage documents'
    },
  ];

  const isActive = (href: string) => {
    return pathname === href || (href !== '/vendor/dashboard' && pathname.startsWith(href));
  };

  const handleLogout = async () => {
    await logout();
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          onClick={() => setIsMobileOpen(true)}
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile sidebar */}
      <div className={`lg:hidden ${isMobileOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
            <div className="absolute right-0 top-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setIsMobileOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            <SidebarContent navigation={navigation} isActive={isActive} onLogout={handleLogout} />
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col ${className}`}>
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
          <SidebarContent navigation={navigation} isActive={isActive} onLogout={handleLogout} />
        </div>
      </div>
    </>
  );
};

interface SidebarContentProps {
  navigation: Array<{
    name: string;
    href: string;
    icon: React.ElementType;
    description: string;
  }>;
  isActive: (href: string) => boolean;
  onLogout: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({ navigation, isActive, onLogout }) => {
  const { user, vendor } = useAuth();

  return (
    <>
      {/* Logo/Brand */}
      <div className="flex h-16 shrink-0 items-center">
        <h1 className="text-2xl font-bold text-blue-600">VendorVault</h1>
      </div>

      {/* User info */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {user?.photo ? (
              <img
                src={user.photo}
                alt={user.name || 'User'}
                className="h-10 w-10 rounded-full object-cover border-2 border-blue-600"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || 'V'}
                </span>
              </div>
            )}
          </div>
          <div className="ml-3 min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || 'Vendor'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {vendor?.businessName || 'Business Name'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`
                      group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold transition-all duration-200
                      ${isActive(item.href)
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                      }
                    `}
                  >
                    <item.icon
                      className={`h-5 w-5 shrink-0 ${
                        isActive(item.href) ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'
                      }`}
                    />
                    <div className="flex flex-col">
                      <span>{item.name}</span>
                      <span className={`text-xs ${
                        isActive(item.href) ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        {item.description}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
          
          {/* Logout */}
          <li className="mt-auto">
            <button
              onClick={onLogout}
              className="group -mx-2 flex w-full gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-red-600" />
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
};

export default VendorSidebar;

