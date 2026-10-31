import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";

export type ApiSuccess<T> = { success: true; data: T; message: string };

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiSuccess<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccess<T>> {
    return next.handle().pipe(map((data) => ({ success: true, data, message: "Operation completed successfully" })));
  }
}
