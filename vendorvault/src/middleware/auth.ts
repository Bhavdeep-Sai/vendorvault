import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenString } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  message?: string;
}

export function getAuthUser(request: NextRequest): { userId: string; role: string } | null {
  const token = request.cookies.get('token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return null;
  }

  return verifyTokenString(token);
}

export async function verifyAuthToken(request: NextRequest): Promise<AuthResult> {
  try {
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return {
        success: false,
        message: 'No authentication token provided'
      };
    }

    const decoded = verifyTokenString(token);
    if (!decoded) {
      return {
        success: false,
        message: 'Invalid or expired token'
      };
    }

    // Verify user exists in database
    await connectDB();
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    if (user.status !== 'ACTIVE') {
      return {
        success: false,
        message: 'Account is not active'
      };
    }

    return {
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return {
      success: false,
      message: 'Authentication verification failed'
    };
  }
}

export function requireAuth(handler: (req: NextRequest, userId: string, role: string) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const auth = getAuthUser(req);
    
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return handler(req, auth.userId, auth.role);
  };
}

export function requireRole(allowedRoles: string[]) {
  return (handler: (req: NextRequest, userId: string, role: string) => Promise<NextResponse>) => {
    return async (req: NextRequest) => {
      const auth = getAuthUser(req);
      
      if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (!allowedRoles.includes(auth.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      return handler(req, auth.userId, auth.role);
    };
  };
}

