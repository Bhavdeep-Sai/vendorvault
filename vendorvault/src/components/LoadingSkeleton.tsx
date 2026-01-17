'use client';

interface LoadingSkeletonProps {
  count?: number;
  className?: string;
}

export function LoadingSkeleton({ count = 1, className = '' }: LoadingSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-muted rounded ${className}`}
          role="status"
          aria-label="Loading..."
        >
          <span className="sr-only">Loading...</span>
        </div>
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6 animate-pulse">
      <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
      <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-muted rounded w-2/3"></div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 animate-pulse">
          <div className="h-12 bg-muted rounded flex-1"></div>
        </div>
      ))}
    </div>
  );
}

