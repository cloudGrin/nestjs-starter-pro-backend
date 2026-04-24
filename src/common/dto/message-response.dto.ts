import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({ description: '操作结果消息' })
  message: string;

  static of(message: string): MessageResponseDto {
    const response = new MessageResponseDto();
    response.message = message;
    return response;
  }
}
