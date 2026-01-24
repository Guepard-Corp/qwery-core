const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(
  response: Response,
  allowNotFound = false,
): Promise<T | null> {
  if (response.status === 404 && allowNotFound) {
    return null;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: response.statusText || 'Unknown error',
    }));
    
    throw new ApiError(
      errorData.error || errorData.message || 'Request failed',
      response.status,
      errorData.code,
      errorData.data,
    );
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T;
  }

  return response.json();
}

export interface ApiGetOptions {
  allowNotFound?: boolean;
  signal?: AbortSignal;
  timeout?: number;
}

export interface ApiRequestOptions {
  signal?: AbortSignal;
  timeout?: number;
  headers?: Record<string, string>;
}

export async function apiGet<T>(
  endpoint: string,
  allowNotFound = false,
  options?: ApiGetOptions,
): Promise<T | null> {
  const controller = options?.signal ? undefined : new AbortController();
  const timeoutId =
    options?.timeout && controller
      ? setTimeout(() => controller.abort(), options.timeout)
      : undefined;

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: options?.signal || controller?.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return handleResponse<T>(
      response,
      allowNotFound || options?.allowNotFound || false,
    );
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    throw error;
  }
}

export async function apiPost<T>(
  endpoint: string,
  data: unknown,
  options?: ApiRequestOptions,
): Promise<T> {
  const controller = options?.signal ? undefined : new AbortController();
  const timeoutId =
    options?.timeout && controller
      ? setTimeout(() => controller.abort(), options.timeout)
      : undefined;

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(data),
      signal: options?.signal || controller?.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const result = await handleResponse<T>(response, false);
    if (result === null) {
      throw new ApiError('Unexpected null response', response.status);
    }
    return result;
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    throw error;
  }
}

export async function apiPut<T>(
  endpoint: string,
  data: unknown,
  options?: ApiRequestOptions,
): Promise<T> {
  const controller = options?.signal ? undefined : new AbortController();
  const timeoutId =
    options?.timeout && controller
      ? setTimeout(() => controller.abort(), options.timeout)
      : undefined;

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(data),
      signal: options?.signal || controller?.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const result = await handleResponse<T>(response, false);
    if (result === null) {
      throw new ApiError('Unexpected null response', response.status);
    }
    return result;
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    throw error;
  }
}

export async function apiDelete(
  endpoint: string,
  options?: ApiRequestOptions,
): Promise<boolean> {
  const controller = options?.signal ? undefined : new AbortController();
  const timeoutId =
    options?.timeout && controller
      ? setTimeout(() => controller.abort(), options.timeout)
      : undefined;

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      signal: options?.signal || controller?.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      await handleResponse<never>(response, false);
    }

    return true;
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    throw error;
  }
}
