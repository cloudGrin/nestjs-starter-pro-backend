import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 业务异常类
 * 用于处理业务逻辑中的异常情况
 */
export class BusinessException extends HttpException {
  constructor(
    message: string,
    errorCode?: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        success: false,
        message,
        errorCode,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }

  /**
   * 创建一个未找到资源的异常
   */
  static notFound(resource: string, id?: string | number): BusinessException {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    return new BusinessException(message, 'RESOURCE_NOT_FOUND', HttpStatus.NOT_FOUND);
  }

  /**
   * 创建一个重复资源的异常
   */
  static duplicate(resource: string, field: string): BusinessException {
    return new BusinessException(
      `${resource} with this ${field} already exists`,
      'DUPLICATE_RESOURCE',
      HttpStatus.CONFLICT,
    );
  }

  /**
   * 创建一个验证失败的异常
   */
  static validationFailed(message: string): BusinessException {
    return new BusinessException(message, 'VALIDATION_FAILED', HttpStatus.BAD_REQUEST);
  }

  /**
   * 创建一个未授权的异常
   */
  static unauthorized(message = 'Unauthorized'): BusinessException {
    return new BusinessException(message, 'UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
  }

  /**
   * 创建一个禁止访问的异常
   */
  static forbidden(message = 'Forbidden'): BusinessException {
    return new BusinessException(message, 'FORBIDDEN', HttpStatus.FORBIDDEN);
  }

  /**
   * 创建一个操作失败的异常
   */
  static operationFailed(operation: string, reason?: string): BusinessException {
    const message = reason ? `Failed to ${operation}: ${reason}` : `Failed to ${operation}`;
    return new BusinessException(message, 'OPERATION_FAILED', HttpStatus.BAD_REQUEST);
  }
}
