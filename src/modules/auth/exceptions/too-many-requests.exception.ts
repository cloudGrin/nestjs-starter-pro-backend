import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 请求过多异常（HTTP 429）
 */
export class TooManyRequestsException extends HttpException {
  constructor(message?: string) {
    super(message || 'Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
  }
}
