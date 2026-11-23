import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/**
 * Logs every HTTP request once its response has been sent: method, URL,
 * status code and duration. Personal data (IP address, user agent) is
 * deliberately not logged.
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const startTime = Date.now();

    res.on('finish', () => {
      this.logger.log({
        method,
        url: originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startTime,
      });
    });

    next();
  }
}
