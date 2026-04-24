import { ApiProperty } from '@nestjs/swagger';

export class OpenUserItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  username: string;

  @ApiProperty({ required: false, nullable: true })
  email?: string | null;

  @ApiProperty({ required: false, nullable: true })
  realName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  nickname?: string | null;

  @ApiProperty({ required: false, nullable: true })
  avatar?: string | null;

  @ApiProperty({ required: false, nullable: true })
  status?: string | null;

  @ApiProperty()
  createdAt: Date;

  static fromUser(user: any): OpenUserItemDto {
    return Object.assign(new OpenUserItemDto(), {
      id: user.id,
      username: user.username,
      email: user.email,
      realName: user.realName,
      nickname: user.nickname,
      avatar: user.avatar,
      status: user.status,
      createdAt: user.createdAt,
    });
  }
}

export class OpenUserPaginationDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}

export class OpenApiAppInfoDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

export class OpenUserListResponseDto {
  @ApiProperty({ type: OpenUserItemDto, isArray: true })
  data: OpenUserItemDto[];

  @ApiProperty({ type: OpenUserPaginationDto })
  pagination: OpenUserPaginationDto;

  @ApiProperty({ type: OpenApiAppInfoDto })
  app: OpenApiAppInfoDto;

  static fromResult(result: any, app: { id: number; name: string }): OpenUserListResponseDto {
    return Object.assign(new OpenUserListResponseDto(), {
      data: result.items.map((user: any) => OpenUserItemDto.fromUser(user)),
      pagination: {
        total: result.meta.totalItems,
        page: result.meta.currentPage,
        pageSize: result.meta.itemsPerPage,
      },
      app: {
        id: app.id,
        name: app.name,
      },
    });
  }
}
