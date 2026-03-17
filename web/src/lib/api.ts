import type { Church, ChurchListItem, NearbySearchParams } from './types';

const API_BASE_URL = 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  status?: number;
  data?: any;
  
  constructor(
    message: string,
    status?: number,
    data?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      undefined,
      error
    );
  }
}

interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
}

export async function getAllChurches(): Promise<ChurchListItem[]> {
  const response = await fetchApi<ApiResponse<ChurchListItem[]>>('/churches-simple');
  return response.data;
}

export async function getNearbyChurches(params: NearbySearchParams): Promise<ChurchListItem[]> {
  const { lat, lng, radius = 5000 } = params;
  const response = await fetchApi<ApiResponse<ChurchListItem[]>>(
    `/churches-simple/nearby?lat=${lat}&lng=${lng}&radius=${radius}`
  );
  return response.data;
}

export async function getChurchById(id: string): Promise<Church> {
  const response = await fetchApi<ApiResponse<Church>>(`/churches-simple/${id}`);
  return response.data;
}
