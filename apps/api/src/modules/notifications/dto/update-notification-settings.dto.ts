import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const NOTIFICATION_SETTING_KEYS = [
  'delivery_channels',
  'contract_created',
  'contract_expiring',
  'contract_expired',
  'contract_renewal',
  'low_balance',
  'financial_activity',
  'weekly_financial_summary',
  'weekly_activity_report',
  'automatic_reminders',
  'critical_system_alerts',
  'operational_notifications',
  'automatic_backup',
  'delivery_preferences',
] as const;

export type NotificationSettingKey = typeof NOTIFICATION_SETTING_KEYS[number];

export class NotificationSettingInputDto {
  @ApiProperty({ enum: NOTIFICATION_SETTING_KEYS })
  @IsIn(NOTIFICATION_SETTING_KEYS)
  notificationKey: NotificationSettingKey;

  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  config: Record<string, unknown>;
}

export class UpdateNotificationSettingsDto {
  @ApiProperty({ type: [NotificationSettingInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(NOTIFICATION_SETTING_KEYS.length)
  @ValidateNested({ each: true })
  @Type(() => NotificationSettingInputDto)
  settings: NotificationSettingInputDto[];
}
