import { PartialType } from '@nestjs/swagger';
import { CreateInsuranceMemberDto } from './create-insurance-member.dto';

export class UpdateInsuranceMemberDto extends PartialType(CreateInsuranceMemberDto) {}
