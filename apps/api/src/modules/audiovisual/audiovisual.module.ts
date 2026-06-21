import { Module } from '@nestjs/common';
import { AudiovisualProjectsController } from './projects/projects.controller';
import { AudiovisualProjectsService }    from './projects/projects.service';
import { AudiovisualBriefingsController } from './briefings/briefings.controller';
import { AudiovisualBriefingsService }    from './briefings/briefings.service';
import { AudiovisualDeliverablesController } from './deliverables/deliverables.controller';
import { AudiovisualDeliverablesService }    from './deliverables/deliverables.service';
import { AudiovisualApprovalsController } from './approvals/approvals.controller';
import { AudiovisualApprovalsService }    from './approvals/approvals.service';
import { AudiovisualShotsController } from './shots/shots.controller';
import { AudiovisualShotsService }    from './shots/shots.service';
import { AudiovisualProductionDaysController } from './production-days/production-days.controller';
import { AudiovisualProductionDaysService }    from './production-days/production-days.service';
import { AudiovisualTeamMembersController } from './team-members/team-members.controller';
import { AudiovisualTeamMembersService }    from './team-members/team-members.service';
import { AudiovisualTasksController } from './tasks/tasks.controller';
import { AudiovisualTasksService }    from './tasks/tasks.service';
import { AudiovisualAssetsController } from './assets/assets.controller';
import { AudiovisualAssetsService }    from './assets/assets.service';

@Module({
  controllers: [
    AudiovisualProjectsController,
    AudiovisualBriefingsController,
    AudiovisualDeliverablesController,
    AudiovisualApprovalsController,
    AudiovisualShotsController,
    AudiovisualProductionDaysController,
    AudiovisualTeamMembersController,
    AudiovisualTasksController,
    AudiovisualAssetsController,
  ],
  providers: [
    AudiovisualProjectsService,
    AudiovisualBriefingsService,
    AudiovisualDeliverablesService,
    AudiovisualApprovalsService,
    AudiovisualShotsService,
    AudiovisualProductionDaysService,
    AudiovisualTeamMembersService,
    AudiovisualTasksService,
    AudiovisualAssetsService,
  ],
  exports: [
    AudiovisualProjectsService,
    AudiovisualBriefingsService,
    AudiovisualDeliverablesService,
    AudiovisualApprovalsService,
    AudiovisualShotsService,
    AudiovisualProductionDaysService,
    AudiovisualTeamMembersService,
    AudiovisualTasksService,
    AudiovisualAssetsService,
  ],
})
export class AudiovisualModule {}
