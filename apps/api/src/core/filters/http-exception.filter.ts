import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import type { ApiResponse, ApiError } from '@libs/shared';

/**
 * Global HTTP exception filter.
 * Catches all exceptions and returns a standardized ApiResponse envelope.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errors: ApiError[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errors = [{ code: `HTTP_${status}`, message: exceptionResponse }];
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        const messages = Array.isArray(resp['message'])
          ? resp['message']
          : [resp['message'] || 'Unknown error'];
        errors = messages.map((msg: string) => ({
          code: `HTTP_${status}`,
          message: msg,
        }));
      }
    } else if (exception instanceof Error) {
      errors = [{ code: 'INTERNAL_ERROR', message: exception.message }];
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      errors = [{ code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred' }];
      this.logger.error('Unknown exception type', JSON.stringify(exception));
    }

    const body: ApiResponse<null> = {
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
      },
      errors,
    };

    response.status(status).json(body);
  }
}
