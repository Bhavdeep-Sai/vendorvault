'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function AuthRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // User is authenticated, redirect to appropriate dashboard
      if (user.role === 'RAILWAY_ADMIN') {
        router.replace('/railway-admin/dashboard');
      } else if (user.role === 'STATION_MANAGER') {
        router.replace('/station-manager/dashboard');
      } else if (user.role === 'INSPECTOR') {
        router.replace('/inspector/dashboard');
      } else {
        router.replace('/vendor/dashboard');
      }
    }
  }, [user, loading, router]);

  return null; // This component doesn't render anything
}

