import { PartialType } from '@nestjs/mapped-types';
import { CreateArtistGoalDto } from './create-artist-goal.dto';

export class UpdateArtistGoalDto extends PartialType(CreateArtistGoalDto) {}
