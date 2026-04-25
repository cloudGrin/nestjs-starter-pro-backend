import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '~/shared/logger/logger.service';
import { SanitizeUtil } from '~/common/utils/sanitize.util';

export interface ErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
  stack?: string;
}

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let logMessage = 'Internal server error';
    let error: string | undefined;
    let stack: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        // ValidationPipe返回的message可能是数组
        if (Array.isArray(responseObj.message)) {
          message = responseObj.message.join(', ');
        } else {
          message = responseObj.message || exception.message;
        }
        error = responseObj.error;
      } else {
        message = exception.message;
      }
      logMessage = message;
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      logMessage = exception.message || 'Internal server error';
      message = process.env.NODE_ENV === 'development' ? logMessage : 'Internal server error';
      error = 'Internal Server Error';
      stack = exception.stack;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      logMessage = 'Unknown error occurred';
      message = process.env.NODE_ENV === 'development' ? logMessage : 'Internal server error';
      error = 'Unknown Error';
    }

    const errorResponse: ErrorResponse = {
      success: false,
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      requestId: (request as any).id,
    };

    // 开发环境下返回堆栈信息
    if (process.env.NODE_ENV === 'development' && stack) {
      errorResponse.stack = stack;
    }

    // 记录错误日志
    this.logger.error(`${request.method} ${request.url} - ${status} - ${logMessage}`, stack);

    // 记录请求详情（仅在调试模式，脱敏后记录）
    if (process.env.NODE_ENV === 'development') {
      const sanitizedBody = SanitizeUtil.sanitizeRequestBody(request.body);
      const sanitizedQuery = SanitizeUtil.sanitizeQuery(request.query);
      const sanitizedParams = SanitizeUtil.sanitize(request.params);

      this.logger.debug(`Request Body: ${JSON.stringify(sanitizedBody)}`);
      this.logger.debug(`Request Query: ${JSON.stringify(sanitizedQuery)}`);
      this.logger.debug(`Request Params: ${JSON.stringify(sanitizedParams)}`);
    }

    response.status(status).json(errorResponse);
  }
}
