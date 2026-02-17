import { type ApiErrorResponseBody } from '@qwery/shared/error';

function getApiBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env) {
    const url = process.env.VITE_API_URL ?? process.env.SERVER_API_URL ?? '';
    if (url) return url;
  }
  return import.meta.env?.VITE_API_URL || '/api';
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: number,
    public params?: unknown,
    public details?: string,
  ) {
    super(`API Error ${code}`);
    this.name = 'ApiError';
  }
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  if (error.name === 'AbortError') {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('enotfound') ||
    message.includes('econnrefused') ||
    error.name === 'TypeError' ||
    error.name === 'NetworkError'
  );
}

function convertToApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return new ApiError(408, 408, undefined, 'Request timeout');
  }

  if (isNetworkError(error)) {
    return new ApiError(
      0,
      0,
      undefined,
      error instanceof Error ? error.message : String(error),
    );
  }

  return new ApiError(
    500,
    500,
    undefined,
    error instanceof Error ? error.message : String(error),
  );
}

async function handleResponse<T>(
  response: Response,
  allowNotFound = false,
): Promise<T | null> {
  if (response.status === 404 && allowNotFound) {
    return null;
  }

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({
      code: 500,
    }))) as Partial<ApiErrorResponseBody>;

    throw new ApiError(
      response.status,
      errorData.code ?? 500,
      errorData.params,
      errorData.details,
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
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
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
    throw convertToApiError(error);
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
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include',
      body: JSON.stringify(data),
      signal: options?.signal || controller?.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const result = await handleResponse<T>(response, false);
    if (result === null) {
      throw new ApiError(response.status, 500);
    }
    return result;
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    throw convertToApiError(error);
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
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include',
      body: JSON.stringify(data),
      signal: options?.signal || controller?.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const result = await handleResponse<T>(response, false);
    if (result === null) {
      throw new ApiError(response.status, 500);
    }
    return result;
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    throw convertToApiError(error);
  }
}

export interface DriverCommandBasePayload {
  datasourceProvider: string;
  driverId: string;
  config: unknown;
}

export interface DriverCommandQueryPayload extends DriverCommandBasePayload {
  sql: string;
}

export type DriverCommandPayload =
  | DriverCommandBasePayload
  | DriverCommandQueryPayload;

interface DriverCommandResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function driverCommand<T>(
  action: 'testConnection' | 'query' | 'metadata',
  payload: DriverCommandPayload,
  options?: ApiRequestOptions,
): Promise<T> {
  const body = { ...payload, action };
  const result = await apiPost<DriverCommandResponse<T>>(
    '/driver/command',
    body,
    options,
  );

  if (!result.success || result.data === undefined) {
    throw new ApiError(500, 500);
  }

  return result.data;
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
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include',
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
    throw convertToApiError(error);
  }
}
