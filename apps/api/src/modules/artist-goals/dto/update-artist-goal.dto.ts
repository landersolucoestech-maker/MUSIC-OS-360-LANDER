import { PartialType } from '@nestjs/swagger';
import { CreateArtistGoalDto } from './create-artist-goal.dto';

export class UpdateArtistGoalDto extends PartialType(CreateArtistGoalDto) {}
