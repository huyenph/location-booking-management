import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const { method, originalUrl } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          this.logger.log(
            `${method} ${originalUrl} ${response.statusCode} +${ms}ms`,
          );
        },
        error: (err: unknown) => {
          const ms = Date.now() - start;
          const status =
            typeof err === "object" && err !== null && "status" in err
              ? (err as { status: number }).status
              : 500;
          this.logger.error(`${method} ${originalUrl} ${status} +${ms}ms`);
        },
      }),
    );
  }
}
