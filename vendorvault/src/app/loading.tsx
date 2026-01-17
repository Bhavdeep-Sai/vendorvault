import { LoadingSkeleton } from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSkeleton />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
