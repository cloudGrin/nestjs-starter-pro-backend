import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    if (errors.length > 0) {
      const errorMessages = this.formatErrors(errors);
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errorMessages,
      });
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatErrors(errors: any[]): Record<string, string[]> {
    const formattedErrors: Record<string, string[]> = {};

    errors.forEach((error) => {
      const property = error.property;
      const constraints = error.constraints;

      if (!formattedErrors[property]) {
        formattedErrors[property] = [];
      }

      if (constraints) {
        formattedErrors[property].push(...(Object.values(constraints) as string[]));
      }

      // 处理嵌套验证错误
      if (error.children && error.children.length > 0) {
        const childErrors = this.formatErrors(error.children);
        Object.keys(childErrors).forEach((childProperty) => {
          const nestedProperty = `${property}.${childProperty}`;
          formattedErrors[nestedProperty] = childErrors[childProperty];
        });
      }
    });

    return formattedErrors;
  }
}
