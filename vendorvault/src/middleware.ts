import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple JWT decoder for Edge Runtime (no verification, just decoding)
function decodeJWT(token: string): { userId: string; role: string } | null {
  try {
    // JWT is in format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('Invalid JWT format: expected 3 parts');
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    if (!payload) {
      console.warn('Invalid JWT: missing payload');
      return null;
    }

    // Handle base64url encoding (replace - with + and _ with /)
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');

    // Decode and parse
    const decoded = JSON.parse(Buffer.from(base64, 'base64').toString());

    // Validate required fields
    if (!decoded.userId || !decoded.role) {
      console.warn('Invalid JWT: missing userId or role');
      return null;
    }

    // Check if token is expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      console.warn('JWT token has expired');
      return null;
    }

    return { userId: decoded.userId, role: decoded.role };
  } catch (error) {
    console.error('JWT decode error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/register',
    '/auth/station-manager-application',
    '/verify',
  ];

  // Check if the current path is a public route or starts with public path
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route ||
    pathname.startsWith('/verify/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/verify/') ||
    pathname.startsWith('/api/stations') ||
    pathname.startsWith('/api/upload/public') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.')
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Get token from cookies or Authorization header
  const token = request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Verify token (using simple decode for Edge Runtime)
  const decoded = decodeJWT(token);

  if (!decoded) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Role-based routing protection
  const { role } = decoded;

  // Redirect to appropriate dashboard if accessing wrong role page
  if (pathname.startsWith('/vendor') && role !== 'VENDOR') {
    return NextResponse.redirect(new URL(getRoleHomePage(role), request.url));
  }

  if (pathname.startsWith('/station-manager') && role !== 'STATION_MANAGER') {
    return NextResponse.redirect(new URL(getRoleHomePage(role), request.url));
  }

  if (pathname.startsWith('/inspector') && !['INSPECTOR', 'RAILWAY_ADMIN'].includes(role)) {
    return NextResponse.redirect(new URL(getRoleHomePage(role), request.url));
  }

  if (pathname.startsWith('/railway-admin') && role !== 'RAILWAY_ADMIN') {
    return NextResponse.redirect(new URL(getRoleHomePage(role), request.url));
  }

  return NextResponse.next();
}

function getRoleHomePage(role: string): string {
  const dashboardMap: { [key: string]: string } = {
    VENDOR: '/vendor/dashboard',
    STATION_MANAGER: '/station-manager/dashboard',
    INSPECTOR: '/inspector/dashboard',
    RAILWAY_ADMIN: '/railway-admin/dashboard',
  };

  return dashboardMap[role] || '/auth/login';
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};