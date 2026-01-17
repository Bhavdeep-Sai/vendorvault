'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode;
  allowedRoles?: ('VENDOR' | 'STATION_MANAGER' | 'INSPECTOR' | 'RAILWAY_ADMIN')[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // No user, redirect to login
        router.replace('/auth/login');
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        // User doesn't have required role, redirect to their dashboard
        const dashboardMap: Record<string, string> = {
          'RAILWAY_ADMIN': '/railway-admin/dashboard',
          'STATION_MANAGER': '/station-manager/dashboard',
          'INSPECTOR': '/inspector/dashboard',
          'VENDOR': '/vendor/dashboard',
        };
        router.replace(dashboardMap[user.role] || '/');
      }
    }
  }, [user, loading, allowedRoles, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if no user or wrong role
  if (!user || (allowedRoles && !allowedRoles.includes(user.role))) {
    return null;
  }

  // Render children if authorized
  return <>{children}</>;
}

export default ProtectedRoute;
