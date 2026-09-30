import { getCorsOrigins, corsOptions } from './cors.config';

describe('CORS Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getCorsOrigins', () => {
    it('should return default origins when CORS_ORIGINS is not set', () => {
      delete process.env.CORS_ORIGINS;
      delete process.env.FRONTEND_URL;

      const origins = getCorsOrigins();
      expect(origins).toContain('http://localhost:3000');
      expect(origins).toContain('http://localhost:3001');
      expect(origins).toContain('http://localhost:3002');
      expect(origins).toContain('http://127.0.0.1:3000');
    });

    it('should parse comma-separated origins from CORS_ORIGINS', () => {
      process.env.CORS_ORIGINS = 'https://app.example.com, https://admin.example.com';

      const origins = getCorsOrigins();
      expect(origins).toEqual(['https://app.example.com', 'https://admin.example.com']);
    });

    it('should include FRONTEND_URL if provided and not already present', () => {
      delete process.env.CORS_ORIGINS;
      process.env.FRONTEND_URL = 'https://myfrontend.com';

      const origins = getCorsOrigins();
      expect(origins).toContain('https://myfrontend.com');
    });
  });

  describe('corsOptions', () => {
    it('should allow requests with no origin header (mobile apps, server-to-server)', (done) => {
      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin(undefined, (err, allow) => {
          expect(err).toBeNull();
          expect(allow).toBe(true);
          done();
        });
      } else {
        done.fail('corsOptions.origin is not a function');
      }
    });

    it('should allow requests from allow-listed origins', (done) => {
      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin('http://localhost:3002', (err, allow) => {
          expect(err).toBeNull();
          expect(allow).toBe(true);
          done();
        });
      } else {
        done.fail('corsOptions.origin is not a function');
      }
    });

    it('should reject requests from unauthorized origins', (done) => {
      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin('http://malicious-site.com', (err, allow) => {
          expect(err).toBeNull();
          expect(allow).toBe(false);
          done();
        });
      } else {
        done.fail('corsOptions.origin is not a function');
      }
    });
  });
});
