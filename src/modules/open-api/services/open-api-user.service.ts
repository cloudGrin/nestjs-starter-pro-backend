import { Injectable } from '@nestjs/common';
import { UserService } from '~/modules/user/services/user.service';
import { OpenUserListQueryDto } from '../dto/open-user-list-query.dto';
import { OpenUserListResponseDto } from '../dto/open-user-response.dto';

interface OpenApiAppUser {
  id: number;
  name: string;
}

@Injectable()
export class OpenApiUserService {
  constructor(private readonly userService: UserService) {}

  async getUsers(
    query: OpenUserListQueryDto,
    app: OpenApiAppUser,
  ): Promise<OpenUserListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const result = await this.userService.findUsers({
      page,
      limit: pageSize,
    });

    return OpenUserListResponseDto.fromResult(result, app);
  }
}
