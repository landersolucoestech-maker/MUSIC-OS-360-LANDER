/**
 * core/skills/skills.module.ts
 *
 * Infraestrutura GLOBAL de execução de skills. Exporta o SkillRunService para
 * que qualquer skill operacional do sistema persista execução/logs e emita
 * eventos de auditoria. Não expõe nada ao usuário final.
 *
 * DatabaseModule (@Global) e DomainEventsModule (@Global) fornecem DATA_SOURCE
 * e EventsService — não precisam ser importados aqui.
 */

import { Global, Module } from '@nestjs/common';
import { SkillRunService } from './skill-run.service';

@Global()
@Module({
  providers: [SkillRunService],
  exports: [SkillRunService],
})
export class SkillsModule {}
