import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

/**
 * Higher-order function to wrap API routes with common functionality
 */
export function withApiHandler(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>,
  options: {
    methods?: string[];
    requireAuth?: boolean;
    requireRoles?: string[];
  } = {}
) {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      // Method validation
      if (options.methods && !options.methods.includes(req.method || '')) {
        return NextResponse.json(
          { error: `Method ${req.method} not allowed` },
          { status: 405 }
        );
      }

      // Ensure database connection
      await connectDB();

      // Content-Type validation for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
        const contentType = req.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return NextResponse.json(
            { error: 'Content-Type must be application/json' },
            { status: 400 }
          );
        }
      }

      // Execute the handler
      return await handler(req, ...args);
    } catch (error: unknown) {
      console.error('API handler error:', error);
      
      // Handle specific error types
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Internal server error',
          ...(process.env.NODE_ENV === 'development' && { 
            stack: error instanceof Error ? error.stack : undefined 
          })
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Validates required fields in request body
 */
export function validateRequiredFields(data: any, requiredFields: string[]): string | null {
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  });

  if (missingFields.length > 0) {
    return `Missing required fields: ${missingFields.join(', ')}`;
  }

  return null;
}

/**
 * Sanitizes and validates email addresses
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates Indian phone numbers
 */
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
}

/**
 * Creates a standardized API response
 */
export function createApiResponse(
  data?: any,
  message?: string,
  success: boolean = true
): NextResponse {
  return NextResponse.json({
    success,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: string,
  status: number = 400,
  details?: any
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error,
      details,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Pagination helper for MongoDB queries
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export function getPaginationParams(searchParams: URLSearchParams): PaginationOptions {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
  const sortField = searchParams.get('sortField') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

  return { page, limit, sortField, sortOrder };
}

/**
 * Rate limiting helper (simple in-memory implementation)
 * For production, consider using Redis or external rate limiting service
 */
const rateLimitMap = new Map<string, { count: number; lastRequest: number }>();

export function rateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit) {
    rateLimitMap.set(identifier, { count: 1, lastRequest: now });
    return true;
  }

  // Reset if window has passed
  if (now - userLimit.lastRequest > windowMs) {
    rateLimitMap.set(identifier, { count: 1, lastRequest: now });
    return true;
  }

  // Increment count
  userLimit.count++;
  userLimit.lastRequest = now;

  return userLimit.count <= maxRequests;
}

/**
 * Cleanup rate limit map periodically
 */
setInterval(() => {
  const now = Date.now();
  const windowMs = 60000; // 1 minute

  for (const [key, value] of rateLimitMap.entries()) {
    if (now - value.lastRequest > windowMs) {
      rateLimitMap.delete(key);
    }
  }
}, 300000); // Clean up every 5 minutes