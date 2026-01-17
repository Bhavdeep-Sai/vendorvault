'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';

interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: string;
  dateOfBirth?: string;
  addressLine?: string;
  state?: string;
  pinCode?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  emergencyContact?: string;
  emergencyRelation?: string;
  vendorData?: {
    businessName?: string;
    businessType?: string;
    ownerName?: string;
    gstNumber?: string;
    businessAddress?: string;
    email?: string;
    contactNumber?: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photo?: string;
  role: 'VENDOR' | 'STATION_MANAGER' | 'INSPECTOR' | 'RAILWAY_ADMIN';
  status: 'ACTIVE' | 'PENDING' | 'REJECTED' | 'SUSPENDED';
}

interface Vendor {
  id: string;
  businessName: string;
  businessType: string;
  stationName: string;
  platformNumber?: string;
  stallLocationDescription: string;
}

interface AuthContextType {
  user: User | null;
  vendor: Vendor | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to get dashboard path for role
function getDashboardPath(role: string, status?: string): string {
  if (role === 'RAILWAY_ADMIN') return '/railway-admin/dashboard';
  if (role === 'STATION_MANAGER' && status === 'ACTIVE') return '/station-manager/dashboard';
  if (role === 'INSPECTOR') return '/inspector/dashboard';
  return '/vendor/dashboard';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user from server
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setVendor(data.vendor);
      } else {
        setUser(null);
        setVendor(null);
      }
    } catch {
      setUser(null);
      setVendor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user on mount
  useEffect(() => {
    refreshUser();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'same-origin',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const loggedInUser = data.user;
      
      // Set user state first
      setUser(loggedInUser);
      setVendor(data.vendor);
      
      // For station managers, keep loading state and redirect to dashboard
      // The dashboard will handle showing the appropriate page based on status
      if (loggedInUser?.role === 'STATION_MANAGER') {
        // Don't show toast, don't set loading to false
        // Just redirect - dashboard will handle everything
        setTimeout(() => {
          window.location.href = '/station-manager/dashboard';
        }, 100);
        return;
      }
      
      // For other roles, show success and redirect normally
      toast.success('Login successful!');
      
      const dashboardPath = getDashboardPath(loggedInUser.role, loggedInUser.status);
      setTimeout(() => {
        window.location.href = dashboardPath;
      }, 100);
      
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Network error. Please check your connection and try again.');
      }
      throw error;
    }
  }, []);

  const register = useCallback(async (registerData: RegisterData) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
        credentials: 'same-origin',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      const registeredUser = data.user;
      setUser(registeredUser);
      setLoading(false);
      
      toast.success('Registration successful! Please upload your documents.');
      
      // Redirect vendors to documents page to upload required documents
      setTimeout(() => {
        if (registeredUser.role === 'VENDOR') {
          window.location.href = '/vendor/documents';
        } else {
          const dashboardPath = getDashboardPath(registeredUser.role, registeredUser.status);
          window.location.href = dashboardPath;
        }
      }, 100);
      
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Network error. Please check your connection and try again.');
      }
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'same-origin',
      });
      setUser(null);
      setVendor(null);
      toast.success('Logged out successfully');
      window.location.href = '/';
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error('Logout failed: ' + error.message);
      } else {
        toast.error('Logout failed. Please try again.');
      }
    }
  }, []);

  const contextValue = useMemo(
    () => ({ user, vendor, loading, login, register, logout, refreshUser }),
    [user, vendor, loading, login, register, logout, refreshUser]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


