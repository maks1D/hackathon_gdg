import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

/**
 * Global logging interceptor.
 * Logs method, URL, status code, and response time for every request.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - startTime;
          this.logger.log(`${method} ${url} — ${responseTime}ms`);
        },
        error: (error: Error) => {
          const responseTime = Date.now() - startTime;
          this.logger.error(
            `${method} ${url} — ${responseTime}ms — ERROR: ${error.message}`,
          );
        },
      }),
    );
  }
}
