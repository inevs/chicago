import { EventEmitter } from 'events';
import { Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestLoggingMiddleware } from './request-logging.middleware';

describe('RequestLoggingMiddleware', () => {
  let middleware: RequestLoggingMiddleware;
  let logSpy: jest.SpyInstance;
  let req: Partial<Request>;
  let res: EventEmitter & { statusCode: number };
  let next: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    middleware = new RequestLoggingMiddleware();
    req = {
      method: 'GET',
      originalUrl: '/api/securities?page=2',
      ip: '192.168.1.10',
      headers: { 'user-agent': 'Mozilla/5.0' },
      get: jest.fn().mockReturnValue('Mozilla/5.0') as unknown as Request['get'],
    };
    res = Object.assign(new EventEmitter(), { statusCode: 200 });
    next = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const run = () =>
    middleware.use(req as Request, res as unknown as Response, next);

  it('passes the request on to the next handler', () => {
    run();

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not log before the response is finished', () => {
    run();

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('logs method, URL, status code and duration once the response is finished', () => {
    run();
    jest.advanceTimersByTime(42);
    res.statusCode = 201;
    res.emit('finish');

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/securities?page=2',
      statusCode: 201,
      durationMs: 42,
    });
  });

  it('logs error responses with their status code', () => {
    run();
    res.statusCode = 500;
    res.emit('finish');

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 })
    );
  });

  it('does not log personal data such as IP address or user agent', () => {
    run();
    res.emit('finish');

    const logged = JSON.stringify(logSpy.mock.calls);
    expect(logged).not.toContain('192.168.1.10');
    expect(logged).not.toContain('Mozilla');
  });
});
