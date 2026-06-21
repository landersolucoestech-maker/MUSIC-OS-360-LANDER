import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { SocietyDriver, SocietyName } from '@music-os-360/types';

export class PrepareSubmissionDto {
  @IsOptional() @IsEnum(SocietyName)
  society?: SocietyName;

  @IsOptional() @IsEnum(SocietyDriver)
  driver?: SocietyDriver;

  @IsOptional() @IsUUID()
  account_id?: string;
}

export class SubmitToSocietyDto {
  /** Target a specific prepared submission; otherwise the latest VALID/READY one. */
  @IsOptional() @IsUUID()
  submission_id?: string;
}

export class RunSyncDto {
  @IsOptional() @IsEnum(SocietyName)
  society?: SocietyName;

  @IsOptional() @IsEnum(SocietyDriver)
  driver?: SocietyDriver;
}
