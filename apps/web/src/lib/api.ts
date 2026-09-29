const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface ApiErrorResponse {
  message: string;
  statusCode?: number;
  requestId?: string;
}

export class ApiError extends Error {
  statusCode?: number;
  requestId?: string;

  constructor(message: string, statusCode?: number, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.requestId = requestId;
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

export interface ApiFetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: ApiFetchOptions = {},
  isRetry = false
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const headers = new Headers(fetchOptions.headers || {});
  
  if (!skipAuth && typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (fetchOptions.body && typeof fetchOptions.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const res = await fetch(url, { ...fetchOptions, headers });
    const requestId = res.headers.get('x-request-id') || undefined;

    // Handle 401 Unauthorized (Attempt refresh token)
    if (res.status === 401 && !skipAuth && !isRetry && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              const newAccessToken = refreshData.data?.accessToken;
              const newRefreshToken = refreshData.data?.refreshToken;

              if (newAccessToken) {
                localStorage.setItem('accessToken', newAccessToken);
                if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
                isRefreshing = false;
                onRefreshed(newAccessToken);
              } else {
                throw new Error('No access token returned');
              }
            } else {
              throw new Error('Refresh failed');
            }
          } catch (err) {
            isRefreshing = false;
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
            throw new ApiError('Session expired. Please log in again.', 401, requestId);
          }
        }

        // Wait for token refresh to complete
        return new Promise<T>((resolve, reject) => {
          addRefreshSubscriber((token: string) => {
            headers.set('Authorization', `Bearer ${token}`);
            apiFetch<T>(endpoint, { ...options, headers }, true)
              .then(resolve)
              .catch(reject);
          });
        });
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new ApiError('Unauthorized. Please log in.', 401, requestId);
      }
    }

    // Handle 429 Too Many Requests
    if (res.status === 429) {
      throw new ApiError(
        'Rate limit exceeded. Please slow down and try again shortly.',
        429,
        requestId
      );
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        data?.error?.message ||
        data?.message ||
        `HTTP error ${res.status}: ${res.statusText}`;
      throw new ApiError(message, res.status, requestId);
    }

    return data;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error?.message || 'Network error while contacting API server.',
      500
    );
  }
}
