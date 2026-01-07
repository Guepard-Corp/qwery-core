const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function handleResponse<T>(
  response: Response,
  allowNotFound = false,
): Promise<T | null> {
  if (response.status === 404 && allowNotFound) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: response.statusText || 'Unknown error',
    }));
    throw new Error(error.error || error.message || 'Request failed');
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

export async function apiGet<T>(
  endpoint: string,
  allowNotFound = false,
  options?: ApiGetOptions,
): Promise<T | null> {
  const controller = options?.signal
    ? undefined
    : new AbortController();
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

    return handleResponse<T>(response, allowNotFound || options?.allowNotFound || false);
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    throw error;
  }
}

export async function apiPost<T>(endpoint: string, data: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await handleResponse<T>(response, false);
  if (result === null) {
    throw new Error('Unexpected null response');
  }
  return result;
}

export async function apiPut<T>(endpoint: string, data: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await handleResponse<T>(response, false);
  if (result === null) {
    throw new Error('Unexpected null response');
  }
  return result;
}

export async function apiDelete(endpoint: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: response.statusText || 'Unknown error',
    }));
    throw new Error(error.error || error.message || 'Delete failed');
  }

  return true;
}
