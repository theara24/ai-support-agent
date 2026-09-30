function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    const isLocal =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      // If deployed on Vercel or public domain, only use NEXT_PUBLIC_API_URL if it's a valid remote HTTPS URL
      if (envUrl && envUrl.startsWith('https://') && !envUrl.includes('localhost')) {
        return envUrl;
      }
      // Otherwise, use same-origin relative URLs (/api/...)
      return '';
    }
  }
  return envUrl || '';
}

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
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

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

    // Handle 401 Unauthorized
    if (res.status === 401 && !skipAuth && !isRetry && typeof window !== 'undefined') {
      const isAuthRoute = endpoint.includes('/auth/');
      const isOnLoginPage = window.location.pathname === '/login';

      if (isAuthRoute || isOnLoginPage) {
        const errorData = await res.json().catch(() => null);
        throw new ApiError(errorData?.error?.message || 'Invalid credentials', 401, requestId);
      }

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
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
            refreshSubscribers = [];
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
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
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
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
