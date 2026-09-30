import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const rawId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
    const correlationId =
      typeof rawId === 'string' && rawId.trim()
        ? rawId.trim()
        : crypto.randomUUID();

    req.headers['x-request-id'] = correlationId;
    req.headers['x-correlation-id'] = correlationId;
    (req as any).requestId = correlationId;
    (req as any).correlationId = correlationId;

    res.setHeader('x-request-id', correlationId);
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}
