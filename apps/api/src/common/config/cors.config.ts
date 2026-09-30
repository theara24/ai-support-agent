import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export function getCorsOrigins(): string[] {
  const envOrigins = process.env.CORS_ORIGINS;
  if (envOrigins && envOrigins.trim()) {
    return envOrigins
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const origins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
  ];

  if (process.env.FRONTEND_URL && !origins.includes(process.env.FRONTEND_URL.trim())) {
    origins.push(process.env.FRONTEND_URL.trim());
  }

  return origins;
}

export const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Allow non-browser requests or same-origin requests with no origin header
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = getCorsOrigins();
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token', 'Accept'],
};
