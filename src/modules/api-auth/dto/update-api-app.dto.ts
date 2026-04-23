import { PartialType } from '@nestjs/swagger';
import { CreateApiAppDto } from './create-api-app.dto';

export class UpdateApiAppDto extends PartialType(CreateApiAppDto) {}
