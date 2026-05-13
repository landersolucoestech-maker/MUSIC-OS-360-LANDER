import { IsString, IsIn, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty({ enum: ['starter', 'professional', 'enterprise'] })
  @IsString()
  @IsIn(['starter', 'professional', 'enterprise'])
  plan: 'starter' | 'professional' | 'enterprise';

  @ApiProperty({ example: 'https://app.example.com/settings/billing?success=1' })
  @IsString()
  successUrl: string;

  @ApiProperty({ example: 'https://app.example.com/settings/billing?canceled=1' })
  @IsString()
  cancelUrl: string;
}

export class CreatePortalDto {
  @ApiProperty({ example: 'https://app.example.com/settings/billing' })
  @IsString()
  returnUrl: string;
}
