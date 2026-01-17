// Pagination utility functions

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function getPaginationParams(searchParams: URLSearchParams, defaultLimit = 10, maxLimit = 100): { skip: number; limit: number; page: number } {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(maxLimit, Math.max(1, parseInt(searchParams.get('limit') || String(defaultLimit), 10)));
  const skip = (page - 1) * limit;

  return { skip, limit, page };
}

export function createPaginationResult<T>(data: T[], totalItems: number, page: number, limit: number): PaginationResult<T> {
  const totalPages = Math.ceil(totalItems / limit);
  
  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
