import { GlobalExceptionFilter } from './global-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/api/test',
      method: 'GET',
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };
  });

  it('should handle HttpException', () => {
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Not found',
        error: 'HttpException',
        correlationId: expect.any(String),
        timestamp: expect.any(String),
        path: '/api/test',
      })
    );
  });

  it('should handle HttpException with object response', () => {
    const exception = new HttpException(
      { message: 'Validation failed', error: 'Bad Request' },
      HttpStatus.BAD_REQUEST
    );

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
      })
    );
  });

  it('should handle HttpException with array message', () => {
    const exception = new HttpException(
      { message: ['error1', 'error2'], error: 'Bad Request' },
      HttpStatus.BAD_REQUEST
    );

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['error1', 'error2'],
        error: 'Bad Request',
      })
    );
  });

  it('should handle generic Error in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const exception = new Error('Database connection failed: password123');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Database connection failed: password123',
        error: 'Error',
        correlationId: expect.any(String),
      })
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('should sanitize generic Error messages in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const exception = new Error('Database connection failed: password123');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
        correlationId: expect.any(String),
      })
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('should handle unknown exception', () => {
    const exception = 'Unknown error';

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      })
    );
  });

  it('should include user ID in log context when available', () => {
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    mockRequest = {
      ...mockRequest,
      user: { id: 'user-123' },
    } as Request & { user: { id: string } };

    mockArgumentsHost.switchToHttp = jest.fn().mockReturnValue({
      getResponse: () => mockResponse,
      getRequest: () => mockRequest,
    });

    const loggerSpy = jest.spyOn(filter['logger'], 'warn');

    filter.catch(exception, mockArgumentsHost);

    expect(loggerSpy).toHaveBeenCalled();
    const logCall = loggerSpy.mock.calls[0];
    const contextJson = JSON.parse(logCall[1]);
    expect(contextJson.userId).toBe('user-123');
  });

  it('should log server errors as errors', () => {
    const exception = new HttpException(
      'Internal error',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
    const loggerSpy = jest.spyOn(filter['logger'], 'error');

    filter.catch(exception, mockArgumentsHost);

    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should log client errors as warnings', () => {
    const exception = new HttpException('Bad request', HttpStatus.BAD_REQUEST);
    const loggerSpy = jest.spyOn(filter['logger'], 'warn');

    filter.catch(exception, mockArgumentsHost);

    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should generate unique correlation IDs', () => {
    const exception1 = new HttpException('Error 1', HttpStatus.BAD_REQUEST);
    const exception2 = new HttpException('Error 2', HttpStatus.BAD_REQUEST);

    filter.catch(exception1, mockArgumentsHost);
    const call1 = (mockResponse.json as jest.Mock).mock.calls[0][0];

    filter.catch(exception2, mockArgumentsHost);
    const call2 = (mockResponse.json as jest.Mock).mock.calls[1][0];

    expect(call1.correlationId).not.toBe(call2.correlationId);
  });
});
