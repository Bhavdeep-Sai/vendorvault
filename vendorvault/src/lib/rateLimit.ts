/**
 * Simple in-memory rate limiter for Vercel serverless functions
 * Uses a Map to track request counts per IP address
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

class RateLimiter {
    private requests: Map<string, RateLimitEntry> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Clean up expired entries every 5 minutes
        if (typeof setInterval !== 'undefined') {
            this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
        }
    }

    /**
     * Check if a request should be rate limited
     * @param identifier - Unique identifier (e.g., IP address, user ID)
     * @param maxRequests - Maximum number of requests allowed
     * @param windowMs - Time window in milliseconds
     * @returns true if rate limit exceeded, false otherwise
     */
    isRateLimited(identifier: string, maxRequests: number, windowMs: number): boolean {
        const now = Date.now();
        const entry = this.requests.get(identifier);

        // No previous requests or window has expired
        if (!entry || now > entry.resetTime) {
            this.requests.set(identifier, {
                count: 1,
                resetTime: now + windowMs,
            });
            return false;
        }

        // Increment count
        entry.count++;

        // Check if limit exceeded
        if (entry.count > maxRequests) {
            return true;
        }

        return false;
    }

    /**
     * Get remaining requests for an identifier
     */
    getRemaining(identifier: string, maxRequests: number): number {
        const entry = this.requests.get(identifier);
        if (!entry) return maxRequests;
        return Math.max(0, maxRequests - entry.count);
    }

    /**
     * Get reset time for an identifier
     */
    getResetTime(identifier: string): number | null {
        const entry = this.requests.get(identifier);
        return entry ? entry.resetTime : null;
    }

    /**
     * Clean up expired entries
     */
    private cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.requests.entries()) {
            if (now > entry.resetTime) {
                this.requests.delete(key);
            }
        }
    }

    /**
     * Clear all rate limit data (useful for testing)
     */
    clear() {
        this.requests.clear();
    }

    /**
     * Cleanup interval on shutdown
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}

// Global instance for serverless environment
const globalRateLimiter = new RateLimiter();

export default globalRateLimiter;

/**
 * Helper function to get client IP from request
 */
export function getClientIp(request: Request): string {
    // Try various headers that might contain the real IP
    const headers = request.headers;

    return (
        headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        headers.get('x-real-ip') ||
        headers.get('cf-connecting-ip') || // Cloudflare
        headers.get('x-vercel-forwarded-for') || // Vercel
        'unknown'
    );
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
    // Authentication endpoints
    LOGIN: { max: 5, window: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
    REGISTER: { max: 3, window: 60 * 60 * 1000 }, // 3 attempts per hour
    FORGOT_PASSWORD: { max: 3, window: 60 * 60 * 1000 }, // 3 attempts per hour

    // File upload endpoints
    UPLOAD: { max: 10, window: 60 * 60 * 1000 }, // 10 uploads per hour

    // API endpoints
    API_DEFAULT: { max: 100, window: 60 * 1000 }, // 100 requests per minute
    API_STRICT: { max: 30, window: 60 * 1000 }, // 30 requests per minute
} as const;
