import { ApiProperty } from '@nestjs/swagger';
import { ApiKeyEntity } from '../entities/api-key.entity';

type ApiKeyResponseSource = Pick<
  ApiKeyEntity,
  | 'id'
  | 'name'
  | 'prefix'
  | 'suffix'
  | 'scopes'
  | 'expiresAt'
  | 'createdAt'
> & {
  rawKey?: string;
  isActive?: boolean;
  lastUsedAt?: Date;
  usageCount?: number;
};

export class ApiAppDeleteResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  static success(): ApiAppDeleteResponseDto {
    return {
      success: true,
      message: 'API应用已删除',
    };
  }
}

export class ApiKeyCreatedResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: '原始密钥，仅创建时返回一次' })
  key?: string;

  @ApiProperty()
  prefix: string;

  @ApiProperty()
  suffix: string;

  @ApiProperty({ type: [String], required: false })
  scopes?: string[];

  @ApiProperty({ required: false })
  expiresAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  message: string;

  static fromKey(key: ApiKeyResponseSource): ApiKeyCreatedResponseDto {
    return {
      id: key.id,
      name: key.name,
      key: key.rawKey,
      prefix: key.prefix,
      suffix: key.suffix,
      scopes: key.scopes,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      message: '请立即复制并安全保存此密钥，它将不会再次显示',
    };
  }
}

export class ApiKeyListItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  displayKey: string;

  @ApiProperty({ type: [String], required: false })
  scopes?: string[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  lastUsedAt?: Date;

  @ApiProperty()
  usageCount: number;

  @ApiProperty({ required: false })
  expiresAt?: Date;

  @ApiProperty()
  createdAt: Date;

  static fromKey(key: ApiKeyResponseSource): ApiKeyListItemDto {
    return {
      id: key.id,
      name: key.name,
      displayKey: `${key.prefix}_****...${key.suffix}`,
      scopes: key.scopes,
      isActive: key.isActive ?? false,
      lastUsedAt: key.lastUsedAt,
      usageCount: key.usageCount ?? 0,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    };
  }
}

export class ApiKeyRevokeResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  static success(): ApiKeyRevokeResponseDto {
    return {
      success: true,
      message: 'API密钥已撤销',
    };
  }
}
